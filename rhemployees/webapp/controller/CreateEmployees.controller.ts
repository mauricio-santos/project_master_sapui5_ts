import BaseControllers from "../helpers/BaseControllers";
import { Button$PressEvent } from "sap/m/Button";
import { Input$LiveChangeEvent } from "sap/m/Input";
import Panel from "sap/m/Panel";
import Wizard from "sap/m/Wizard";
import WizardStep from "sap/m/WizardStep";
import JSONModel from "sap/ui/model/json/JSONModel";
import Validate from "../helpers/Validate";
import UploadSet, { UploadSet$AfterItemRemovedEvent, UploadSet$BeforeUploadStartsEvent, UploadSet$UploadCompletedEvent } from "sap/m/upload/UploadSet";
import UploadSetItem from "sap/m/upload/UploadSetItem";
import Item from "sap/ui/core/Item";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import Utils from "../helpers/Utils";
import Context from "sap/ui/model/odata/v2/Context";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";

/**
 * @namespace de.santos.rhemployees.controller
 */

export default class CreateEmployees extends BaseControllers {

    private fragmentPanel: Panel;
    
    private initialData = {
        EmployeeType: "",
        FirstName: "",
        FirstNameValueState: "None",
        LastName: "",
        LastNameValueState: "None",
        DNI: "",
        DNIValueState: "None",
        DNIVerify: "",
        CIF: "",
        CIFValueState: "None",
        CIFVerify: "",
        SalaryInternal: 12000,
        DailyPrice: 100,
        SalaryManager: 50000,
        IncorporationDate: null,
        IncorporationDateValueState: "None",
        EmployeeId: "0021"
    };

    private loadEmployee(): void {
        const model = new JSONModel( {...this.initialData}) as JSONModel;
        this.setModelHelper(model, "employeeModel");
    };

    public onInit(): void {
        this.loadEmployee();
    };

    public async onTypeEmployeeButtonPress(event: Button$PressEvent): Promise<void> {
        const item = event.getSource();
        const employeeType = item.getProperty("text");
        const wizard = this.byId("idWizard") as Wizard;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const panel = this.byId("idEmployeePanel") as Panel;

        employeeModel.setData({ ...this.initialData }); //Reset Form
        employeeModel.setProperty("/EmployeeType", employeeType);
        
        this.fragmentPanel ??= await <Promise<Panel>> this.loadFragment({
            name: "de.santos.rhemployees.fragments.EmployeeForm"
        });
        panel.addContent(this.fragmentPanel);      
        
        const step2Validated = this.byId("idEmployeeDataWizardStep")?.getProperty("validated");
        if (!step2Validated) {
            const step2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
            wizard.nextStep();
            wizard.discardProgress(step2, true);
            step2.setValidated(false)
            return
        }
        wizard.nextStep();
    };

    public onValidation(event: Input$LiveChangeEvent): void {
        const input = event.getSource();
        const value = input.getValue();
        const i18n = this.getResourceBundleHelper();
        if (!value) {
            input.setValueState("Error");
            input.setValueStateText(i18n.getText("msgEmptyInput") || "no text defined");
        } else {
            input.setValueState("None");
        }

        const context = input.getBinding("value");
        const path = context?.getPath();
        if (path == "/DNI" && value !== '') {
            Validate.dniCheck.bind(this)(value) 
                ? input.setValueState("Success") 
                : input.setValueState("Warning"); input.setValueStateText(i18n.getText("msgDniError") || "no text defined");
        }

        if (path == "/CIF" && value !== '') {
            const model = this.getModelHelper("employeeModel") as JSONModel;         
            Validate.cifCheck.bind(this)(value)
            ? (input.setValueState("Success"), model.setProperty("/CIFVerify", true))
            : (input.setValueState("Warning"), input.setValueStateText(i18n.getText("msgCifError") || "no text defined"), model.setProperty("/CIFVerify", ""))
        }
    };

    // ############## UPLOAD ##############
    public onUploadSetBeforeUploadStarts(event: UploadSet$BeforeUploadStartsEvent) :void {
        const item = event.getParameter("item") as UploadSetItem;
        const docName = item.getFileName();
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const employeeId = employeeModel.getProperty("/EmployeeId");
        const sapId = new Utils(this).getEmail();
        
        const slug = `${sapId};${employeeId};${docName}`;
        const encodedSlug = encodeURIComponent(slug);
        const customerHeaderSlug = new Item({
            key: "slug",
            text: encodedSlug
        });
        
        const zEmployeesModel = this.getModelHelper("zEmployeesModel") as ODataModel;
        const csrfToken = zEmployeesModel.getSecurityToken();
        const cunstomerHeaderToken = new Item({
            key: "X-CSRF-Token",
            text: csrfToken
        });

        item.addHeaderField(customerHeaderSlug);
        item.addHeaderField(cunstomerHeaderToken);

        const uploadSet = (this.byId("idUploadSet") as UploadSet);
        const filesCount = uploadSet.getItems().length + 1;
        employeeModel.setProperty("/Attachments", filesCount);  
    };

    public onUploadSetUploadCompleted(event: UploadSet$UploadCompletedEvent): void {
        const uploadSetItem = event.getSource();
        uploadSetItem.getBinding("items")?.refresh();
    };

    public async searchFiles() : Promise<void> {         
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const employeeId = employeeModel.getProperty("/EmployeeId");
        const sapId = new Utils(this).getEmail();
        const uploadSet = this.byId("idUploadSet") as UploadSet;
        const utils = new Utils(this);

        const data = {
            url: "/Attachments",
            filters: [
                new Filter("EmployeeId", FilterOperator.EQ, employeeId),
                new Filter("SapId", FilterOperator.EQ, sapId)
            ],
        };

        const result = await utils.read(new JSONModel(data)) as any;    
        const filesCount = result ? result.results.length : 0;
        employeeModel.setProperty("/Attachments", filesCount);
        
        const bindingInfo = {
            path: 'zEmployeesModel>/Attachments',
            filters: [
                new Filter("EmployeeId", FilterOperator.EQ, employeeId),
                new Filter("SapId", FilterOperator.EQ, sapId)
            ],
            template: new UploadSetItem({
                fileName: "{zEmployeesModel>DocName}",
                mediaType: "{zEmployeesModel>MimeType}",
                visibleEdit: false,
                url: { //Download URL
                    path: "zEmployeesModel>__metadata/media_src", // Full URL for media_src
                    formatter: function (mediaSrc: string) {
                        return mediaSrc ? mediaSrc.replace(/^https?:\/\/[^/]+/, "") : "";
                    }
                }
            })
        };
        uploadSet.bindAggregation("items",bindingInfo);
        uploadSet.getBinding("items")?.refresh(true)
    };

    public async onUploadSetAfterItemRemoved(event: UploadSet$AfterItemRemovedEvent): Promise<void> {
        const item = event.getParameter("item") as UploadSetItem;
        const bindContext = item.getBindingContext("zEmployeesModel") as Context;
        const path = bindContext.getPath();
        const utils = new Utils(this);
        const uploadSet = this.byId("idUploadSet") as UploadSet;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const employeeId = employeeModel.getProperty("/EmployeeId");
        const sapId = new Utils(this).getEmail();
        const data = {
            url: path,
            filters: [
                new Filter("EmployeeId", FilterOperator.EQ, employeeId),
                new Filter("SapId", FilterOperator.EQ, sapId)
            ],
        };

        const result = await utils.crud("delete", new JSONModel(data)) as any;
        const filesCount = result ? result.results.length : 0;
        employeeModel.setProperty("/Attachments", filesCount);
        uploadSet.getBinding("items")?.refresh();
    };
};
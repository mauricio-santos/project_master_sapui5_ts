import BaseControllers from "../helpers/BaseControllers";
import { Button$PressEvent } from "sap/m/Button";
import Input, { Input$LiveChangeEvent } from "sap/m/Input";
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
import { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import MessageBox from "sap/m/MessageBox";
import NavContainer from "sap/m/NavContainer";
import Page from "sap/m/Page";
import { Link$PressEvent } from "sap/m/Link";
import ODataListBinding from "sap/ui/model/odata/ODataListBinding";

/**
 * @namespace de.santos.rhemployees.controller
 */

export default class CreateEmployees extends BaseControllers {
    private initialData = {
        EmployeeId: "0021",
        FirstName: "",
        LastName: "",
        DocumentNumber: "",
        Salary: 0,
        IncorporationDate: null,
        isValidated: false
    }

    private objectMatched(event: Route$MatchedEvent): void {
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const employeeType = employeeModel.getProperty("/EmployeeType");

        !employeeType && this.getRouterHelper().navTo("RouteCreateEmployees");
    };

    public onInit(): void {
        const model = new JSONModel(this.initialData) as JSONModel;
        this.setModelHelper(model, "employeeModel");

        const router = this.getRouterHelper();
        router.getRoute("RouteEditEmployee")?.attachPatternMatched(this.objectMatched.bind(this));
        router.getRoute("RouteReviewEmployee")?.attachPatternMatched(this.objectMatched.bind(this));
    };

    // ############## SELECTED EMPLOYEE ##############
    public onTypeEmployeeButtonPress(event: Button$PressEvent): void {
        const item = event.getSource();
        const employeeType = item.getProperty("text");
        const wizard = this.byId("idWizard") as Wizard;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;

        switch (employeeType) {
            case "Internal":  
                employeeModel.setProperty("/Salary", 1200);
                employeeModel.setProperty("/TypeCode", "0"); 
                break;
            case "Autonomous": 
                employeeModel.setProperty("/Salary", 100);
                employeeModel.setProperty("/TypeCode", "1"); 
                break;
            case "Manager":  
                employeeModel.setProperty("/Salary", 50000);
                employeeModel.setProperty("/TypeCode", "2"); 
                break;
        }

        employeeModel.setProperty("/EmployeeType", employeeType);
        const routerHash = (this.getRouterHelper().getHashChanger() as any).hash   

        if (routerHash === 'create'){
            const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
            const step2Validated = wizardStep2.getValidated();
        
            if (!step2Validated) {
                const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
                wizard.nextStep();
                wizard.discardProgress(wizardStep2, true);
                wizardStep2.setValidated(false)
                return
            }
            wizard.nextStep();
        }else {
            this.onValidationEdit();
        }

    };

    // ############## FORM VALIDATIONS CREATE ##############
    public onValidation(event: Input$LiveChangeEvent): void {
        const i18n = this.getResourceBundleHelper();
        const input = event.getSource();
        const value = input.getValue();
        const employeeModel = this.getView()?.getModel("employeeModel") as JSONModel;

        if (!value) {
            input.setValueState("Error");
            input.setValueStateText(i18n.getText("msgEmptyInput") || "no text defined");

            employeeModel.setProperty("/isValidated", false);
            employeeModel.setProperty("/docummentIsValid", false)
        } else {
            const context = input.getBinding("value");
            const path = context?.getPath();
            const employeeType = employeeModel.getProperty("/EmployeeType");
            const firstName = employeeModel.getProperty("/FirstName");
            const lastName = employeeModel.getProperty("/LastName");
            const incorporationDate = employeeModel.getProperty("/IncorporationDate");

            input.setValueState("None");

            // DNI Validation
            if (path == '/DocumentNumber' && employeeType !== 'Autonomous') {
                const dniExist = Validate.dniCheck.bind(this)(value);
                if (dniExist) {
                    input.setValueState("Success"); 
                    employeeModel.setProperty("/docummentIsValid", true)
                }else {
                    input.setValueState("Warning"); input.setValueStateText(i18n.getText("msgDniError") || "no text defined"); 
                    employeeModel.setProperty("/docummentIsValid", false)
                }
            }

            // CIF Validation
            if (path == '/DocumentNumber' && employeeType === 'Autonomous') {
                const cfiExist = Validate.cifCheck.bind(this)(value);
                if (cfiExist) {
                    input.setValueState("Success");
                    employeeModel.setProperty("/docummentIsValid", true)
                }else {
                    input.setValueState("Warning"); input.setValueStateText(i18n.getText("msgDniError") || "no text defined");
                    employeeModel.setProperty("/docummentIsValid", false)
                }
            }

            const docummentIsValid = employeeModel.getProperty("/docummentIsValid");
            (docummentIsValid && firstName && lastName && incorporationDate)
                ? employeeModel.setProperty("/isValidated", true)
                : employeeModel.setProperty("/isValidated", false)
        }
    };

    // ############## FORM VALIDATIONS EDIT ##############
    public onValidationEdit(): void {
        const employeeModel = this.getView()?.getModel("employeeModel") as JSONModel;
        const employeeType = employeeModel.getProperty("/EmployeeType");
        const documentNumber = employeeModel.getProperty("/DocumentNumber");
        const i18n = this.getResourceBundleHelper();
        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;

        const inputDni = this.byId('idDniInput') as Input
        const inputCif = this.byId('idCifInput') as Input
        const dniExist = Validate.dniCheck.bind(this)(documentNumber);
        const cifExist = Validate.cifCheck.bind(this)(documentNumber);

        if (employeeType !== 'Autonomous' && dniExist) {           
            inputDni.setValueState("Success");
            employeeModel.setProperty("/docummentIsValid", true);
        }else if (employeeType === 'Autonomous' && cifExist) {
            inputCif.setValueState("Success");
            employeeModel.setProperty("/docummentIsValid", true);
        }else {
            inputDni.setValueState("Warning"); 
            inputDni.setValueStateText(i18n.getText("msgDniError") || "no text defined"); 
            inputCif.setValueState("Warning"); 
            inputCif.setValueStateText(i18n.getText("msgDniError") || "no text defined"); 
            employeeModel.setProperty("/docummentIsValid", false);
            wizard.goToStep(wizardStep2, false);
        }
    }

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
        employeeModel.setProperty("/totalFiles", filesCount);  
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

        const uploadedFiles = result.results as Array<Object>;  
        const filesCount = result ? uploadedFiles.length : 0;
        employeeModel.setProperty("/totalFiles", filesCount);
        
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

        const uploadedFiles = result.results as Array<Object>;  
        const filesCount = result ? uploadedFiles.length : 0;
        employeeModel.setProperty("/totalFiles", filesCount);

        uploadSet.getBinding("items")?.refresh();
    };

    // ############## WIZARD ##############
    public onWizardComplete(): void {
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const uploadSet = (this.byId("idUploadSet") as UploadSet); 
        const uploadedFiles = uploadSet.getItems();
        const filesData = [] as Array<Object>;
        const formValidated = employeeModel.getProperty("/isValidated");
        
        if (!formValidated) {
            const wizard = this.byId("idWizard") as Wizard;
            const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
            wizard.goToStep(wizardStep2, false)
        }else {
            uploadedFiles && uploadedFiles.forEach((file: any) => {
                filesData.push({DocName: file.getProperty("fileName")});
            });
            employeeModel.setProperty("/uploadedList", filesData);

            const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
            const reviewPage = this.byId("idReviewPage") as Page
            navContainer.to(reviewPage);
            this.getRouterHelper().navTo("RouteReviewEmployee");
        }

    };

    public onCancelButtonPress(): void {
        const i18n = this.getResourceBundleHelper()
        const $this = this
        MessageBox.confirm(i18n.getText("msgFormCancel") || "no text defined", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: () => {
                const wizard = $this.byId("idWizard") as Wizard;
                const wizardStep1 = $this.byId("idTypeEmployeeWizardStep") as WizardStep;
                wizard.setCurrentStep(wizardStep1);
                wizardStep1.setValidated(false);
                // $this.loadInitialData();
                $this.getRouterHelper().navTo("RouteHome");
            }
        });
    };

    // ############## REVIEW ##############
    public onEditLinkStep1Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        navContainer.to(wizardPage);

        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep1 = this.byId("idTypeEmployeeWizardStep") as WizardStep;
        wizard.goToStep(wizardStep1, false)
               

       this.getRouterHelper().navTo("RouteEditEmployee", {step: 1});
    };

    public onEditLinkStep2Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        navContainer.to(wizardPage);

        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
        wizard.goToStep(wizardStep2, false)

        this.getRouterHelper().navTo("RouteEditEmployee", {step: 2});
    };

    public onEditLinkStep3Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        navContainer.to(wizardPage);

        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep3 = this.byId("idAdditionalInfoWizardStep") as WizardStep;
        wizard.goToStep(wizardStep3, false)

        this.getRouterHelper().navTo("RouteEditEmployee", {step: 3});
    };

    public async onSaveEmployeeButtonPress(): Promise<void | ODataListBinding> {
        const employeeModel = this.getModelHelper("employeeModel");
        const utils = new Utils(this);

        const object = {
            data: {
                EmployeeId: employeeModel.getProperty("/EmployeeId"),
                SapId: utils.getEmail(),
                Type: employeeModel.getProperty("/TypeCode"),
                FirstName: employeeModel.getProperty("/FirstName"),
                LastName: employeeModel.getProperty("/LastName"),
                Dni: employeeModel.getProperty("/DocumentNumber"),
                CreationDate: employeeModel.getProperty("/IncorporationDate"),
                Comments: employeeModel.getProperty("/Comments"),
            },
            url: "/Users"
        }

        const model = new JSONModel(object);
        await utils.crud("create", model);
    }
};
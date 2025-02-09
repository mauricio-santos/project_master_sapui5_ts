import BaseControllers from "../helpers/BaseControllers";
import { Button$PressEvent } from "sap/m/Button";
import Input, { Input$LiveChangeEvent } from "sap/m/Input";
import Wizard from "sap/m/Wizard";
import WizardStep from "sap/m/WizardStep";
import JSONModel from "sap/ui/model/json/JSONModel";
import Validate from "../helpers/Validate";
import UploadSet, { UploadSet$AfterItemRemovedEvent, UploadSet$BeforeItemAddedEvent, UploadSet$BeforeUploadStartsEvent} from "sap/m/upload/UploadSet";
import UploadSetItem from "sap/m/upload/UploadSetItem";
import Item from "sap/ui/core/Item";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import Utils from "../helpers/Utils";
import Route, { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import MessageBox from "sap/m/MessageBox";
import NavContainer from "sap/m/NavContainer";
import Page from "sap/m/Page";
import { Link$PressEvent } from "sap/m/Link";
import ODataListBinding from "sap/ui/model/odata/ODataListBinding";
import Router from "sap/m/routing/Router";

/**
 * @namespace de.santos.rhemployees.controller
 */

export default class CreateEmployees extends BaseControllers {
    private employeeId: string;

    private initialData = Object.freeze({
        FirstName: "",
        LastName: "",
        DocumentNumber: "",
        Salary: 0,
        IncorporationDate: null,
        isValidated: false,
        totalFiles: 0
    });

    private objectMatched(event: Route$MatchedEvent): void {
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const employeeType = employeeModel.getProperty("/EmployeeType");

        !employeeType && this.getRouterHelper().navTo("RouteCreateEmployees");
    };

    private resetWizard(): void {
        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep1 = this.byId("idTypeEmployeeWizardStep") as WizardStep;
        const inputDni = this.byId('idDniInput') as Input
        const inputCif = this.byId('idCifInput') as Input
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;

        navContainer.back();
        wizard.setCurrentStep(wizardStep1);
        wizardStep1.setValidated(false);
        inputDni.setValueState("None");
        inputCif.setValueState("None");
    };

    private uploadStart(): void {
        const uploadSet = (this.byId("idUploadSet") as UploadSet);
        uploadSet.upload();
    };

    public onInit(): void {
        const model = new JSONModel({...this.initialData}) as JSONModel;
        this.setModelHelper(model, "employeeModel");

        const router = this.getRouterHelper();
        router.getRoute("RouteEditEmployee")?.attachPatternMatched(this.objectMatched.bind(this));
        router.getRoute("RouteReviewEmployee")?.attachPatternMatched(this.objectMatched.bind(this));
    };

    // ############## EMPLOYEE TYPE SELECTED ##############
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

        const routerHash = (this.getRouterHelper() as Router).getHashChanger().getHash();
        
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
                const cifExist = Validate.cifCheck.bind(this)(value);
                if (cifExist) {
                    input.setValueState("Success");
                    employeeModel.setProperty("/docummentIsValid", true)
                }else {
                    input.setValueState("Warning"); input.setValueStateText(i18n.getText("msgCifError") || "no text defined");
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
        const routerHash = (this.getRouterHelper().getHashChanger() as any).hash   

        if (routerHash === 'edit/2'){
            const employeeModel = this.getView()?.getModel("employeeModel") as JSONModel;
            const employeeType = employeeModel.getProperty("/EmployeeType");
            const documentNumber = employeeModel.getProperty("/DocumentNumber");
            const i18n = this.getResourceBundleHelper();
            const wizard = this.byId("idWizard") as Wizard;
            const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
            const wizardStep3 = this.byId("idAdditionalInfoWizardStep") as WizardStep;

            const inputDni = this.byId('idDniInput') as Input
            const inputCif = this.byId('idCifInput') as Input
            const dniExist = Validate.dniCheck.bind(this)(documentNumber);
            const cifExist = Validate.cifCheck.bind(this)(documentNumber);

            if (employeeType !== 'Autonomous' && dniExist) {           
                inputDni.setValueState("Success");
                employeeModel.setProperty("/docummentIsValid", true);
                wizardStep3.setValidated(true)
            }else if (employeeType === 'Autonomous' && cifExist) {
                inputCif.setValueState("Success");
                employeeModel.setProperty("/docummentIsValid", true);
                wizardStep3.setValidated(true)
            }else {
                inputDni.setValueState("Warning"); 
                inputDni.setValueStateText(i18n.getText("msgDniError") || "no text defined"); 
                inputCif.setValueState("Warning"); 
                inputCif.setValueStateText(i18n.getText("msgCifError") || "no text defined"); 
                employeeModel.setProperty("/docummentIsValid", false);
                wizard.goToStep(wizardStep2, false);
                wizardStep3.setValidated(false)
            }
        }
    };

    // ############## UPLOAD ##############
    public onUploadSetBeforeItemAdded(event: UploadSet$BeforeItemAddedEvent): void {
        const item = event.getParameter("item") as UploadSetItem;
        const uploadSet = (this.byId("idUploadSet") as UploadSet);
        const filesCount = uploadSet.getIncompleteItems().length + 1;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        
        item.setVisibleEdit(false);
        employeeModel.setProperty("/totalFiles", filesCount);  
    };

    public onUploadSetBeforeUploadStarts(event: UploadSet$BeforeUploadStartsEvent) :void {
        const item = event.getParameter("item") as UploadSetItem;
        const docName = item.getFileName();
        const employeeId = this.employeeId;
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
    };

    public async onUploadSetAfterItemRemoved(): Promise<void> {
        const uploadSet = this.byId("idUploadSet") as UploadSet;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const filesCount = uploadSet.getIncompleteItems().length;

        employeeModel.setProperty("/totalFiles", filesCount);
        uploadSet.getBinding("items")?.refresh();
    };

    // ############## WIZARD ##############
    public onWizardComplete(): void {
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const uploadSet = (this.byId("idUploadSet") as UploadSet); 
        const uploadedFiles = uploadSet.getIncompleteItems();
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
            const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
            const reviewPage = this.byId("idReviewPage") as Page
            
            employeeModel.setProperty("/pendingUploads", filesData);
            navContainer.to(reviewPage);
            this.getRouterHelper().navTo("RouteReviewEmployee");
        }
    };

    // ############## REVIEW ##############
    public onEditLinkStep1Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep1 = this.byId("idTypeEmployeeWizardStep") as WizardStep;
        
        navContainer.to(wizardPage);
        wizard.goToStep(wizardStep1, false)
       this.getRouterHelper().navTo("RouteEditEmployee", {step: 1});
    };

    public onEditLinkStep2Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep2 = this.byId("idEmployeeDataWizardStep") as WizardStep;
        
        navContainer.to(wizardPage);
        wizard.goToStep(wizardStep2, false)
        this.getRouterHelper().navTo("RouteEditEmployee", {step: 2});
    };

    public onEditLinkStep3Press(event: Link$PressEvent): void {
        const navContainer = this.byId("idEmployeeNavContainer") as NavContainer;
        const wizardPage = this.byId("idWizardPage") as Page
        const wizard = this.byId("idWizard") as Wizard;
        const wizardStep3 = this.byId("idAdditionalInfoWizardStep") as WizardStep;
        
        navContainer.to(wizardPage);
        wizard.goToStep(wizardStep3, false)
        this.getRouterHelper().navTo("RouteEditEmployee", {step: 3});
    };

    // ############## CANCEL ##############
    public onCancelButtonPress(): void {
        const i18n = this.getResourceBundleHelper();
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;

        MessageBox.confirm(i18n.getText("msgFormCancel") || "no text defined", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: (action: any) => {
                if (action === MessageBox.Action.OK) {
                    this.getRouterHelper().navTo("RouteHome");
                    setTimeout(() => {
                        employeeModel.setData({...this.initialData});
                        employeeModel.refresh();
                        this.resetWizard();
                    }, 1000);
                }
            }
        });
    };

    // ############## SAVE ##############
    public async onSaveEmployeeButtonPress(): Promise<void | ODataListBinding> {
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const utils = new Utils(this);
        const i18n = this.getResourceBundleHelper();
        const reviewPage = this.byId("idReviewPage") as Page;

        reviewPage.setBusy(true)

        const body = {
            data: {
                    SapId: utils.getEmail(),
                    Type: employeeModel.getProperty("/TypeCode"),
                    FirstName: employeeModel.getProperty("/FirstName"),
                    LastName: employeeModel.getProperty("/LastName"),
                    Dni: employeeModel.getProperty("/DocumentNumber"),
                    CreationDate: employeeModel.getProperty("/IncorporationDate"),
                    Comments: employeeModel.getProperty("/Comments"),
                    UserToSalary: [
                        {
                            Amount : parseFloat(employeeModel.getProperty("/Salary")).toString(),
                            Comments : employeeModel.getProperty("/Comments"),
                            Waers : "EUR"
                        }
                    ]
                },
            url: "/Users"
        }

        const result = await utils.crud("create", new JSONModel(body)) as any;

        if (result) {
            this.employeeId = 9 + result.EmployeeId.substring(1); //EmployeeId formatt on /Users = 99xx (Error Service???)
            this.uploadStart();

            MessageBox.success(i18n.getText("employeeCreated", [this.employeeId]) || "no text defined", {
                actions: MessageBox.Action.OK,
                emphasizedAction: MessageBox.Action.OK,
                onClose: () => {
                    const uploadSet = this.byId("idUploadSet") as UploadSet;

                    this.getRouterHelper().navTo("RouteHome");
                    employeeModel.setData({...this.initialData});
                    employeeModel.refresh();
                    this.resetWizard();
                    uploadSet.removeAllItems();
                }           
            });
        }
        reviewPage.setBusy(false)
    };
};
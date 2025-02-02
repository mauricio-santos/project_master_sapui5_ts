import BaseControllers from "../helpers/BaseControllers";
import { Button$PressEvent } from "sap/m/Button";
import Input, { Input$LiveChangeEvent } from "sap/m/Input";
import Panel from "sap/m/Panel";
import Wizard from "sap/m/Wizard";
import WizardStep from "sap/m/WizardStep";
import JSONModel from "sap/ui/model/json/JSONModel";
import Validate from "../helpers/Validate";

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
        IncorporationDateValueState: "None"
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
        const itemText = item.getProperty("text");
        const wizard = this.byId("idWizard") as Wizard;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const panel = this.byId("idEmployeePanel") as Panel;

        employeeModel.setData({ ...this.initialData }); //Reset Form
        employeeModel.setProperty("/EmployeeType", itemText);
        
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
        let value = input.getValue();
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
};
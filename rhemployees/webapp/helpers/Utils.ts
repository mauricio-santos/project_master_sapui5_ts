import Controller from "sap/ui/core/mvc/Controller";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import ODataListBinding from "sap/ui/model/odata/v2/ODataListBinding";

/**
 * @namespace de.santos.employees.utils.controller
 */
export default class Utils {

    private controller: Controller;
    private model: ODataModel;
    private resourceBundle: ResourceBundle;

    constructor(controller: Controller) {
        this.controller = controller;
        this.model = (controller.getOwnerComponent() as UIComponent).getModel("zEmployeesModel") as ODataModel;
        this.resourceBundle = ((controller.getOwnerComponent() as UIComponent).getModel("i18n") as ResourceModel).getResourceBundle() as ResourceBundle;
    };

    public getEmail(): string {
        return "mauricio.santos@email.de"
    };

    public async crud(action: string, model: JSONModel, signature = false): Promise<void | ODataListBinding | null> {
        const _this = this;
        
        return new Promise(async (resolve, reject) => {
            switch (action) {
                case 'create': resolve(await _this.create(model)); break;
                case 'delete': resolve(await _this.delete(model)); break;
                default: reject(new Error("Invalid action"));
            }
        });
    };

    private async create(model: JSONModel): Promise<void | ODataListBinding | null> {
        const url = model.getProperty("/url");
        const data = model.getProperty("/data");
        const i18n = this.resourceBundle;

        return new Promise((resolve, reject) => {
            this.model.create(url, data, {
                success: async function(result: any) {
                    // MessageBox.success(i18n.getText("success") || "no text defined");
                    // resolve(await _this.read(model));    
                    // console.log("------- CREATED --------");
                    resolve(result);               
                },
                error: function(e: any) {
                    MessageBox.error(i18n.getText("error") || "no text defined");
                    // console.log("------- NOT CREATED --------");
                    resolve(e);
                    
                }
            });
        });
    };

    public async read(data: JSONModel, signature?: boolean): Promise<void | ODataListBinding | null> {
        const model = this.model;
        const url = !signature ? data.getProperty("/url").split("(")[0] : data.getProperty("/url");
        const filters = data.getProperty("/filters");
       
        return new Promise((resolve, reject) => {
            model.read(url, {
                filters: filters,
                success: function (data: ODataListBinding) {         
                    resolve(data);
                },
                error: function(error: any) {
                    // Se for erro "No Data Found", resolvemos com um array vazio
                    if (error?.responseText?.includes("No data found in backend")) {
                        console.warn("No data found in backend");
                        resolve(null);
                    } else {
                        // Outros erros (problemas no servidor, falha de conexão, etc.)
                        reject(error);
                    }
                }
            });
        });
    };

    private async delete(model: JSONModel): Promise<void | ODataListBinding | null> {
        const url = model.getProperty("/url");
        const i18n = this.resourceBundle;

        return new Promise((resolve, reject) => {
            this.model.remove(url, {
                success: async function() {
                    MessageBox.success(i18n.getText("successDelete") || "no text defined");       
                    resolve();
                },
                error: function() {
                    MessageBox.error(i18n.getText("errorDelete") || "no text defined");
                    reject();
                }
            });
        });
    };
};
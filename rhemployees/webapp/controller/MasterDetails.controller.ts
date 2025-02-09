import { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import BaseControllers from "../helpers/BaseControllers";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ListBinding from "sap/ui/model/ListBinding";
import List from "sap/m/List";
import { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import Context from "sap/ui/model/odata/v2/Context";
import SplitApp from "sap/m/SplitApp";
import Page from "sap/m/Page";
import MessageBox from "sap/m/MessageBox";
import UploadSet, { UploadSet$BeforeItemAddedEvent, UploadSet$BeforeUploadStartsEvent, UploadSet$UploadCompletedEvent, UploadSet$AfterItemRemovedEvent } from "sap/m/upload/UploadSet";
import UploadSetItem from "sap/m/upload/UploadSetItem";
import Item from "sap/ui/core/Item";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/ODataModel";
import Utils from "../helpers/Utils";
import Button, { Button$PressEvent } from "sap/m/Button";
import Dialog from "sap/m/Dialog";

/**
 * @namespace de.santos.rhemployee.controller
 */

export default class MasterDetails extends BaseControllers {
    private dialog: Dialog;

    public onInit(): void {
        const model = new JSONModel({totalFiles: 0});
        this.setModelHelper(model, 'employeeModel');
    };

    public onExit(): void {
        this.dialog.destroy();
    };

    public onNavBackButtonPress(): void {
        const splitApp = this.byId("idSplitApp") as SplitApp;
        const detailsPage = this.byId("idSelectEmployeePage") as Page
        
        this.getRouterHelper().navTo("RouteHome");
        splitApp.toDetail(detailsPage.getId(), "fade");
    };

    public onSearchFieldLiveChange(event: SearchField$LiveChangeEvent): void {
        const inputValue = event.getSource().getValue();
        const employeesList = this.byId("idUsersList") as List;
        const binding = employeesList?.getBinding("items") as ListBinding;

        if (!inputValue) {
            binding.filter([]) 
            return;
        }

        const filters = [ 
            new Filter({
                filters: [
                    new Filter("FirstName", FilterOperator.Contains, inputValue),
                    new Filter("LastName", FilterOperator.Contains, inputValue),
                    new Filter("Dni", FilterOperator.Contains, inputValue),
                    new Filter("SapId", FilterOperator.Contains, inputValue)
                ],
                and: false
            })
        ];
        binding.filter(filters);        
    };

    public onObjectListItemPress(event: ListItemBase$PressEvent): void {
        const item = event.getSource();
        const context = item.getBindingContext("zEmployeesModel") as Context;
        const employeeId = context.getProperty("EmployeeId");
        const sapId = context.getProperty("SapId");
        const query = `/Users(EmployeeId='${employeeId}',SapId='${sapId}')`;
        const pageDetails = this.byId("idDetailsPage") as Page;
        const splitApp = this.byId("idSplitApp") as SplitApp
   
        pageDetails.bindElement("zEmployeesModel>" + query);
        splitApp.to(pageDetails.getId(), "baseSlide");
        this.searchFiles(employeeId, sapId);
    };

    // ############## UPLOAD ##############
    public async searchFiles(employeeId: string, sapId: string) : Promise<void> {         
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const uploadSet = this.byId("idDetailsUploadSet") as UploadSet;
        
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

        const binding = uploadSet.getBinding("items");
        binding?.attachDataReceived(() => {
            const itemCount = uploadSet.getItems().length;
            employeeModel.setProperty("/totalFiles", itemCount);
            uploadSet.setBusy(false);
        });
    };

    public onUploadSetBeforeItemAdded(event: UploadSet$BeforeItemAddedEvent): void {
        // const item = event.getParameter("item") as UploadSetItem;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;
        const uploadSet = (this.byId("idDetailsUploadSet") as UploadSet);
        const filesCount = uploadSet.getItems().length + 1;
        employeeModel.setProperty("/totalFiles", filesCount);  
    };

    public onUploadSetBeforeUploadStarts(event: UploadSet$BeforeUploadStartsEvent) :void {
        const item = event.getParameter("item") as UploadSetItem;
        const docName = item.getFileName();
        const bindContext = item.getBindingContext("zEmployeesModel") as Context;
        const employeeId = bindContext.getProperty("EmployeeId");
        const sapId = bindContext.getProperty("SapId");

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

    public onUploadSetUploadCompleted(event: UploadSet$UploadCompletedEvent) {
        const uploadSetItem = event.getSource();
        uploadSetItem.getBinding("items")?.refresh();
    };

    public async onUploadSetAfterItemRemoved(event: UploadSet$AfterItemRemovedEvent): Promise<void> {
        const item = event.getParameter("item") as UploadSetItem;
        const bindContext = item.getBindingContext("zEmployeesModel") as Context;
        const employeeId = bindContext.getProperty("EmployeeId");
        const sapId = bindContext.getProperty("SapId");
        const path = bindContext.getPath();
        
        const data = {
            url: path,
            filters: [
                new Filter("EmployeeId", FilterOperator.EQ, employeeId),
                new Filter("SapId", FilterOperator.EQ, sapId)
            ],
        };

        const utils = new Utils(this);
        const result = await utils.crud("delete", new JSONModel(data)) as any;
        const uploadedFiles = result?.results as Array<Object>;  
        const filesCount = uploadedFiles.length;
        const employeeModel = this.getModelHelper("employeeModel") as JSONModel;

        employeeModel.setProperty("/totalFiles", filesCount);
    };

    // ############## REMOVE USER ##############
    public onRemoveUserButtonPress(event: Button$PressEvent): void {
        const item = event.getSource() as Button;
        const detailsPage = item.getParent()?.getParent() as Page;
        const bindingContext = detailsPage.getBindingContext("zEmployeesModel") as Context;
        const sapId = bindingContext.getProperty("SapId");
        const EmployeeId = bindingContext.getProperty("EmployeeId");
        const utils = new Utils(this);
        const url = `/Users(EmployeeId='${EmployeeId}',SapId='${sapId}')`
        const i18n = this.getResourceBundleHelper();
        const zEmployeesModel = this.getModelHelper("zEmployeesModel") as ODataModel

         MessageBox.confirm(i18n.getText("msgFormCancel") || "no text defined", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: async (action: any) => {
                if (action === MessageBox.Action.OK) {
                    const splitApp = this.byId("idSplitApp") as SplitApp;
                    const detailsPage = this.byId("idSelectEmployeePage") as Page

                    await utils.crud("delete", new JSONModel({url}));
                    zEmployeesModel.refresh(true);
                    splitApp.toDetail(detailsPage.getId(), "fade");
                }
            }, 
        });
    };

    // ############## RISE FRAGMENT ##############
    public async onNewRiseButtonPress(): Promise<void> {
        const i18n = this.getResourceBundleHelper();
        const splitApp = this.byId("idSplitApp") as SplitApp;
        const detailsPage = this.byId("idSelectEmployeePage") as Page

        // MessageBox.confirm(i18n.getText("msgFormCancel") || "no text defined", {
        //     actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
        //     emphasizedAction: MessageBox.Action.OK,
        //     onClose: () => {
        //         this.getRouterHelper().navTo("RouteHome");
        //         splitApp.toDetail(detailsPage.getId(), "fade");
        //     }
        // });

        this.dialog ??= (<Dialog>await this.loadFragment({
            name: "de.santos.rhemployees.fragments.Rise"
        }));
        this.dialog.open();
    };

    public async onAddButtonPress(): Promise<void> {
        const detailsPage = this.byId("idDetailsPage") as Page;
        const bindingContext = detailsPage.getBindingContext("zEmployeesModel") as Context;
        const employeeModel = this.getModelHelper("employeeModel");
        const utils = new Utils(this);
        const i18n = this.getResourceBundleHelper();

        const body = {
            data: {
                SapId: bindingContext.getProperty("SapId"),
                EmployeeId: bindingContext.getProperty("EmployeeId"),
                CreationDate: employeeModel.getProperty("/CreationDate"),
                Amount: employeeModel.getProperty("/Amount"),
                Comments: employeeModel.getProperty("/Comments"),
            },
            url: "/Salaries"
        }

        const result = await utils.crud("create", new JSONModel(body)) as any;
        !result.responseText && MessageBox.success(i18n.getText("successAddRise") || "no text defined")
        this.onCancelButtonPress();
    };

    public onCancelButtonPress(): void {
        this.dialog.close();
    }

};
import BaseControllers from "../helpers/BaseControllers";
import { URLHelper } from "sap/m/library";

/**
 * @namespace de.santos.rhemployees.controller
 */
export default class Home extends BaseControllers {

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {

    };

    public onCreateEmployeeGenericTilePress(): void {
        this.getRouterHelper().navTo("RouteCreateEmployees");
    };

    public onShowEmployeesGenericTilePress(): void {
        this.getRouterHelper().navTo("RouteMasterDetailsEmployee");
    };

    public onSignOrderGenericTilePress(): void {
        const url = "https://mosolf-se---co--kg-mosolf-fzeq-dev-employees-ts-approuter.cfapps.eu10-004.hana.ondemand.com/desantosemployees/index.html";
		URLHelper.redirect(url);
    };
};
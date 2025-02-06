import BaseControllers from "../helpers/BaseControllers";

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

    };
};
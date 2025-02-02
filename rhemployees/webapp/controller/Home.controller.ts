import BaseControllers from "../helpers/BaseControllers";
import { GenericTile$PressEvent } from "sap/m/GenericTile";
import UIComponent from "sap/ui/core/UIComponent";

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

    };

    public onSignOrderGenericTilePress(): void {

    };
};
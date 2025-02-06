import { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import BaseControllers from "../helpers/BaseControllers";
import Filter from "sap/ui/model/Filter";

/**
 * @namespace de.santos.rhemployee.controller
 */

export default class MasterDetails extends BaseControllers {
    public onInit(): void {
        
    };

    public onSearchFieldLiveChange(event: SearchField$LiveChangeEvent): void {
        const inputValue = event.getSource().getValue();


    };
};
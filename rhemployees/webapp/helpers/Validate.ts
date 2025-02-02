import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace com.logaligroup.employees.helpers
 */

export default class Validate {

    public static dniCheck(dni: string): boolean {
            let number: any;
            let letter;
            let letterList;
            let regularExp = /^\d{8}[a-zA-Z]$/;
            const model = this.getModelHelper("employeeModel") as JSONModel;

            if (regularExp.test(dni) === true) {
                number = dni.substr(0, dni.length - 1);
                letter = dni.substr(dni.length - 1, 1);
                number = number % 23;
                letterList = "TRWAGMYFPDXBNJZSQVHLCKET";
                letterList = letterList.substring(number, number + 1);

                if (letterList === letter.toUpperCase()) {
                    model.setProperty("/DNIVerify", true);
                    model.refresh();
                    return true;
                }
            }
            model.setProperty("/DNIVerify", "");
            return false;
        };

    public static cifCheck(cif: string) {
        if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[A-J0-9]$/.test(cif)) return false;

        const [type, ...rest] = cif.toUpperCase();
        const digits = rest.slice(0, 7).map(Number);
        const controlChar = rest[7];

        const sum = digits.reduce((acc, num, i) => 
            acc + (i % 2 === 0 ? (num * 2 > 9 ? num * 2 - 9 : num * 2) : num), 0
        );

        const calculatedDigit = (10 - (sum % 10)) % 10;
        const expectedLetter = "JABCDEFGHI"[calculatedDigit];

        return Boolean(
            "NPQRS".includes(type) 
                ? controlChar === expectedLetter
                : controlChar === calculatedDigit.toString() || controlChar === expectedLetter
        );
    };
    }
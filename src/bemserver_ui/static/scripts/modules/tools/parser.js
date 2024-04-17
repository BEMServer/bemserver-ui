export class Parser {
    static parseIntOrDefault(value, defaultValue = 0) {
        if (defaultValue == null) {
            defaultValue = Number.NaN;
        }
        let valueInt = Number.parseInt(value);
        if (Number.isNaN(valueInt)) {
            valueInt = defaultValue;
        }
        return valueInt;
    }

    static parseFloatOrDefault(value, defaultValue = 0.0, fractionDigits = null) {
        if (defaultValue == null) {
            defaultValue = Number.NaN;
        }
        let valueFloat = value != null ? Number.parseFloat(value.toString().replace(",", ".")) : defaultValue;
        if (Number.isNaN(valueFloat)) {
            valueFloat = defaultValue;
        }
        else if (fractionDigits != null) {
            let valueFloatParts = valueFloat.toString().split(".");
            if (valueFloatParts.length > 1 && Parser.parseIntOrDefault(valueFloatParts[1]) > 0) {
                valueFloat = valueFloat.toFixed(fractionDigits);
            }
        }
        return valueFloat;
    }

    static parseBoolOrDefault(value, defaultValue = true) {
        try {
            return JSON.parse(value);
        }
        catch {
            return defaultValue;
        }
    }
}

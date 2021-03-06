class Parser {
    static parseIntOrDefault(value, defaultValue = 0) {
        let valueInt = Number.parseInt(value);
        if (Number.isNaN(valueInt)) {
            valueInt = defaultValue;
        }
        return valueInt;
    }

    static parseFloatOrDefault(value, defaultValue = 0) {
        let valueFloat = value != null ? Number.parseFloat(value.toString().replace(",", ".")) : defaultValue;
        if (Number.isNaN(valueFloat)) {
            valueFloat = defaultValue;
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


export { Parser };

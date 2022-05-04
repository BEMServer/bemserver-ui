class Parser {
    static parseIntOrDefault(value, defaultValue = 0) {
        let valueInt = Number.parseInt(value);
        if (Number.isNaN(valueInt)) {
            valueInt = defaultValue;
        }
        return valueInt;
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

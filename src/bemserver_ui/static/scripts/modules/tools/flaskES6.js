export class FlaskES6 {

    #endpoints = null;
    #campaignContextQueryArgName = null;

    constructor(flaskEndpoints, campaignContextQueryArgName) {
        this.#endpoints = flaskEndpoints;
        this.#campaignContextQueryArgName = campaignContextQueryArgName;
    }

    urlFor(endpoint, rule) {
        // Shallow copy `rule` using the object spread operator.
        rule = rule == undefined ? {} : {...rule};
        // `rule` *must* be an Object, anything else is wrong.
        if (!(rule instanceof Object)) {
            throw new TypeError(`Type for "rule" arg must be Object, got: ${typeof(rule)}`);
        }

        let is_absolute = false;
        let scheme = "";
        if (rule["_external"] === true) {
            is_absolute = true;
            scheme = window.location.protocol.split(":")[0];
            delete rule["_external"];
        }
        if ("_scheme" in rule) {
            if (is_absolute) {
                scheme = rule["_scheme"];
                delete rule["_scheme"];
            } else {
                throw new TypeError("_scheme is set without _external.");
            }
        }

        let has_anchor = false;
        let anchor = "";
        if ("_anchor" in rule) {
            has_anchor = true;
            anchor = rule["_anchor"];
            delete rule["_anchor"];
        }

        let endpointData = this.#endpoints[endpoint];
        if (endpointData == undefined) {
            throw new Error(`Endpoint "${endpoint}" does not exist`);
        }

        // Inject campaign context, if any.
        let currentLocationSearchParams = new URLSearchParams(window.location.search.replace("?", ""));
        if (this.#campaignContextQueryArgName != null && currentLocationSearchParams.has(this.#campaignContextQueryArgName)) {
            rule[this.#campaignContextQueryArgName] = currentLocationSearchParams.get(this.#campaignContextQueryArgName);
        }

        let url = "";
        for (let i=0 ; i<endpointData[0].length ; i++) {
            url += endpointData[0][i];
            if (i < endpointData[1].length) {
                let pathParamName = endpointData[1][i];
                url += rule[pathParamName];
                delete rule[pathParamName];
            }
        }

        let urlSearchParams = new URLSearchParams(Object.entries(rule));
        if (Array.from(urlSearchParams).length > 0) {
            url += "?" + urlSearchParams.toString();
        }

        if (has_anchor) {
            url += "#" + anchor;
        }

        if (is_absolute) {
            url = scheme + "://" + window.location.host + url;
        }

        return url;
    }
}

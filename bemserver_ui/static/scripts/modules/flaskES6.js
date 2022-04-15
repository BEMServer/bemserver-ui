import { flaskEndpoints } from "./flaskES6-endpoints.js";
import { campaignSelector } from "../app.js";


class FlaskES6 {

    #endpoints = null;

    constructor() {
        this.#endpoints = flaskEndpoints;
    }

    urlFor(endpoint, rule) {
        rule = rule == undefined ? {} : rule
        // rule *must* be an Object, anything else is wrong
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
        if (campaignSelector.currentCampaign != null && campaignSelector.currentCampaign != "") {
            rule["campaign"] = campaignSelector.currentCampaign;
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

        let urlSearchParams = new URLSearchParams();
        for (let searchParam in rule) {
            urlSearchParams.append(searchParam, rule[searchParam])
        }
        if (urlSearchParams.length > 0) {
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


export { FlaskES6 };

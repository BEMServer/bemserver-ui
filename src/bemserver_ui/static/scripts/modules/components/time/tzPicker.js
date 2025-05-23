// File generated dynamically by app timezones extension.
import { TimezoneTool } from "/static/scripts/modules/tools/timezones.js";


export class TimezonePicker extends HTMLDivElement {

    #tzTool = null;

    #tzRegionSelectElmt = null;
    #tzNameSelectElmt = null;
    #inputFormBindElmt = null;

    #title = null;
    #inputFormBind = null;

    #tzRegionSelected = null;
    #tzNameSelected = null;

    constructor(options = {}) {
        super();

        this.#tzTool = new TimezoneTool();

        this.#loadOptions(options);
        this.#cacheDOM();
    }

    get tzName() {
        return this.#tzNameSelected;
    }
    set tzName(value) {
        if (this.#tzNameSelected != value) {
            this.#tzNameSelected = value;
            this.#update();
        }
    }

    get value() {
        return this.#tzNameSelected;
    }
    set value(value) {
        if (this.#tzNameSelected != value) {
            this.#tzNameSelected = value;
            this.#update();
        }
    }

    get tzInfo() {
        return this.#tzTool.getTzInfo(this.#tzNameSelected);
    }

    #loadOptions(options = {}) {
        this.#inputFormBind = this.getAttribute("input-form-bind") || options.inputFormBind;
        this.#title = this.getAttribute("title") || options.title;
        this.#tzNameSelected = this.getAttribute("tzname") || options.tzName || this.#tzTool.defaultTzName;
    }

    #cacheDOM() {
        if (this.#inputFormBind != null) {
            this.#inputFormBindElmt = document.getElementById(this.#inputFormBind);
        }
    }

    #initEventListeners() {
        this.#tzRegionSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tzRegionSelected = this.#tzRegionSelectElmt.value;
            this.#updateTzNameChoices();
            this.#tzNameSelected = this.#tzNameSelectElmt.value;
            this.#updateInputFormBind();

            let tzChangeEvent = new CustomEvent("tzChange", {detail: {tzRegion: this.#tzRegionSelected, tzName: this.#tzNameSelected}, bubbles: true});
            this.dispatchEvent(tzChangeEvent);
        });

        this.#tzNameSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tzNameSelected = this.#tzNameSelectElmt.value;
            this.#updateInputFormBind();

            let tzChangeEvent = new CustomEvent("tzChange", {detail: {tzRegion: this.#tzRegionSelected, tzName: this.#tzNameSelected}, bubbles: true});
            this.dispatchEvent(tzChangeEvent);
        });
    }

    #updateTzRegionChoices() {
        if (this.#tzNameSelected != null && this.#tzRegionSelected == null) {
            this.#checkTzNameOrDefault();
            let tzInfo = this.#tzTool.getTzInfo(this.#tzNameSelected);
            this.#tzRegionSelected = tzInfo["region"];
        }

        this.#tzRegionSelectElmt.innerHTML = "";
        for (let tzRegion of this.#tzTool.regions) {
            let optElmt = document.createElement("option");
            optElmt.value = tzRegion;
            optElmt.innerText = tzRegion;
            if (tzRegion == this.#tzRegionSelected) {
                optElmt.selected = true;
            }
            this.#tzRegionSelectElmt.appendChild(optElmt);
        }
    }

    #updateTzNameChoices() {
        this.#tzNameSelectElmt.innerHTML = "";

        for (let tzArea of this.#tzTool.areasByRegion[this.#tzRegionSelected]) {
            let optGroupElmt = document.createElement("optgroup");
            optGroupElmt.label = tzArea["label"];
            this.#tzNameSelectElmt.appendChild(optGroupElmt);

            for (let tzInfo of this.#tzTool.timezonesByRegionByArea[this.#tzRegionSelected][tzArea["label"]]) {
                let optElmt = document.createElement("option");
                optElmt.value = tzInfo["name"];
                optElmt.innerText = tzInfo["label"];
                if (tzInfo["name"] == this.#tzNameSelected) {
                    optElmt.selected = true;
                }
                optGroupElmt.appendChild(optElmt);
            }
        }
    }

    #updateInputFormBind() {
        if (this.#inputFormBindElmt != null) {
            this.#inputFormBindElmt.value = this.#tzNameSelected;
        }
    }

    #update() {
        this.#checkTzNameOrDefault();

        let tzInfo = this.#tzTool.getTzInfo(this.#tzNameSelected);
        if (this.#tzRegionSelectElmt != null) {
            if (this.#tzRegionSelected != tzInfo["region"]) {
                this.#tzRegionSelected = tzInfo["region"];
                this.#updateTzRegionChoices();
            }
            else {
                this.#tzRegionSelectElmt.value = this.#tzRegionSelected;
            }
        }

        if (this.#tzNameSelectElmt != null) {
            this.#updateTzNameChoices();
        }

        if (this.#tzRegionSelectElmt != null) {
            this.#updateTzRegionChoices();
        }

        this.#updateInputFormBind();
    }

    #checkTzNameOrDefault(tzNameDefault = "UTC") {
        if (!this.#tzTool.tzExists(this.#tzNameSelected)) {
            this.#tzNameSelected = tzNameDefault;
        }
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("input-group", "input-group-sm");

        if (this.#title != null) {
            let selectorTitleElmt = document.createElement("span");
            selectorTitleElmt.classList.add("input-group-text");
            selectorTitleElmt.innerText = this.#title;
            this.appendChild(selectorTitleElmt);
        }
        else {
            let iconElmt = document.createElement("i");
            iconElmt.classList.add("bi", "bi-globe", "input-group-text");
            this.appendChild(iconElmt);
        }

        this.#tzRegionSelectElmt = document.createElement("select");
        this.#tzRegionSelectElmt.classList.add("form-select");
        this.#tzRegionSelectElmt.setAttribute("aria-label", "Select a timezone");
        this.appendChild(this.#tzRegionSelectElmt);

        let breakerElmt = document.createElement("div");
        breakerElmt.classList.add("d-sm-none", "d-block", "w-100", "mb-1");
        this.appendChild(breakerElmt);

        this.#tzNameSelectElmt = document.createElement("select");
        this.#tzNameSelectElmt.classList.add("form-select");
        this.#tzNameSelectElmt.setAttribute("aria-label", "Select a timezone");
        this.appendChild(this.#tzNameSelectElmt);

        this.#updateTzRegionChoices();
        this.#updateTzNameChoices();
        this.#updateInputFormBind();

        this.#initEventListeners();
    }
}


if (window.customElements.get("app-timezone-picker") == null) {
    window.customElements.define("app-timezone-picker", TimezonePicker, { extends: "div" });
}

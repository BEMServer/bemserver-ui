import { Parser } from "/static/scripts/modules/tools/parser.js";


const DURATIONS = Object.freeze({
    "year": [1],
    "month": [1],
    "week": [1],
    "day": [1],
    "hour": [1, 2, 3, 4, 6, 8, 12],
    "minute": [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30],
    "second": [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30],
});


export class TimeseriesBucketWidth extends HTMLDivElement {

    #title = null;
    #widthUnit = null;
    #widthValue = null;

    #defaultWidthUnit = "day";
    #defaultWidthValue = 1;

    #selectElmt = null;


    get bucketWidthUnit() {
        return this.#widthUnit;
    }
    set bucketWidthUnit(value) {
        if (value != this.#widthUnit && Object.keys(DURATIONS).includes(value)) {
            this.#widthUnit = value;
            if (!DURATIONS[this.#widthUnit].includes(this.#widthValue)) {
                this.#widthValue = DURATIONS[this.#widthUnit][0];
            }
            this.#selectElmt.value = `${this.#widthValue}_${this.#widthUnit}`;
        }
    }

    get bucketWidthValue() {
        return this.#widthValue;
    }
    set bucketWidthValue(value) {
        value = Parser.parseIntOrDefault(value, this.#widthValue);
        if (value != this.#widthValue && DURATIONS[this.#widthUnit].includes(value)) {
            this.#widthValue = value;
            this.#selectElmt.value = `${this.#widthValue}_${this.#widthUnit}`;
        }
    }

    static get observedAttributes() {
        return ["disabled"];
    }


    constructor(options = {}) {
        super();

        this.#loadOptions(options);
    }

    connectedCallback() {
        this.innerHTML = "";

        if (this.#title != null) {
            this.classList.add("input-group", "input-group-sm");

            let titleSpanElmt = document.createElement("span");
            titleSpanElmt.classList.add("input-group-text");
            titleSpanElmt.innerText = this.#title;
            this.appendChild(titleSpanElmt);
        }

        this.#selectElmt = document.createElement("select");
        this.#selectElmt.classList.add("form-select");
        this.#selectElmt.setAttribute("aria-label", "Select a bucket width");

        for (let [durationName, durationOptions] of Object.entries(DURATIONS)) {
            let optGroupElmt = document.createElement("optgroup");
            optGroupElmt.label = durationName;

            for (let durationOpt of durationOptions) {
                let optElmt = document.createElement("option");
                optElmt.value = `${durationOpt}_${durationName}`;
                optElmt.text = `${durationOpt} ${durationName}${durationOpt > 1 ? "s" : ""}`;
                optElmt.selected = optElmt.value == `${this.#widthValue}_${this.#widthUnit}`;
                optGroupElmt.appendChild(optElmt);
            }

            this.#selectElmt.appendChild(optGroupElmt);
        }

        this.appendChild(this.#selectElmt);

        this.#initEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue != newValue) {
            if (name == "disabled") {
                if (newValue) {
                    this.setDisabled();
                }
                else {
                    this.setEnabled();
                }
            }
        }
    }

    setEnabled() {
        this.#selectElmt?.removeAttribute("disabled");
    }
    setDisabled() {
        this.#selectElmt?.setAttribute("disabled", true);
    }

    #loadOptions(options = {}) {
        this.#title = this.getAttribute("title") || options.title;
        this.#widthUnit = this.getAttribute("unit") || options.unit || this.#defaultWidthUnit;
        this.#widthValue = Parser.parseIntOrDefault(this.getAttribute("value") || options.value, this.#defaultWidthValue);

        if (DURATIONS[this.#widthUnit] === undefined) {
            this.#widthUnit = this.#defaultWidthUnit;
        }
        if (!DURATIONS[this.#widthUnit].includes(this.#widthValue)) {
            this.#widthValue = DURATIONS[this.#widthUnit][0];
        }
    }

    #initEventListeners() {
        this.#selectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            let optParts = this.#selectElmt.options[this.#selectElmt.selectedIndex].value.split("_");
            this.#widthValue = Parser.parseIntOrDefault(optParts[0], this.#defaultWidthValue);
            this.#widthUnit = optParts[1];

            this.setAttribute("value", this.#widthValue);
            this.setAttribute("unit", this.#widthUnit);
        });
    }
}


if (window.customElements.get("app-ts-bucket-width") == null) {
    window.customElements.define("app-ts-bucket-width", TimeseriesBucketWidth, { extends: "div" });
}

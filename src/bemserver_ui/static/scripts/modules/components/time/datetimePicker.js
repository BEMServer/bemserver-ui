import { Parser } from "/static/scripts/modules/tools/parser.js";
import { TimezoneTool } from "/static/scripts/modules/tools/timezones.js";


export class DatetimePicker extends HTMLDivElement {

    #initOptions = {};
    #tzTool = null;

    #titleSpanElmt = null;
    #dateInputElmt = null;
    #timeInputElmt = null;
    #tzInfoElmt = null;
    #dateInputFormBindElmt = null;
    #timeInputFormBindElmt = null;

    #isRequired = false;
    #hasAutofocus = false;
    #dateInputFormBind = null;
    #timeInputFormBind = null;
    #title = null;
    #tzName = null;
    #dateMin = null;
    #dateMax = null;
    #usedAsFilter = false;

    #date = null;
    #time = null;

    constructor(options = {}) {
        super();

        this.#initOptions = options;
        this.#tzTool = new TimezoneTool();

        this.#loadOptions(options);
        this.#cacheDOM();

        this.#dateInputElmt = document.createElement("input");
        this.#dateInputElmt.type = "date";
        this.#timeInputElmt = document.createElement("input");
        this.#timeInputElmt.type = "time";
    }

    static get observedAttributes() {
        return ["disabled", "required"];
    }

    get date() {
        return this.#date;
    }
    set date(value) {
        this.#date = value;
        this.#dateInputElmt.value = this.#date;
        this.#updateDateInputFormBind();
        this.#updateStyle();
    }

    get time() {
        return this.#time;
    }
    set time(value) {
        this.#time = value;
        this.#timeInputElmt.value = this.#time;
        this.#updateTimeInputFormBind();
        this.#updateStyle();
    }

    get dateMin() {
        return this.#dateMin;
    }
    set dateMin(value) {
        this.#dateMin = value;
        this.#updateDateBounds();
    }

    get dateMax() {
        return this.#dateMax;
    }
    set dateMax(value) {
        this.#dateMax = value;
        this.#updateDateBounds();
    }

    get tzName() {
        return this.#tzName;
    }
    set tzName(value) {
        this.#tzName = value;
        this.#updateTzInfo();
    }

    get hasDatetime() {
        return this.#dateInputElmt.value != "" && this.#dateInputElmt.value != null;
    }

    #loadOptions(options = {}) {
        this.#dateInputFormBind = this.getAttribute("date-input-form-bind") || options.dateInputFormBind;
        this.#timeInputFormBind = this.getAttribute("time-input-form-bind") || options.timeInputFormBind;
        this.#isRequired = options?.required == null ? this.hasAttribute("required") : Parser.parseBoolOrDefault(options.required, false);
        this.#hasAutofocus = options?.autofocus == null ? this.hasAttribute("autofocus") : Parser.parseBoolOrDefault(options.autofocus, false);
        this.#title = this.getAttribute("title") || options.title;
        this.#tzName = this.getAttribute("tzname") || options.tzName || this.#tzTool.defaultTzName;
        this.#dateMin = this.getAttribute("min") || options.dateMin;
        this.#dateMax = this.getAttribute("max") || options.dateMax;
        this.#date = this.getAttribute("date") || options.date;
        this.#time = this.getAttribute("time") || options.time;
        this.#usedAsFilter = this.getAttribute("as-filter") || Parser.parseBoolOrDefault(options.usedAsFilter, false);
    }

    #cacheDOM() {
        if (this.#dateInputFormBind != null) {
            this.#dateInputFormBindElmt = document.getElementById(this.#dateInputFormBind);
        }
        if (this.#timeInputFormBind != null) {
            this.#timeInputFormBindElmt = document.getElementById(this.#timeInputFormBind);
        }
    }

    #initEventListeners() {
        this.#dateInputElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#date = this.#dateInputElmt.value;
            this.#updateDateInputFormBind();
            this.#updateStyle();

            let dateChangeEvent = new CustomEvent("dateChange", {detail: {date: this.#dateInputElmt.value}, bubbles: true});
            this.dispatchEvent(dateChangeEvent);

            let datetimeChangeEvent = new CustomEvent("datetimeChange", {detail: {date: this.#dateInputElmt.value, time: this.#timeInputElmt.value}, bubbles: true});
            this.dispatchEvent(datetimeChangeEvent);
        });

        this.#timeInputElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#time = this.#timeInputElmt.value;
            this.#updateTimeInputFormBind();
            this.#updateStyle();

            let timeChangeEvent = new CustomEvent("timeChange", {detail: {time: this.#timeInputElmt.value}, bubbles: true});
            this.dispatchEvent(timeChangeEvent);

            let datetimeChangeEvent = new CustomEvent("datetimeChange", {detail: {date: this.#dateInputElmt.value, time: this.#timeInputElmt.value}, bubbles: true});
            this.dispatchEvent(datetimeChangeEvent);
        });
    }

    #updateStyle() {
        if (this.#usedAsFilter) {
            if (this.#date == null || this.#date == "") {
                this.#dateInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#dateInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            }

            if (this.#time == null || this.#time == "") {
                this.#timeInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#timeInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            }
        }
    }

    #updateDateBounds() {
        if (this.#dateInputElmt.getAttribute("min") != this.#dateMin) {
            if (this.#dateMin == null) {
                this.#dateInputElmt.removeAttribute("min");
            }
            else {
                this.#dateInputElmt.setAttribute("min", this.#dateMin);
            }
        }

        if (this.#dateInputElmt.getAttribute("max") != this.#dateMax) {
            if (this.#dateMax == null) {
                this.#dateInputElmt.removeAttribute("max");
            }
            else {
                this.#dateInputElmt.setAttribute("max", this.#dateMax);
            }
        }
    }

    #updateDateAndTime() {
        this.#dateInputElmt.value = this.#date;
        this.#timeInputElmt.value = this.#time;
    }

    #updateDateInputFormBind() {
        if (this.#dateInputFormBindElmt != null) {
            this.#dateInputFormBindElmt.value = this.#date;
        }
    }

    #updateTimeInputFormBind() {
        if (this.#timeInputFormBindElmt != null) {
            this.#timeInputFormBindElmt.value = this.#time;
        }
    }

    #updateTzInfo() {
        let tzInfo = this.#tzTool.getTzInfo(this.#tzName);

        let tzInfoTitleContentElmt = document.createElement("div");
        tzInfoTitleContentElmt.classList.add("d-grid");
        let tzInfoAreaLabelElmt = document.createElement("span");
        tzInfoAreaLabelElmt.classList.add("fw-bold");
        tzInfoAreaLabelElmt.innerText = tzInfo["area"]["label"];
        tzInfoTitleContentElmt.appendChild(tzInfoAreaLabelElmt);
        let tzInfoLabelElmt = document.createElement("span");
        tzInfoLabelElmt.classList.add("fst-italic");
        tzInfoLabelElmt.innerText = tzInfo["label"];
        tzInfoTitleContentElmt.appendChild(tzInfoLabelElmt);

        this.#tzInfoElmt.setAttribute("title", tzInfoTitleContentElmt.outerHTML);
        this.#enableOrRefreshTooltips();
    }

    #enableOrRefreshTooltips() {
        // Enable (or refresh) Bootstrap tooltips.
        var tooltipTriggerList = [].slice.call(this.querySelectorAll(`[data-bs-toggle="tooltip"]`));
        tooltipTriggerList.map((tooltipTriggerEl) => {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    connectedCallback() {
        this.#loadOptions(this.#initOptions);

        this.innerHTML = "";
        this.classList.add("input-group", "input-group-sm");
        this.style.minWidth = "230px";

        if (this.#title != null) {
            this.#titleSpanElmt = document.createElement("span");
            this.#titleSpanElmt.classList.add("input-group-text");
            this.#titleSpanElmt.innerText = this.#title;
            this.appendChild(this.#titleSpanElmt);
        }

        this.#dateInputElmt.classList.add("form-control");
        if (this.#hasAutofocus) {
            this.#dateInputElmt.setAttribute("autofocus", true);
        }
        if (this.#dateMin != null) {
            this.#dateInputElmt.setAttribute("min", this.#dateMin);
        }
        if (this.#dateMax != null) {
            this.#dateInputElmt.setAttribute("max", this.#dateMax);
        }
        this.#dateInputElmt.style.minWidth = "125px";
        this.appendChild(this.#dateInputElmt);

        this.#timeInputElmt.classList.add("form-control");
        this.#timeInputElmt.style.minWidth = "75px";
        this.appendChild(this.#timeInputElmt);

        if (this.#isRequired) {
            this.setRequired();
        }
        else {
            this.setOptional();
        }

        this.#tzInfoElmt = document.createElement("i");
        this.#tzInfoElmt.classList.add("input-group-text", "bi", "bi-watch");
        this.#tzInfoElmt.setAttribute("data-bs-toggle", "tooltip");
        this.#tzInfoElmt.setAttribute("data-bs-html", true);
        this.appendChild(this.#tzInfoElmt);

        this.#updateDateBounds();
        this.#updateDateAndTime();
        this.#updateTzInfo();
        this.#updateStyle();

        this.#initEventListeners();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue != newValue) {
            if (name == "disabled") {
                if (newValue == null || newValue == "") {
                    newValue = true;
                }
                if (newValue) {
                    this.setDisabled();
                }
                else {
                    this.setEnabled();
                }
            }
            else if (name == "required") {
                if (newValue == null || newValue == "") {
                    newValue = true;
                }
                if (newValue) {
                    this.setRequired();
                }
                else {
                    this.setOptional();
                }
            }
        }
    }

    setEnabled() {
        this.#dateInputElmt.removeAttribute("disabled");
        this.#timeInputElmt.removeAttribute("disabled");
    }
    setDisabled() {
        this.#dateInputElmt.setAttribute("disabled", true);
        this.#timeInputElmt.setAttribute("disabled", true);
    }

    setRequired() {
        this.#dateInputElmt.setAttribute("required", true);
        this.#timeInputElmt.setAttribute("required", true);
    }
    setOptional() {
        this.#dateInputElmt.removeAttribute("required");
        this.#timeInputElmt.removeAttribute("required");
    }

    focus(options = { focusOnTime: false }) {
        if (options.focusOnTime) {
            this.#timeInputElmt.focus();
        }
        else {
            this.#dateInputElmt.focus();
        }
    }

    reset(options = { ignoreDate: false, ignoreTime: false }) {
        if (!options.ignoreDate) {
            this.#date = null;
            this.#dateMin = null;
            this.#dateMax = null;
            this.#updateDateBounds();
        }
        if (!options.ignoreTime) {
            this.#time = null;
        }
        this.#updateDateAndTime();
        this.#updateStyle();
    }
}


if (window.customElements.get("app-datetime-picker") == null) {
    window.customElements.define("app-datetime-picker", DatetimePicker, { extends: "div" });
}

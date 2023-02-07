import { Parser } from "../../tools/parser.js";
import { TimezoneTool } from "../../tools/timezones.js";


export class DatetimePicker extends HTMLDivElement {

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

        this.#tzTool = new TimezoneTool();

        this.#loadOptions(options);
        this.#cacheDOM();
    }

    get date() {
        return this.#date;
    }

    get time() {
        return this.#time;
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
        this.#isRequired = options?.required == null ? this.hasAttribute("required") : options.required;
        this.#hasAutofocus = options?.autofocus == null ? this.hasAttribute("autofocus") : options.autofocus;
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
        this.#tzInfoElmt.setAttribute("title", `<div class="d-grid"><span class="fw-bold">${tzInfo["area"]["label"]}</span><span class="fst-italic">${tzInfo["label"]}</span></div>`);
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
        this.innerHTML = "";
        this.classList.add("input-group", "input-group-sm");

        if (this.#title != null) {
            this.#titleSpanElmt = document.createElement("span");
            this.#titleSpanElmt.classList.add("input-group-text");
            this.#titleSpanElmt.innerText = this.#title;
            this.appendChild(this.#titleSpanElmt);
        }

        this.#dateInputElmt = document.createElement("input");
        this.#dateInputElmt.classList.add("form-control");
        this.#dateInputElmt.type = "date";
        if (this.#isRequired) {
            this.#dateInputElmt.setAttribute("required", true);
        }
        if (this.#hasAutofocus) {
            this.#dateInputElmt.setAttribute("autofocus", true);
        }
        this.appendChild(this.#dateInputElmt);

        this.#timeInputElmt = document.createElement("input");
        this.#timeInputElmt.classList.add("form-control");
        this.#timeInputElmt.type = "time";
        if (this.#isRequired) {
            this.#timeInputElmt.setAttribute("required", true);
        }
        this.appendChild(this.#timeInputElmt);

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

    reset() {
        this.#date = null;
        this.#time = null;
        this.#dateMin = null;
        this.#dateMax = null;
        this.#updateDateBounds();
        this.#updateDateAndTime();
        this.#updateStyle();
    }
}


if (window.customElements.get("app-datetime-picker") == null) {
    window.customElements.define("app-datetime-picker", DatetimePicker, { extends: "div" });
}

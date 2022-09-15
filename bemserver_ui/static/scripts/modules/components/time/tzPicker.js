import { tzDefaults, tzData } from "../../tools/timezones.js";


export class TimezonePicker extends HTMLElement {

    #tzNameSelectElmt = null;
    #inputFormBindElmt = null;

    #title = null;
    #inputFormBind = null;

    #tzNameSelected = null;

    constructor(options = {}) {
        super();

        this.#loadOptions(options);
        this.#cacheDOM();
    }

    get tzName() {
        return this.#tzNameSelected;
    }
    set tzName(value) {
        if (value in tzData) {
            this.#tzNameSelected = value;
            if (this.#tzNameSelectElmt != null) {
                this.#tzNameSelectElmt.value = this.#tzNameSelected;
            }
        }
    }

    get value() {
        return this.#tzNameSelected;
    }

    #loadOptions(options = {}) {
        this.#inputFormBind = this.getAttribute("input-form-bind") || options.inputFormBind;
        this.#title = this.getAttribute("title") || options.title;
        this.tzName = this.getAttribute("tzname") || options.tzName || tzDefaults.name;
    }

    #cacheDOM() {
        if (this.#inputFormBind != null) {
            this.#inputFormBindElmt = document.getElementById(this.#inputFormBind);
        }
    }

    #initEventListeners() {
        this.#tzNameSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tzNameSelected = this.#tzNameSelectElmt.value;
            this.#updateInputFormBind();

            let tzChangeEvent = new CustomEvent("tzChange", {detail: {tzName: this.#tzNameSelected}, bubbles: true});
            this.dispatchEvent(tzChangeEvent);
        });
    }

    #updateTzNameChoices() {
        this.#tzNameSelectElmt.innerHTML = "";
        for (let [tzName, tzInfo] of Object.entries(tzData)) {
            let optElmt = document.createElement("option");
                optElmt.value = tzName;
                optElmt.innerText = tzInfo.label;
                if (tzName == this.#tzNameSelected) {
                    optElmt.selected = true;
                }
                this.#tzNameSelectElmt.appendChild(optElmt);
        }
    }

    #updateInputFormBind() {
        if (this.#inputFormBindElmt != null) {
            this.#inputFormBindElmt.value = this.#tzNameSelected;
        }
    }

    connectedCallback() {
        this.innerHTML = "";

        if (this.#title != null) {
            this.classList.add("input-group");

            let selectorTitleElmt = document.createElement("span");
            selectorTitleElmt.classList.add("input-group-text");
            selectorTitleElmt.innerText = this.#title;
            this.appendChild(selectorTitleElmt);
        }

        this.#tzNameSelectElmt = document.createElement("select");
        this.#tzNameSelectElmt.classList.add("form-select");
        this.#tzNameSelectElmt.setAttribute("aria-label", "Select a timezone");
        this.appendChild(this.#tzNameSelectElmt);

        this.#updateTzNameChoices();
        this.#updateInputFormBind();

        this.#initEventListeners();
    }
}


if (customElements.get("app-timezone-picker") == null) {
    customElements.define("app-timezone-picker", TimezonePicker);
}

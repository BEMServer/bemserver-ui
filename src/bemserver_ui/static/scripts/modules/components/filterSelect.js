import { Parser } from "../tools/parser.js";


export class FilterSelect extends HTMLSelectElement {

    #defaultOptionIndex = 0;

    constructor(options = {}) {
        super();

        this.#defaultOptionIndex = Parser.parseIntOrDefault(options.defaultOptionIndex, Parser.parseIntOrDefault(this.getAttribute("current-option"), this.#defaultOptionIndex));
    }

    get isDefaultSelected() {
        return this.selectedIndex == this.#defaultOptionIndex;
    }

    #initEventListeners() {
        this.addEventListener("change", (event) => {
            event.preventDefault();

            this.#update();
        });
    }

    #update() {
        if (this.isDefaultSelected) {
            this.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else {
            this.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("form-select", "form-select-sm", "border");
        this.setAttribute("aria-label", "Select a filter value");

        let loadingOptionElmt = document.createElement("option");
        loadingOptionElmt.value = "None";
        loadingOptionElmt.innerText = "loading...";
        this.appendChild(loadingOptionElmt);

        this.selectedIndex = this.#defaultOptionIndex;

        this.#initEventListeners();
    }

    load(options, selectedOptionIndex = 0) {
        this.innerHTML = "";
        for (let option of options) {
            let optionElmt = document.createElement("option");
            optionElmt.value = option.value.toString();
            optionElmt.innerText = option.text;
            this.appendChild(optionElmt);
        }

        this.selectedIndex = Parser.parseIntOrDefault(selectedOptionIndex, this.#defaultOptionIndex);
        this.#update();
    }

    reset() {
        this.selectedIndex = this.#defaultOptionIndex;
        this.#update();
    }
}


if (customElements.get("app-filter-select") == null) {
    customElements.define("app-filter-select", FilterSelect, { extends: "select" });
}

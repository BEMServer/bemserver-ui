import { Parser } from "/static/scripts/modules/tools/parser.js";


export class Spinner extends HTMLDivElement {

    #useSmallSize = false;
    #useSecondaryColor = false;

    constructor(options = {}) {
        super();

        this.#loadOptions(options);
    }

    #loadOptions(options = {}) {
        this.#useSmallSize = Parser.parseBoolOrDefault(options.useSmallSize || this.getAttribute("small-size"), this.#useSmallSize);
        this.#useSecondaryColor = Parser.parseBoolOrDefault(options.useSecondaryColor || this.getAttribute("secondary-color"), this.#useSecondaryColor);
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("d-flex", "justify-content-center");

        let spinnerElmt = document.createElement("div");
        spinnerElmt.classList.add("spinner-border", `app-spinner${this.#useSecondaryColor ? "-secondary" : ""}`);
        if (this.#useSmallSize) {
            spinnerElmt.classList.add("spinner-border-sm");
        }
        spinnerElmt.setAttribute("role", "status");

        let spinnerAltContentElmt = document.createElement("span");
        spinnerAltContentElmt.classList.add("visually-hidden");
        spinnerAltContentElmt.innerText = "Loading...";
        spinnerElmt.appendChild(spinnerAltContentElmt);

        this.appendChild(spinnerElmt);
    }
}


if (window.customElements.get("app-spinner") == null) {
    window.customElements.define("app-spinner", Spinner, { extends: "div" });
}

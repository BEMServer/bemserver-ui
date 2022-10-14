export class Spinner extends HTMLDivElement {

    #useSmallSize = false;
    #useSecondaryColor = false;

    constructor(options = { useSmallSize: false, useSecondaryColor: false }) {
        super();

        this.#useSmallSize = options.useSmallSize;
        this.#useSecondaryColor = options.useSecondaryColor;
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


if (customElements.get("app-spinner") == null) {
    customElements.define("app-spinner", Spinner, { extends: "div" });
}

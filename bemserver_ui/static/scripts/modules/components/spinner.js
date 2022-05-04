class Spinner extends HTMLDivElement {

    #isSmallSize = false;

    constructor(options = { isSmallSize: false }) {
        super();

        this.#isSmallSize = options.isSmallSize;
    }

    connectedCallback() {
        this.innerHTML = "";

        this.classList.add("d-flex", "justify-content-center", "my-3");

        let spinnerElmt = document.createElement("div");
        spinnerElmt.classList.add("spinner-border", "app-spinner");
        if (this.#isSmallSize) {
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


customElements.define("app-spinner", Spinner, { extends: "div" });


export { Spinner } ;

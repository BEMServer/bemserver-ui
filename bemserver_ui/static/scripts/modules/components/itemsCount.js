import { Parser } from "../tools/parser.js";
import { Spinner } from "./spinner.js";


export class ItemsCount extends HTMLElement {

    #totalCount = 0;
    #firstItem = 0;
    #lastItem = 0;

    #spinnerElmt = null;

    get isLoading() {
        return this.contains(this.#spinnerElmt);
    }

    static get observedAttributes() {
        return ["total-count", "first-item", "last-item"];
    }

    constructor() {
        super();

        this.#spinnerElmt = new Spinner({useSmallSize: true});
    }

    #update() {
        this.innerHTML = "";
        if (this.#totalCount <= 0) {
            this.innerText = "No item"
        }
        else {
            this.innerText = `Items: ${this.#firstItem} - ${this.#lastItem} out of ${this.#totalCount}`;
        }
    }

    connectedCallback() {
        if (this.innerText == "" && this.innerHTML == "") {
            this.#update();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue != newValue) {
            switch (name) {
                case "total-count":
                    this.#totalCount = Parser.parseIntOrDefault(newValue);
                    break;
                case "first-item":
                    this.#firstItem = Parser.parseIntOrDefault(newValue);
                    break;
                case "last-item":
                    this.#lastItem = Parser.parseIntOrDefault(newValue);
                    break;
            }

            this.#update();
        }
        else if (this.isLoading)
        {
            this.#update();
        }
    }

    setLoading() {
        this.innerText = "";
        this.innerHTML = "";
        this.appendChild(this.#spinnerElmt);
    }

    update(options = {}, partial = false) {
        if (Number.isInteger(options.firstItem)) {
            this.setAttribute("first-item", options.firstItem.toString());
        }
        else if (!partial) {
            this.removeAttribute("first-item");
        }
        if (Number.isInteger(options.lastItem)) {
            this.setAttribute("last-item", options.lastItem.toString());
        }
        else if (!partial) {
            this.removeAttribute("last-item");
        }
        if (Number.isInteger(options.totalCount)) {
            this.setAttribute("total-count", options.totalCount.toString());
        }
        else if (!partial) {
            this.removeAttribute("total-count");
        }
    }
}


if (window.customElements.get("app-items-count") == null) {
    window.customElements.define("app-items-count", ItemsCount);
}

import { Parser } from "../tools/parser.js";
import { Spinner } from "./spinner.js";


export class ItemsCount extends HTMLElement {

    #totalCount = 0;
    #firstItem = 0;
    #lastItem = 0;

    #spinnerElmt = null;

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
    }

    setLoading() {
        this.innerText = "";
        this.innerHTML = "";
        this.appendChild(this.#spinnerElmt);
    }

    update(options = {}) {
        if (Number.isInteger(options.totalCount)) {
            this.setAttribute("total-count", options.totalCount.toString());
        }
        else {
            this.removeAttribute("total-count");
        }
        if (Number.isInteger(options.firstItem)) {
            this.setAttribute("first-item", options.firstItem.toString());
        }
        else {
            this.removeAttribute("first-item");
        }
        if (Number.isInteger(options.lastItem)) {
            this.setAttribute("last-item", options.lastItem.toString());
        }
        else {
            this.removeAttribute("last-item");
        }
    }
}


if (window.customElements.get("app-items-count") == null) {
    window.customElements.define("app-items-count", ItemsCount);
}
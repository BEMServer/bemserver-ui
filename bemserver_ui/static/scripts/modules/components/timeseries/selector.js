import { Parser } from "../../tools/parser.js";


class SelectedItem extends HTMLSpanElement {

    #itemId = null;
    #itemText = null;

    #removeBtnElmt = null;

    constructor(itemId, itemText) {
        super();

        this.#itemId = itemId;
        this.#itemText = itemText;
    }

    get itemId() {
        return this.#itemId;
    }

    #initEventListeners() {
        this.#removeBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let removeEvent = new CustomEvent("remove", { detail: { itemId: this.#itemId }});
            this.dispatchEvent(removeEvent);
        });
    }

    connectedCallback() {
        this.innerHTML = "";

        this.classList.add("badge", "rounded-pill", "bg-info", "text-dark");
        this.setAttribute("data-item-id", this.#itemId?.toString());

        let textContentElmt = document.createElement("span");
        textContentElmt.innerText = this.#itemText;
        this.appendChild(textContentElmt)

        this.#removeBtnElmt = document.createElement("i");
        this.#removeBtnElmt.classList.add("bi", "bi-x-lg", "ms-2");
        this.#removeBtnElmt.setAttribute("role", "button");
        this.appendChild(this.#removeBtnElmt);

        this.#initEventListeners();
    }
}


class SearchResultItem extends HTMLButtonElement {

    #itemId = null;
    #itemText = null;
    #itemIsActive = false;

    constructor(itemId, itemText, itemIsActive = false) {
        super();

        this.#itemId = itemId;
        this.#itemText = itemText;
        this.#itemIsActive = itemIsActive;

        this.#update();
    }

    get isActive() {
        return this.#itemIsActive;
    }
    set isActive(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#itemIsActive);
        if (cleanValue != this.#itemIsActive) {
            this.#itemIsActive = cleanValue;
            this.#update();
            this.#dispatchEvents();
        }
    }

    #initEventListeners() {
        this.addEventListener("click", (event) => {
            event.preventDefault();

            this.#itemIsActive = !this.#itemIsActive;
            this.#dispatchEvents();
        });
    }

    #dispatchEvents() {
        let buttonEvent = null;
        if (this.#itemIsActive) {
            buttonEvent = new CustomEvent("on", { detail: { itemId: this.#itemId, itemText: this.#itemText }, bubbles: true });
        }
        else {
            buttonEvent = new CustomEvent("off", { detail: { itemId: this.#itemId }, bubbles: true });
        }
        this.dispatchEvent(buttonEvent);

        let buttonToggleEvent = new CustomEvent("toggle", { detail: { itemId: this.#itemId, itemText: this.#itemText, itemIsActive: this.#itemIsActive }});
        this.dispatchEvent(buttonToggleEvent);
    }

    #update() {
        if (this.#itemIsActive) {
            this.classList.add("active");
        }
        else {
            this.classList.remove("active");
        }
        this.setAttribute("aria-pressed", this.#itemIsActive);
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("btn", "btn-outline-secondary");
        this.setAttribute("type", "button");
        this.setAttribute("data-bs-toggle", "button");
        this.setAttribute("data-item-id", this.#itemId?.toString());
        this.innerText = this.#itemText;

        this.#initEventListeners();
    }
}


customElements.define("app-ts-selected-item", SelectedItem, { extends: "span" });
customElements.define("app-ts-search-result-item", SearchResultItem, { extends: "button" });


export { SearchResultItem, SelectedItem } ;

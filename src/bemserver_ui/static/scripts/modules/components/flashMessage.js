import { Parser } from "/static/scripts/modules/tools/parser.js";
import { isDict } from "/static/scripts/modules/tools/dict.js";


const FLASH_MESSAGE_DATA = {
    "message": {
        "css": "info",
        "icon": "chat-square-text",
        "delay": 7,
    },
    "info": {
        "css": "info",
        "icon": "info-square",
        "delay": null,
    },
    "warning": {
        "css": "warning",
        "icon": "exclamation-triangle",
        "delay": null,
    },
    "error": {
        "css": "danger",
        "icon": "x-octagon",
        "delay": null,
    },
    "success": {
        "css": "success",
        "icon": "check-circle",
        "delay": null,
    },
    "default": {
        "css": "secondary",
        "icon": "bug",
        "delay": null,
    },
};


export class FlashMessage extends HTMLDivElement {

    #category = "message";
    #message = "";
    #delay = null;
    #isDismissible = true;
    #validationErrors = null;

    #progressBarElmt = null;

    #setupDelay = 0.1;
    #setupTimeoutID = null;
    #progressTimeoutID = null;

    constructor() {
        super();
    }

    #getCategoryOrDefault(category, defaultCategory = "default") {
        if (category != null && Object.keys(FLASH_MESSAGE_DATA).includes(category.toLowerCase())) {
            return category.toLowerCase();
        }
        return defaultCategory;
    }

    #loadFromAttributes() {
        this.#category = this.#getCategoryOrDefault(this.getAttribute("category"));
        this.#message = this.getAttribute("message");
        if (this.hasAttribute("delay")) {
            this.#delay = Parser.parseIntOrDefault(this.getAttribute("delay"), FLASH_MESSAGE_DATA[this.#category]["delay"]);
        }
        if (this.hasAttribute("dismiss")) {
            this.#isDismissible = Parser.parseBoolOrDefault(this.getAttribute("dismiss"), this.#isDismissible);
        }
        if (this.hasAttribute("validation-errors")) {
            this.#validationErrors = JSON.parse(this.getAttribute("validation-errors"));
        }
    }

    #initEventListeners() {
        if (this.#delay) {
            let progressDelay = Math.max(0, this.#delay - this.#setupDelay);

            this.#setupTimeoutID = window.setTimeout(() => {
                this.#progressBarElmt.style.width = "100%";
                this.#progressBarElmt.style.transition = `width ${progressDelay}s linear`;
    
                this.#progressTimeoutID = window.setTimeout(() => {
                    let bsAlert = bootstrap.Alert.getOrCreateInstance(this);
                    bsAlert.close();
                }, progressDelay * 1000);
            }, this.#setupDelay * 1000);

            this.addEventListener("closed.bs.alert", () => {
                this.#clearTimeouts();
            });

            window.addEventListener("beforeunload", () => {
                this.#clearTimeouts();
            });
        }
    }

    #clearTimeouts() {
        window.clearTimeout(this.#progressTimeoutID);
        window.clearTimeout(this.#setupTimeoutID);
    }

    connectedCallback() {
        this.#loadFromAttributes();

        let flashParams = FLASH_MESSAGE_DATA[this.#category];

        this.classList.add("alert", `alert-${flashParams["css"]}`, "fade", "show", "shadow", "p-0", "app-flash-message");
        this.setAttribute("role", "alert");

        if (this.#delay) {
            let progressElmt = document.createElement("div");
            progressElmt.classList.add("progress");
            this.#progressBarElmt = document.createElement("div");
            this.#progressBarElmt.classList.add("progress-bar", `bg-${flashParams["css"]}`, "bg-opacity-75");
            this.#progressBarElmt.setAttribute("role", "progressbar");
            this.#progressBarElmt.style.width = "0%";
            this.#progressBarElmt.setAttribute("aria-valuenow", 0);
            this.#progressBarElmt.setAttribute("aria-valuemin", 0);
            this.#progressBarElmt.setAttribute("aria-valuemax", 100);
            progressElmt.appendChild(this.#progressBarElmt);
            this.appendChild(progressElmt);
        }

        let messageBodyContainerElmt = document.createElement("div");
        messageBodyContainerElmt.classList.add("p-3", "me-4");
        this.appendChild(messageBodyContainerElmt);

        let messageContentElmt = document.createElement("div");
        messageContentElmt.classList.add("d-flex", "gap-2");
        messageBodyContainerElmt.appendChild(messageContentElmt);

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", `bi-${flashParams["icon"]}`);
        messageContentElmt.appendChild(iconElmt);

        let textElmt = document.createElement("div");
        textElmt.classList.add("text-break");
        textElmt.innerHTML = this.#message;
        messageContentElmt.appendChild(textElmt);

        if (this.#validationErrors) {
            messageBodyContainerElmt.appendChild(FlashMessage.createValidationErrorsElement(this.#validationErrors));
        }

        if (this.#isDismissible) {
            this.classList.add("alert-dismissible");

            let closeBtnElmt = document.createElement("button");
            closeBtnElmt.classList.add("btn-close");
            closeBtnElmt.setAttribute("data-bs-dismiss", "alert");
            closeBtnElmt.setAttribute("aria-label", "close");
            this.appendChild(closeBtnElmt);
        }

        this.#initEventListeners();
    }

    static createValidationErrorsElement(validationErrors) {
        let containerElmt = document.createElement("div");

        if (validationErrors._general != null && typeof(validationErrors._general) === "string") {
            validationErrors._general = [validationErrors._general];
        }
        if (Array.isArray(validationErrors._general)) {
            for (let generalError of validationErrors._general) {
                let generalErrorElmt = document.createElement("p");
                generalErrorElmt.classList.add("fst-italic", "mb-0");
                generalErrorElmt.innerText = generalError;
                containerElmt.appendChild(generalErrorElmt);
            }
            delete validationErrors._general;
        }

        if (Object.keys(validationErrors).length > 0) {
            let validationErrorsContainerElmt = document.createElement("dl");
            validationErrorsContainerElmt.classList.add("row", "ms-2", "mb-0");
            containerElmt.appendChild(validationErrorsContainerElmt);

            for (let [index, [fieldName, fieldErrors]] of Object.entries(Object.entries(validationErrors))) {
                let isLastItem = (index == Object.keys(validationErrors).length - 1);

                let fieldNameElmt = document.createElement("dt");
                fieldNameElmt.classList.add("col-4");
                fieldNameElmt.innerText = fieldName;
                validationErrorsContainerElmt.appendChild(fieldNameElmt);

                let fieldErrorsElmt = document.createElement("dd");
                fieldErrorsElmt.classList.add("col-8");
                if (isLastItem) {
                    fieldErrorsElmt.classList.add("mb-0");
                }
                validationErrorsContainerElmt.appendChild(fieldErrorsElmt);

                let _fieldErrors = fieldErrors;
                if (isDict(fieldErrors)) {
                    _fieldErrors = [];
                    for (let fieldErrs of Object.values(fieldErrors)) {
                        if (Array.isArray(fieldErrs)) {
                            _fieldErrors.push(...fieldErrs);
                        }
                        else {
                            _fieldErrors.push(fieldErrs);
                        }
                    }
                }

                for (let fieldError of _fieldErrors) {
                    let fieldErrorElmt = document.createElement("p");
                    fieldErrorElmt.classList.add("fst-italic", "mb-0");
                    fieldErrorElmt.innerText = fieldError;
                    fieldErrorsElmt.appendChild(fieldErrorElmt);
                }
            }
        }

        return containerElmt;
    }
}


if (window.customElements.get("app-flash-message") == null) {
    window.customElements.define("app-flash-message", FlashMessage, { extends: "div" });
}

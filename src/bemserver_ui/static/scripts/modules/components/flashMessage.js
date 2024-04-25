import { Parser } from "/static/scripts/modules/tools/parser.js";


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
}


if (window.customElements.get("app-flash-message") == null) {
    window.customElements.define("app-flash-message", FlashMessage, { extends: "div" });
}

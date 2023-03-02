import { Parser } from "../tools/parser.js";


export const FlashMessageTypes = Object.freeze({
    MESSAGE: Symbol("message"),
    INFO: Symbol("info"),
    WARNING: Symbol("warning"),
    ERROR: Symbol("error"),
    SUCCESS: Symbol("success"),
});


export class FlashMessage extends HTMLDivElement {

    #messageType = FlashMessageTypes.MESSAGE;
    #messageText = "";
    #isDismissible = false;
    #isTimed = true;
    #delay = 7;

    #messageClass = "primary";
    #messageIcon = "chat-text";

    #progressBarElmt = null;

    constructor(options = {}) {
        super();

        this.#messageType = this.#getMessageTypeOrDefault(options.type);
        this.#messageText = options.text != null ? options.text : "";
        this.#isDismissible = Parser.parseBoolOrDefault(options.isDismissible, this.#isDismissible);
        this.#isTimed = Parser.parseBoolOrDefault(options.isTimed, this.#isTimed);
        this.#delay = Parser.parseIntOrDefault(options.delay, this.#delay);

        this.#initMessageTypeData();
    }

    #getMessageTypeOrDefault(msgType, defaultValue = FlashMessageTypes.MESSAGE) {
        if (msgType != null) {
            if (Object.values(FlashMessageTypes).includes(msgType)) {
                return msgType;
            }
            else if (Object.keys(FlashMessageTypes).includes(msgType.toUpperCase())) {
                return FlashMessageTypes[msgType.toUpperCase()];
            }
        }
        return defaultValue;
    }

    #initMessageTypeData() {
        switch (this.#messageType) {
            case FlashMessageTypes.MESSAGE:
                this.#messageClass = "primary";
                this.#messageIcon = "chat-text";
                break;
            case FlashMessageTypes.INFO:
                this.#messageClass = "info";
                this.#messageIcon = "info-square";
                break;
            case FlashMessageTypes.WARNING:
                this.#messageClass = "warning";
                this.#messageIcon = "exclamation-triangle";
                break;
            case FlashMessageTypes.ERROR:
                this.#messageClass = "danger";
                this.#messageIcon = "x-octagon";
                break;
            case FlashMessageTypes.SUCCESS:
                this.#messageClass = "success";
                this.#messageIcon = "check-circle";
                break;
            default:
                this.#messageClass = "primary";
                this.#messageIcon = "chat-text";
                break;
        }
    }

    #initOverrideFromAttributes() {
        if (this.hasAttribute("data-type")) {
            this.#messageType = this.#getMessageTypeOrDefault(this.getAttribute("data-type"));
        }
        if (this.hasAttribute("data-text")) {
            this.#messageText = this.getAttribute("data-text");
        }
        if (this.hasAttribute("data-dismiss")) {
            this.#isDismissible = Parser.parseBoolOrDefault(this.getAttribute("data-dismiss"), this.#isDismissible);
        }
        if (this.hasAttribute("data-delay")) {
            this.#delay = Parser.parseIntOrDefault(this.getAttribute("data-delay"), this.#delay);
        }

        this.#initMessageTypeData();
    }

    #initEventListeners() {
        if (this.#isTimed) {
            let innerTimeoutId = null;
            let mainTimeoutId = window.setTimeout(() => {
                this.#progressBarElmt.style.width = "100%";
                this.#progressBarElmt.style.transition = `width ${this.#delay}s linear`;
    
                innerTimeoutId = window.setTimeout(() => {
                    let bsAlert = bootstrap.Alert.getOrCreateInstance(this);
                    bsAlert.close();
                }, this.#delay * 1000);
            }, 100);

            this.addEventListener("closed.bs.alert", () => {
                window.clearTimeout(innerTimeoutId);
                window.clearTimeout(mainTimeoutId);
            });
        }
    }

    connectedCallback() {
        this.#initOverrideFromAttributes();

        this.classList.add("alert", `alert-${this.#messageClass}`, "fade", "show", "shadow", "p-0");
        this.setAttribute("role", "alert");

        if (this.#isTimed) {
            let progressElmt = document.createElement("div");
            progressElmt.classList.add("progress");
            progressElmt.style.height = "2px";
            this.#progressBarElmt = document.createElement("div");
            this.#progressBarElmt.classList.add("progress-bar", `bg-${this.#messageClass}`, "bg-opacity-75");
            this.#progressBarElmt.setAttribute("role", "progressbar");
            this.#progressBarElmt.style.width = "0%";
            this.#progressBarElmt.setAttribute("aria-valuenow", 0);
            this.#progressBarElmt.setAttribute("aria-valuemin", 0);
            this.#progressBarElmt.setAttribute("aria-valuemax", 100);
            progressElmt.appendChild(this.#progressBarElmt);
            this.appendChild(progressElmt);
        }

        let messageContainerElmt = document.createElement("div");
        messageContainerElmt.classList.add("p-3", "me-4");
        this.appendChild(messageContainerElmt);

        let messageHeaderContainerElmt = document.createElement("div");
        messageHeaderContainerElmt.classList.add("hstack", "align-items-start", "gap-2");
        messageContainerElmt.appendChild(messageHeaderContainerElmt);

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", `bi-${this.#messageIcon}`);
        messageHeaderContainerElmt.appendChild(iconElmt);

        let textElmt = document.createElement("div");
        textElmt.classList.add("text-break");
        textElmt.innerHTML = this.#messageText;
        messageHeaderContainerElmt.appendChild(textElmt);

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

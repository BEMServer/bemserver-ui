import { Parser } from "../tools/parser.js";


const FlashMessageTypes = Object.freeze({
    MESSAGE: Symbol("message"),
    INFO: Symbol("info"),
    WARNING: Symbol("warning"),
    ERROR: Symbol("error"),
    SUCCESS: Symbol("success"),
});


class FlashMessage extends HTMLDivElement {

    #messageType = FlashMessageTypes.MESSAGE;
    #messageText = "";
    #isDismissible = false;

    #messageClass = "primary";
    #messageIcon = "chat-text";

    constructor(options = {}) {
        super();

        this.#messageType = this.#getMessageTypeOrDefault(options.type);
        this.#messageText = options.text != null ? options.text : "";
        this.#isDismissible = options.isDismissible != undefined ? options.isDismissible : false;

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

        this.#initMessageTypeData();
    }

    connectedCallback() {
        this.#initOverrideFromAttributes();

        this.classList.add("alert", `alert-${this.#messageClass}`, "fade", "show");
        this.setAttribute("role", "alert");

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", `bi-${this.#messageIcon}`, "me-2");
        this.appendChild(iconElmt);

        let textElmt = document.createElement("span");
        textElmt.innerText = this.#messageText;
        this.appendChild(textElmt);

        if (this.#isDismissible) {
            this.classList.add("alert-dismissible");

            let closeBtnElmt = document.createElement("button");
            closeBtnElmt.classList.add("btn-close");
            closeBtnElmt.setAttribute("data-bs-dismiss", "alert");
            closeBtnElmt.setAttribute("aria-label", "close");
            this.appendChild(closeBtnElmt);
        }
    }
}


customElements.define("app-flash-message", FlashMessage, { extends: "div" });


export { FlashMessage, FlashMessageTypes } ;

export class ModalConfirm extends HTMLElement {

    #targetId = null;
    #message = "";
    #okCallback = null;
    #cancelCallback = null;
    #keyboard = false;

    #modalElmt = null;
    #modalMessageContainerElmt = null;
    #modalOkBtnElmt = null;
    #modalCancelBtnElmt = null;

    get message() {
        return this.#message;
    }

    set message(value) {
        this.#message = value;
        this.#updateMessage();
    }

    constructor(targetId, message, okCallback=null, cancelCallback=null, keyboard=false) {
        super();

        this.#targetId = targetId;
        this.#okCallback = okCallback;
        this.#cancelCallback = cancelCallback;
        this.#keyboard = keyboard;

        this.modalId = `modalConfirm-${this.#targetId}`;
        this.#message = message;

        this.#modalElmt = null;
        this.#modalOkBtnElmt = null;
        this.#modalCancelBtnElmt = null;
    }

    #updateMessage() {
        this.#modalMessageContainerElmt.innerHTML = this.#message;
    }

    #createModalElement() {
        let modalElmt = document.createElement("div");
        modalElmt.id = this.modalId;
        modalElmt.classList.add("modal", "fade");
        modalElmt.setAttribute("data-bs-backdrop", "static");
        modalElmt.setAttribute("data-bs-keyboard", this.#keyboard);
        modalElmt.setAttribute("tabindex", "-1");
        modalElmt.setAttribute("aria-labelledby", `modalConfirmTitle-${this.#targetId}`);
        modalElmt.setAttribute("aria-hidden", true);

        let modalDialogElmt = document.createElement("div");
        modalDialogElmt.classList.add("modal-dialog", "modal-dialog-centered", "modal-dialog-scrollable");
        modalElmt.appendChild(modalDialogElmt);

        let modalContentElmt = document.createElement("div");
        modalContentElmt.classList.add("modal-content");
        modalDialogElmt.appendChild(modalContentElmt);

        let modalHeaderElmt = document.createElement("div");
        modalHeaderElmt.classList.add("modal-header");
        modalContentElmt.appendChild(modalHeaderElmt);

        let modalTitleElmt = document.createElement("h5");
        modalTitleElmt.id = `modalConfirmTitle-${this.#targetId}`;
        modalTitleElmt.classList.add("modal-title", "font-monospace");
        modalTitleElmt.textContent = "Action confirmation";
        modalHeaderElmt.appendChild(modalTitleElmt);

        let modalCloseBtnElmt = document.createElement("button");
        modalCloseBtnElmt.classList.add("btn-close");
        modalCloseBtnElmt.setAttribute("type", "button");
        modalCloseBtnElmt.setAttribute("data-bs-dismiss", "modal");
        modalCloseBtnElmt.setAttribute("aria-label", "Close");
        modalHeaderElmt.appendChild(modalCloseBtnElmt);

        let modalBodyElmt = document.createElement("div");
        modalBodyElmt.classList.add("modal-body");
        modalContentElmt.appendChild(modalBodyElmt);

        this.#modalMessageContainerElmt = document.createElement("p");
        this.#modalMessageContainerElmt.id = `${this.modalId}-message`;
        this.#updateMessage();
        modalBodyElmt.appendChild(this.#modalMessageContainerElmt);

        let modalMessageConfirmElmt = document.createElement("p");
        modalMessageConfirmElmt.classList.add("fw-bold");
        modalMessageConfirmElmt.textContent = "Do you confirm this action?";
        modalBodyElmt.appendChild(modalMessageConfirmElmt);

        let modalFooterElmt = document.createElement("div");
        modalFooterElmt.classList.add("modal-footer");
        modalContentElmt.appendChild(modalFooterElmt);

        this.#modalCancelBtnElmt = document.createElement("button");
        this.#modalCancelBtnElmt.classList.add("btn", "btn-sm", "btn-outline-secondary");
        this.#modalCancelBtnElmt.setAttribute("type", "button");
        this.#modalCancelBtnElmt.setAttribute("data-bs-dismiss", "modal");
        this.#modalCancelBtnElmt.textContent = "Cancel";
        modalFooterElmt.appendChild(this.#modalCancelBtnElmt);

        this.#modalOkBtnElmt = document.createElement("button");
        this.#modalOkBtnElmt.classList.add("btn", "btn-sm", "btn-primary");
        this.#modalOkBtnElmt.setAttribute("type", "button");
        this.#modalOkBtnElmt.textContent = "OK";
        modalFooterElmt.appendChild(this.#modalOkBtnElmt);

        return modalElmt;
    }

    #initEventListeners() {
        this.#modalCancelBtnElmt.addEventListener("click", () => {
            this.#cancelCallback?.();
        });

        this.#modalOkBtnElmt.addEventListener("click", () => {
            this.#okCallback?.();
            this.hide();
        });
    }

    connectedCallback() {
        this.innerHTML = "";

        this.#modalElmt = this.#createModalElement();
        this.appendChild(this.#modalElmt);

        this.#initEventListeners();
    }

    show() {
        bootstrap.Modal.getOrCreateInstance(this.#modalElmt).show();
    }

    hide() {
        bootstrap.Modal.getOrCreateInstance(this.#modalElmt).hide();
    }
}


if (window.customElements.get("app-modal-confirm") == null) {
    window.customElements.define("app-modal-confirm", ModalConfirm);
}

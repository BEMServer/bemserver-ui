export class ModalConfirm extends HTMLElement {

    #targetId = null;
    #modalElmt = null;
    #okCallback = null;
    #cancelCallback = null;
    #keyboard = false;

    #message = "";

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
        this.#modalElmt = null;
        this.#okCallback = okCallback;
        this.#cancelCallback = cancelCallback;
        this.#keyboard = keyboard;

        this.modalId = `modalConfirm-${this.#targetId}`;
        this.#message = message;
    }

    #updateMessage() {
        let messageElmt = this.querySelector(`p[id="${this.modalId}-message"]`);
        messageElmt.innerHTML = this.#message;
    }

    connectedCallback() {
        this.render();

        this.#modalElmt = this.querySelector(`div[id=${this.modalId}]`);
        if (this.#cancelCallback != null) {
            this.#modalElmt.querySelector("button[data-modal-confirm-cancel]").addEventListener("click", () => {
                this.#cancelCallback();
            });
        }
        if (this.#okCallback != null) {
            this.#modalElmt.querySelector("button[data-modal-confirm-ok]").addEventListener("click", () => {
                this.#okCallback();
                this.hide();
            });
        }
    }

    render() {
        this.innerHTML = `<div class="modal fade" id="${this.modalId}" data-bs-backdrop="static" data-bs-keyboard="${this.#keyboard}" tabindex="-1" aria-labelledby="modalConfirmTitle-${this.#targetId}" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title font-monospace" id="modalConfirmTitle-${this.#targetId}">Action confirmation</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p id="${this.modalId}-message">${this.#message}</p>
                <p class="fw-bold">Do you confirm this action?</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal" data-modal-confirm-cancel>Cancel</button>
                <button type="button" class="btn btn-sm btn-primary" data-modal-confirm-ok>OK</button>
            </div>
        </div>
    </div>
</div>`;
    }

    show() {
        bootstrap.Modal.getOrCreateInstance(this.#modalElmt).show();
    }

    hide() {
        bootstrap.Modal.getOrCreateInstance(this.#modalElmt).hide();
    }
}


if (window.customElements.get("modal-confirm") == null) {
    window.customElements.define("modal-confirm", ModalConfirm);
}

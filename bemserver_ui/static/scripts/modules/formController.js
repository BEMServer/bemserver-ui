import { ModalConfirm } from "./modalConfirm.js";


class FormController {

    #formElmts = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#formElmts = [].slice.call(document.querySelectorAll("form[data-modal-confirm-message]"));
    }

    bind() {
        // In current page, iterate through every form that contains a "data-modal-confirm-message" attribute.
        this.#formElmts.forEach(function (formElmt) {

            // Add a modal confirm component for this form, defining an "ok" callback function.
            let modalConfirm = new ModalConfirm(formElmt.id, formElmt.getAttribute("data-modal-confirm-message"), function() { formElmt.submit(); });
            formElmt.appendChild(modalConfirm);
            
            // Add an event listener to display a confirm message on form submit.
            formElmt.addEventListener("submit", function(event) {
                // Stop submit.
                event.preventDefault();
                // And display modal.
                this.show();
            }.bind(modalConfirm));
        });
    }
}


export { FormController };

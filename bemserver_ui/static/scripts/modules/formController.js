import { ModalConfirm } from "./modalConfirm.js";


class FormController {

    connectModalConfirm() {
        // In current page, search every form that contains a "data-modal-confirm-message" attribute.
        document.querySelectorAll("form[data-modal-confirm-message]").forEach(function (formElmt) {
            // And display a confirm message on form submit.
            formElmt.addEventListener("submit", function(event) {
                event.preventDefault();

                // Add a modal confirm component for this form, defining an "ok" callback function.
                let modalConfirm = new ModalConfirm(formElmt.id, formElmt.getAttribute("data-modal-confirm-message"), function() { formElmt.submit(); });
                formElmt.appendChild(modalConfirm);

                // Finally display modal.
                modalConfirm.show();
            }, false);
        });
    }
}


export { FormController };

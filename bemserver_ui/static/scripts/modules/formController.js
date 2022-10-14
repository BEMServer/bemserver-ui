import { ModalConfirm } from "./components/modalConfirm.js";


export class FormController {

    #confirmFormElmts = null;
    #requiredInputElmts = null;
    #minMaxInputElmts = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#confirmFormElmts = [].slice.call(document.querySelectorAll(`form[data-modal-confirm-message]`));
        this.#requiredInputElmts = [].slice.call(document.querySelectorAll(`input:required, select:required, div[is^="app-"][required]`));
        this.#minMaxInputElmts = [].slice.call(document.querySelectorAll(`input[minlength], input[maxlength], textarea[minlength], textarea[maxlength]`));
    }

    #getRequiredLabelElmt() {
        let requiredLabelElmt = document.createElement("small");
        requiredLabelElmt.classList.add("fst-italic", "text-danger", "ms-2", "fade-in");
        requiredLabelElmt.textContent = "* (required)";
        return requiredLabelElmt;
    }

    #getMinMaxLabelElmt(minLength, maxLength) {
        let texts = new Array();
        if (minLength != null) {
            texts.push(`min. ${minLength} character${minLength > 1 ? "s" : ""}`);
        }
        if (maxLength != null) {
            texts.push(`max. ${maxLength} character${maxLength > 1 ? "s": ""}`);
        }

        let minMaxText = ``;
        if (texts.length > 0) {
            minMaxText = `(${texts.join(", ")})`;
        }

        let minMaxLabelElmt = document.createElement("small");
        minMaxLabelElmt.classList.add("fst-italic", "text-muted", "fade-in");
        minMaxLabelElmt.textContent = minMaxText;
        return minMaxLabelElmt;
    }

    bind() {
        // In current page, iterate through every form that contains a "data-modal-confirm-message" attribute.
        for (let confirmFormElmt of this.#confirmFormElmts) {
            // Add a modal confirm component for this form, defining an "ok" callback function.
            let modalConfirm = new ModalConfirm(confirmFormElmt.id, confirmFormElmt.getAttribute("data-modal-confirm-message"), () => { confirmFormElmt.submit(); });
            document.body.appendChild(modalConfirm);

            // Add an event listener to display a confirm message on form submit.
            confirmFormElmt.addEventListener("submit", (event) => {
                // Stop submit.
                event.preventDefault();
                // And display modal.
                modalConfirm.show();
            });
        }

        // Mark every required input field with red asterisk.
        for (let requiredInputElmt of this.#requiredInputElmts) {
            let requiredInputLabelElmt = document.querySelector(`label[for="${requiredInputElmt.id}"]`) || requiredInputElmt.querySelector(`h6`);
            requiredInputLabelElmt?.appendChild(this.#getRequiredLabelElmt());
        }

        // Add min/max length of inputs.
        for (let minMaxInputElmt of this.#minMaxInputElmts) {
            let minLength = minMaxInputElmt.getAttribute("minlength");
            let maxLength = minMaxInputElmt.getAttribute("maxlength");
            minMaxInputElmt.parentElement.appendChild(this.#getMinMaxLabelElmt(minLength, maxLength));
        }
    }
}

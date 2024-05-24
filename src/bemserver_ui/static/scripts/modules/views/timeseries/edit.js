class TimeseriesEditView {

    #availablePropertySelectElmt = null;
    #availablePropertyInputElmt = null;
    #availablePropertyValueTypeElmt = null;
    #availablePropertyDescriptionElmt = null;
    #addPropertyModalElmt = null;

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#availablePropertySelectElmt = document.getElementById("availableProperty");
        this.#availablePropertyInputElmt = document.getElementById("availablePropertyValue");
        this.#availablePropertyValueTypeElmt = document.getElementById("availablePropertyValueType");
        this.#availablePropertyDescriptionElmt = document.getElementById("availablePropertyDescription");
        this.#addPropertyModalElmt = document.getElementById("addProperty");
    }

    #initEventListeners() {
        this.#availablePropertySelectElmt.addEventListener("change", () => {
            this.#updatePropertyDescription();
        });

        this.#addPropertyModalElmt.addEventListener("shown.bs.modal", () => {
            this.#availablePropertyInputElmt.focus();
        });
    }

    #updatePropertyDescription() {
        if (this.#availablePropertySelectElmt.selectedIndex != -1) {
            let selectedProperty = this.#availablePropertySelectElmt.selectedOptions[0];
            let propertyType = selectedProperty.getAttribute("data-property-type", "string");

            this.#availablePropertyInputElmt.removeAttribute("readonly");
            this.#availablePropertyInputElmt.removeAttribute("maxlength");
            this.#availablePropertyInputElmt.removeAttribute("required");
            this.#availablePropertyInputElmt.removeAttribute("step");
            this.#availablePropertyInputElmt.removeAttribute("role");
            this.#availablePropertyInputElmt.classList.replace("form-check-input", "form-control");
            this.#availablePropertyInputElmt.parentElement.className = "";

            this.#availablePropertyValueTypeElmt.value = propertyType;

            switch (propertyType) {
                case "string":
                    this.#availablePropertyInputElmt.type = "text";
                    this.#availablePropertyInputElmt.setAttribute("maxlength", 100);
                    this.#availablePropertyInputElmt.setAttribute("required", true);
                    break;
                case "integer":
                    this.#availablePropertyInputElmt.type = "number";
                    this.#availablePropertyInputElmt.setAttribute("required", true);
                    break;
                case "float":
                    this.#availablePropertyInputElmt.type = "number";
                    this.#availablePropertyInputElmt.setAttribute("step", 0.01);
                    this.#availablePropertyInputElmt.setAttribute("required", true);
                    break;
                case "boolean":
                    this.#availablePropertyInputElmt.classList.replace("form-control", "form-check-input");
                    this.#availablePropertyInputElmt.type = "checkbox";
                    this.#availablePropertyInputElmt.setAttribute("role", "switch");
                    this.#availablePropertyInputElmt.parentElement.classList.add("form-check", "form-switch");
                    break;
            }

            this.#availablePropertyInputElmt.focus();
            this.#availablePropertyDescriptionElmt.innerHTML = [selectedProperty.getAttribute("data-property-description"), propertyType].filter(Boolean).join(", ");
        }
        else {
            this.#availablePropertyInputElmt.setAttribute("readonly", true);
            this.#availablePropertyDescriptionElmt.innerHTML = "";
        }
    }

    mount() {
        this.#updatePropertyDescription();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeseriesEditView();
    view.mount();
});

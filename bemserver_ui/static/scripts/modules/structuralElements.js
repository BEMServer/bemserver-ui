import { Fetcher } from "./fetcher.js";


class StructuralElements {

    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("properties-tabcontent");
    }

    #renderSpinners() {
        let spinnerHTML = `<div class="d-flex justify-content-center my-3">
    <div class="spinner-border text-secondary" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
</div>`;

        this.#generalTabContentElmt.innerHTML = spinnerHTML;
        this.#propertiesTabContentElmt.innerHTML = spinnerHTML;
    }

    #renderGeneral(data) {
        this.#generalTabContentElmt.innerHTML = `<h5 class="mb-3">${data.general.name}</h5>
<p class="fst-italic">${data.general.description}</p>
<dl class="row opacity-50">
    <dt class="col-2">IFC ID</dt>
    <dd class="col-10">${data.general.ifc_id != null ? data.general.ifc_id : "-"}</dd>
</dl>`;
    }

    #renderProperties(data) {
        let propertiesHTML = ``;
        for (let property of data.properties) {
            let propertyHelp = property.description != "" ? ` <sup><abbr title="${property.description}"><i class="bi bi-question-diamond"></i></abbr><sup>` : ``;
            propertiesHTML += `<dt class="col-2">${property.name}${propertyHelp}</dt>`;
            propertiesHTML += `<dd class="col-10">${(property.value != "" && property.value != null) ? property.value : "-"}</dd>`;
        }

        this.#propertiesTabContentElmt.innerHTML = `<h5 class="mb-3">${data.general.name}</h5>
<dl class="row">
    ${propertiesHTML}
</dl>`;
    }

    #renderError(error) {
        let errorHTML = `<div class="alert alert-danger" role="alert">
    <i class="bi bi-x-octagon me-2"></i>
    ${error}
</div>`;

        this.#generalTabContentElmt.innerHTML = errorHTML;
        this.#propertiesTabContentElmt.innerHTML = errorHTML;
    }

    renderNoData() {
        this.#generalTabContentElmt.innerHTML = "";
        this.#propertiesTabContentElmt.innerHTML = "";
    }

    renderData(selectedItemUrl) {
        this.#renderSpinners();
        if (selectedItemUrl) {
            let fetcher = new Fetcher();
            fetcher.get(selectedItemUrl).then(
                (data) => {
                    this.#renderGeneral(data);
                    this.#renderProperties(data);
                }
            ).catch(
                (error) => {
                    this.#renderError(error.message);
                }
            );
        }
        else {
            this.renderNoData();
        }
    }
}


export { StructuralElements };

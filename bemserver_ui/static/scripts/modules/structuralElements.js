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
        this.#generalTabContentElmt.innerHTML = `<p class="fw-bold">${data.general.name}</p>
<p class="fst-italic">${data.general.description}</p>`;
    }

    #renderProperties(data) {
        this.#propertiesTabContentElmt.innerHTML = `<p class="fw-bold">${data.general.name}</p>
<p>${data.properties}</p>`;
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

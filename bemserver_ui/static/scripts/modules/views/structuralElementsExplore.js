import { Fetcher } from "../fetcher.js";
import { flaskES6, signedUser } from "../../app.js";
import { Spinner } from "./spinner.js";


class StructuralElementsExploreView {

    #tabSitesElmts = null;
    #tabPropertiesElmts = null;
    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;

    #tabSitesSelected = null;
    #tabPropertiesSelected = null;

    #selectedItemsPerTab = {};
    #renderPerTab = {
        "general-tab": this.#renderGeneral.bind(this),
        "properties-tab": this.#renderProperties.bind(this),
    }
    #alreadyLoadedPerTab = {};

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#tabSitesElmts = [].slice.call(document.querySelectorAll("#tabSites button[data-bs-toggle='tab']"));
        this.#tabPropertiesElmts = [].slice.call(document.querySelectorAll("#tabProperties button[data-bs-toggle='tab']"));
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("properties-tabcontent");
    }

    #initEventListeners() {
        for (let tabElmt of this.#tabSitesElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabSitesSelected = tabElmt;
            }
            this.#selectedItemsPerTab[tabElmt.id] = null;
            tabElmt.addEventListener("shown.bs.tab", function (event) {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabSitesSelected = event.target;
                for (let tabPropertyElmt of this.#tabPropertiesElmts) {
                    this.#alreadyLoadedPerTab[tabPropertyElmt.id] = false;
                }
                this.refresh();
            }.bind(this));
        }

        for (let tabElmt of this.#tabPropertiesElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabPropertiesSelected = tabElmt;
            }
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
            tabElmt.addEventListener("shown.bs.tab", function (event) {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabPropertiesSelected = event.target;
                this.refresh();
            }.bind(this));
        }
    }

    #getEditBtnHTML(type, id, tab=null) {
        if (signedUser.is_admin) {
            let editUrlParams = {type: type, id: id};
            if (tab != null) {
                editUrlParams["tab"] = tab;
            }
            try {
                let editUrl = flaskES6.urlFor(`structural_elements.edit`, editUrlParams);
                return `<a class="btn btn-sm btn-outline-primary ms-auto" href="${editUrl}" role="button" title="Edit ${type}"><i class="bi bi-pencil"></i> Edit</a>`;
            }
            catch (error) {
                console.error(error);
            }
        }
        return ``;
    }

    #getGeneralHTML(data) {
        return `<div class="d-flex justify-content-between align-items-center mb-3">
    <h5>${data.structural_element.name}</h5>
    ${this.#getEditBtnHTML(data.type, data.structural_element.id)}
</div>
<p class="fst-italic">${data.structural_element.description}</p>
<dl class="row opacity-50">
    <dt class="col-2">IFC ID</dt>
    <dd class="col-10">${(data.structural_element.ifc_id != null && data.structural_element.ifc_id != "") ? data.structural_element.ifc_id : "-"}</dd>
</dl>`;
    }

    #getPropertiesHTML(data, id) {
        let propertyDataHTML = ``;
        if (data.properties.length > 0) {
            for (let property of data.properties) {
                let propertyHelp = property.description != "" ? ` <sup><abbr title="${property.description}"><i class="bi bi-question-diamond"></i></abbr><sup>` : ``;
                propertyDataHTML += `<dt class="col-3">${property.name}${propertyHelp}</dt>`;
                propertyDataHTML += `<dd class="col-9">${(property.value != "" && property.value != null) ? property.value : "-"}</dd>`;
            }
        }
        else {
            propertyDataHTML = `<p class="fst-italic">No data</p>`;
        }

        return `<div class="d-flex justify-content-between align-items-center mb-3">
    ${this.#getEditBtnHTML(data.type, id, "properties")}
</div>
<dl class="row">
    ${propertyDataHTML}
</dl>`;
    }

    #getErrorHTML(error) {
        return `<div class="alert alert-danger" role="alert">
    <i class="bi bi-x-octagon me-2"></i>
    ${error}
</div>`;
    }

    #renderNoData() {
        this.#generalTabContentElmt.innerHTML = "";
        this.#propertiesTabContentElmt.innerHTML = "";
    }

    #renderGeneral(id, type) {
        this.#generalTabContentElmt.innerHTML = "";
        let spinner = new Spinner();
        this.#generalTabContentElmt.appendChild(spinner);

        let retrieveDataUrl = flaskES6.urlFor(`api.structural_elements.retrieve_data`, {type: type, id: id});
        let fetcher = new Fetcher();
        fetcher.get(retrieveDataUrl).then(
            (data) => {
                this.#generalTabContentElmt.innerHTML = this.#getGeneralHTML(data);
            }
        ).catch(
            (error) => {
                this.#generalTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            }
        );
    }

    #renderProperties(id, type) {
        this.#propertiesTabContentElmt.innerHTML = "";
        let spinner = new Spinner();
        this.#propertiesTabContentElmt.appendChild(spinner);

        let retrievePropertiesUrl = flaskES6.urlFor(`api.structural_elements.retrieve_property_data`, {type: type, id: id});
        let fetcher = new Fetcher();
        fetcher.get(retrievePropertiesUrl).then(
            (data) => {
                this.#propertiesTabContentElmt.innerHTML = this.#getPropertiesHTML(data, id);
            }
        ).catch(
            (error) => {
                this.#propertiesTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            }
        );
    }

    render(id, type) {
        this.#selectedItemsPerTab[this.#tabSitesSelected.id] = {id: id, type: type};
        for (let tabElmt of this.#tabPropertiesElmts) {
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
        }
        this.refresh();
    }

    refresh() {
        let selectedItemData = this.#selectedItemsPerTab[this.#tabSitesSelected.id];
        if (selectedItemData != null) {
            if (!this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id]) {
                this.#renderPerTab[this.#tabPropertiesSelected.id]?.call(this, selectedItemData.id, selectedItemData.type);
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = true;
            }
        }
        else {
            this.#renderNoData();
        }
    }
}


export { StructuralElementsExploreView };

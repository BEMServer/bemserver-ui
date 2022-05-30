import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";


class StructuralElementsExploreView {

    #tabSitesElmts = null;
    #tabPropertiesElmts = null;
    #tabTimeseriesElmts = null;
    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;
    #timeseriesTabContentElmt = null;

    #tabSitesSelected = null;
    #tabPropertiesSelected = null;
    #tabTimeseriesSelected = null;

    #selectedItemsPerTab = {};
    #renderPerTab = {
        "general-tab": this.#renderGeneral.bind(this),
        "properties-tab": this.#renderProperties.bind(this),
        "timeseries-tab": this.#renderTimeseries.bind(this),
    }
    #alreadyLoadedPerTab = {};

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#tabSitesElmts = [].slice.call(document.querySelectorAll("#tabSites button[data-bs-toggle='tab']"));
        this.#tabPropertiesElmts = [].slice.call(document.querySelectorAll("#tabProperties button[data-bs-toggle='tab']"));
        this.#tabTimeseriesElmts = [].slice.call(document.querySelectorAll("#tabTimeseries button[data-bs-toggle='tab']"));
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("properties-tabcontent");
        this.#timeseriesTabContentElmt = document.getElementById("timeseries-tabcontent");
    }

    #initEventListeners() {
        for (let tabElmt of this.#tabSitesElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabSitesSelected = tabElmt;
            }
            this.#selectedItemsPerTab[tabElmt.id] = null;
            tabElmt.addEventListener("shown.bs.tab", (event) => {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabSitesSelected = event.target;
                for (let tabPropertyElmt of this.#tabPropertiesElmts) {
                    this.#alreadyLoadedPerTab[tabPropertyElmt.id] = false;
                }
                this.refresh();
            });
        }

        for (let tabElmt of this.#tabPropertiesElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabPropertiesSelected = tabElmt;
            }
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
            tabElmt.addEventListener("shown.bs.tab", (event) => {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabPropertiesSelected = event.target;
                this.refresh();
            });
        }

        for (let tabElmt of this.#tabTimeseriesElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabTimeseriesSelected = tabElmt;
            }
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
            tabElmt.addEventListener("shown.bs.tab", (event) => {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabTimeseriesSelected = event.target;
                this.refresh();
            });
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
                return `<a class="btn btn-sm btn-outline-secondary" href="${editUrl}" role="button" title="Edit ${type}"><i class="bi bi-pencil"></i> Edit</a>`;
            }
            catch (error) {
                console.error(error);
            }
        }
        return ``;
    }

    #getGeneralHTML(data, path) {
        return `<div class="d-flex justify-content-between align-items-center mb-3">
    <div>
        <h5>${data.structural_element.name}</h5>
        <h6>${path}</h6>
    </div>
    ${this.#getEditBtnHTML(data.type, data.structural_element.id)}
</div>
<p class="fst-italic">${data.structural_element.description}</p>
<div class="row">
    <dl class="col opacity-50">
        <dt>IFC ID</dt>
        <dd>${(data.structural_element.ifc_id != null && data.structural_element.ifc_id != "") ? data.structural_element.ifc_id : "-"}</dd>
    </dl>
</div>`;
    }

    #getItemHelpHTML(itemDescription) {
        let ret = ``;
        if (itemDescription?.length > 0) {
            let abbrElmt = document.createElement("abbr");
            abbrElmt.title = itemDescription != null ? itemDescription : "";
            let abbrContentElmt = document.createElement("i");
            abbrContentElmt.classList.add("bi", "bi-question-diamond");
            abbrElmt.appendChild(abbrContentElmt);
            ret = `<sup class="ms-1">${abbrElmt.outerHTML}</sup>`;
        }
        return ret;
    }

    #getPropertiesHTML(data, id) {
        let propertyDataHTML = ``;
        if (data.properties.length > 0) {
            for (let property of data.properties) {
                propertyDataHTML += `<dl>
    <dt>${property.name}${this.#getItemHelpHTML(property.description)}</dt>
    <dd>${(property.value !== "" && property.value != null) ? property.value : "-"}</dd>
</dl>`;
            }
        }
        else {
            propertyDataHTML = `<p class="fst-italic">No data</p>`;
        }

        return `<div class="d-flex justify-content-between align-items-start mb-3">
    <div class="d-flex gap-4">
        ${propertyDataHTML}
    </div>
    ${this.#getEditBtnHTML(data.type, id, "properties")}
</div>`;
    }

    #getTimeseriesHTML(data, id) {
        let contentHTML = ``;
        if (data.timeseries.length > 0) {
            contentHTML += `<p class="text-muted text-end">Items count: ${data.timeseries.length}</p>`;
            for (let ts_data of data.timeseries) {
                let unitSymbol = (ts_data.unit_symbol != null && ts_data.unit_symbol.length > 0) ? `<span class="opacity-50 ms-1">[${ts_data.unit_symbol}]</span>` : ``;
                contentHTML += `<li><span class="fw-bold">${ts_data.name}</span>${unitSymbol}${this.#getItemHelpHTML(ts_data.description)}</li>`;
            }
        }
        else {
            contentHTML = `<p class="fst-italic">No data</p>`;
        }

        return `<ul class="list-unstyled mb-3">
    ${contentHTML}
</ul>`;
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

    #renderGeneral(id, type, path) {
        this.#generalTabContentElmt.innerHTML = "";
        this.#generalTabContentElmt.appendChild(new Spinner());

        let retrieveDataUrl = flaskES6.urlFor(`api.structural_elements.retrieve_data`, {type: type, id: id});
        let fetcher = new Fetcher();
        fetcher.get(retrieveDataUrl).then(
            (data) => {
                this.#generalTabContentElmt.innerHTML = this.#getGeneralHTML(data, path);
            }
        ).catch(
            (error) => {
                this.#generalTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            }
        );
    }

    #renderProperties(id, type, path) {
        this.#propertiesTabContentElmt.innerHTML = "";
        this.#propertiesTabContentElmt.appendChild(new Spinner());

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

    #renderTimeseries(id, type, path) {
        this.#timeseriesTabContentElmt.innerHTML = "";
        this.#timeseriesTabContentElmt.appendChild(new Spinner());

        let retrieveTimeseriesUrl = flaskES6.urlFor(`api.structural_elements.retrieve_timeseries`, {type: type, id: id});
        let fetcher = new Fetcher();
        fetcher.get(retrieveTimeseriesUrl).then(
            (data) => {
                this.#timeseriesTabContentElmt.innerHTML = this.#getTimeseriesHTML(data, id);
            }
        ).catch(
            (error) => {
                this.#timeseriesTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            }
        );
    }

    render(id, type, path) {
        this.#selectedItemsPerTab[this.#tabSitesSelected.id] = {id: id, type: type, path: path};
        for (let tabElmt of this.#tabPropertiesElmts) {
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
        }
        this.refresh();
    }

    refresh() {
        let selectedItemData = this.#selectedItemsPerTab[this.#tabSitesSelected.id];
        if (selectedItemData != null) {
            if (!this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id]) {
                this.#renderPerTab[this.#tabPropertiesSelected.id]?.call(this, selectedItemData.id, selectedItemData.type, selectedItemData.path);
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = true;
            }
        }
        else {
            this.#renderNoData();
        }
    }
}


export { StructuralElementsExploreView };

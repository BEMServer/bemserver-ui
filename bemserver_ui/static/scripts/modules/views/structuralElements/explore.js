import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";
import "../../components/itemsCount.js";
import "../../components/pagination.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";


export class StructuralElementsExploreView {

    #messagesElmt = null;

    #internalAPIRequester = null;
    #generalReqID = null;
    #propertiesReqID = null;
    #tsReqID = null;

    #tabSitesElmts = null;
    #tabPropertiesElmts = null;
    #tabTimeseriesElmts = null;
    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;

    #searchElmt = null;
    #clearSearchBtnElmt = null;
    #tsPageSizeElmt = null;
    #tsCountElmt = null;
    #tsPaginationElmt = null;
    #tsListElmt = null;

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

        this.#internalAPIRequester = new InternalAPIRequest();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#tabSitesElmts = [].slice.call(document.querySelectorAll("#tabSites button[data-bs-toggle='tab']"));
        this.#tabPropertiesElmts = [].slice.call(document.querySelectorAll("#tabProperties button[data-bs-toggle='tab']"));
        this.#tabTimeseriesElmts = [].slice.call(document.querySelectorAll("#tabTimeseries button[data-bs-toggle='tab']"));
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("properties-tabcontent");

        this.#searchElmt = document.getElementById("search");
        this.#clearSearchBtnElmt = document.getElementById("clear");
        this.#tsPageSizeElmt = document.getElementById("tsPageSize");
        this.#tsCountElmt = document.getElementById("tsCount");
        this.#tsPaginationElmt = document.getElementById("tsPagination");
        this.#tsListElmt = document.getElementById("tsListElmt");
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

        this.#searchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            if (event.target.value != "") {
                this.#clearSearchBtnElmt.classList.remove("d-none", "invisible");
            }
            else {
                this.#clearSearchBtnElmt.classList.add("d-none", "invisible");
            }

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#tsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#clearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchElmt.value = "";
            this.#clearSearchBtnElmt.classList.add("d-none", "invisible");

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.refresh();
        });

        this.#tsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
                this.#tsPaginationElmt.page = 1;
                this.refresh();
            }
        });

        this.#tsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.refresh();
        });
    }

    #getEditBtnHTML(type, id, tab=null) {
        if (signedUser.is_admin) {
            let editUrlParams = {type: type, id: id};
            if (tab != null) {
                editUrlParams["tab"] = tab;
            }
            try {
                let editUrl = flaskES6.urlFor(`structural_elements.edit`, editUrlParams);
                return `<a class="btn btn-sm btn-outline-primary text-nowrap" href="${editUrl}" role="button" title="Edit ${type}"><i class="bi bi-pencil"></i> Edit</a>`;
            }
            catch (error) {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        }
        return ``;
    }

    #getGeneralHTML(data, path) {
        return `<div class="d-flex justify-content-between align-items-start gap-3 mb-3">
    <div>
        <h5 class="text-break">${data.structural_element.name}</h5>
        <h6 class="text-break">${path}</h6>
    </div>
    ${this.#getEditBtnHTML(data.type, data.structural_element.id)}
</div>
<p class="fst-italic text-muted text-break">${data.structural_element.description}</p>
<div class="row">
    <dl class="col">
        <dt>IFC ID</dt>
        <dd>${(data.structural_element.ifc_id != null && data.structural_element.ifc_id != "") ? data.structural_element.ifc_id : "-"}</dd>
    </dl>
</div>`;
    }

    #getItemHelpHTML(itemDescription, withSpace = true) {
        let ret = ``;
        if (itemDescription?.length > 0) {
            let abbrElmt = document.createElement("abbr");
            abbrElmt.title = itemDescription != null ? itemDescription : "";
            let abbrContentElmt = document.createElement("i");
            abbrContentElmt.classList.add("bi", "bi-question-diamond");
            abbrElmt.appendChild(abbrContentElmt);
            ret = `<sup${withSpace ? ` class="ms-1"`: ``}>${abbrElmt.outerHTML}</sup>`;
        }
        return ret;
    }

    #getPropertiesHTML(data, id) {
        let propertyDataHTML = ``;
        if (data.properties.length > 0) {
            for (let property of data.properties) {
                let unitSymbol = (property.unit_symbol != null && property.unit_symbol.length > 0) ? `<small class="text-muted ms-1">[${property.unit_symbol}]</small>` : ``;
                propertyDataHTML += `<dl>
    <dt>${property.name}${unitSymbol}${this.#getItemHelpHTML(property.description)}</dt>
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

        if (this.#generalReqID != null) {
            this.#internalAPIRequester.abort(this.#generalReqID);
            this.#generalReqID = null;
        }
        this.#generalReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_data`, {type: type, id: id}),
            (data) => {
                this.#generalTabContentElmt.innerHTML = this.#getGeneralHTML(data, path);
            },
            (error) => {
                this.#generalTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            },
        );
    }

    #renderProperties(id, type, path) {
        this.#propertiesTabContentElmt.innerHTML = "";
        this.#propertiesTabContentElmt.appendChild(new Spinner());

        if (this.#propertiesReqID != null) {
            this.#internalAPIRequester.abort(this.#propertiesReqID);
            this.#propertiesReqID = null;
        }
        this.#propertiesReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_property_data`, {type: type, id: id}),
            (data) => {
                this.#propertiesTabContentElmt.innerHTML = this.#getPropertiesHTML(data, id);
            },
            (error) => {
                this.#propertiesTabContentElmt.innerHTML = this.#getErrorHTML(error.message);
            },
        );
    }

    #populateTimeseriesList(tsList) {
        this.#tsListElmt.innerHTML = "";
        if (tsList.length > 0) {
            for (let tsData of tsList) {
                let tsElmt = document.createElement("div");
                tsElmt.classList.add("list-group-item");

                let tsHeaderElmt = document.createElement("div");
                tsHeaderElmt.classList.add("d-flex", "gap-1");

                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-clock-history", "me-1");
                tsHeaderElmt.appendChild(iconElmt);

                let nameSpanElmt = document.createElement("span");
                nameSpanElmt.classList.add("fw-bold", "text-break");
                nameSpanElmt.innerText = tsData.name;
                tsHeaderElmt.appendChild(nameSpanElmt);

                if (tsData.unit_symbol) {
                    let unitSpanElmt = document.createElement("span");
                    unitSpanElmt.classList.add("text-muted");
                    unitSpanElmt.innerText = `[${tsData.unit_symbol}]`;
                    tsHeaderElmt.appendChild(unitSpanElmt);
                }

                tsElmt.appendChild(tsHeaderElmt);

                let tsDescElmt = document.createElement("small");
                tsDescElmt.classList.add("fst-italic", "text-muted");
                tsDescElmt.innerText = tsData.description;
                tsElmt.appendChild(tsDescElmt);

                this.#tsListElmt.appendChild(tsElmt);
            }
        }
        else {
            let nodataSpanElmt = document.createElement("span");
            nodataSpanElmt.classList.add("fst-italic", "text-muted", "text-center");
            nodataSpanElmt.innerText = "No data";
            this.#tsListElmt.appendChild(nodataSpanElmt);
        }
    }

    #renderTimeseries(id, type, path) {
        this.#tsCountElmt.setLoading();
        this.#tsListElmt.innerHTML = "";
        this.#tsListElmt.appendChild(new Spinner());

        if (this.#tsReqID != null) {
            this.#internalAPIRequester.abort(this.#tsReqID);
            this.#tsReqID = null;
        }

        let tsOptions = {
            "page_size": this.#tsPageSizeElmt.current,
            "page": this.#tsPaginationElmt.page,
        };
        tsOptions[`${type}_id`] = id;
        if (this.#searchElmt.value != "") {
            tsOptions["search"] = this.#searchElmt.value;
        }

        this.#tsReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries.retrieve_list`, tsOptions),
            (data) => {
                let tsPaginationOpts = {
                    pageSize: this.#tsPageSizeElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#tsPaginationElmt.reload(tsPaginationOpts);
                this.#tsCountElmt.update({totalCount: this.#tsPaginationElmt.totalItems, firstItem: this.#tsPaginationElmt.startItem, lastItem: this.#tsPaginationElmt.endItem});

                this.#populateTimeseriesList(data.data);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    render(id, type, path) {
        this.#selectedItemsPerTab[this.#tabSitesSelected.id] = {id: id, type: type, path: path};
        for (let tabElmt of this.#tabPropertiesElmts) {
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
        }
        this.#tsPaginationElmt.reload();
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

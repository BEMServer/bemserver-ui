import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";
import "../../components/itemsCount.js";
import "../../components/pagination.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { TimeDisplay } from "../../tools/time.js";
import { EventLevelBadge } from "../../components/eventLevel.js";
import "../../components/tree.js";


export class StructuralElementsExploreView {

    #tzName = "UTC";
    #messagesElmt = null;

    #internalAPIRequester = null;
    #generalReqID = null;
    #propertiesReqID = null;
    #tsReqID = null;
    #eventsReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #tabSitesElmts = null;
    #tabPropertiesElmts = null;
    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;

    #tsSearchElmt = null;
    #tsClearSearchBtnElmt = null;
    #tsRecurseSwitchElmt = null;
    #tsPageSizeElmt = null;
    #tsCountElmt = null;
    #tsPaginationElmt = null;
    #tsListElmt = null;

    #eventsSearchElmt = null;
    #eventsClearSearchBtnElmt = null;
    #eventsRecurseSwitchElmt = null;
    #eventsPageSizeElmt = null;
    #eventsCountElmt = null;
    #eventsPaginationElmt = null;
    #eventsListElmt = null;

    #tabSitesSelected = null;
    #tabPropertiesSelected = null;

    #selectedItemsPerTab = {};
    #renderPerTab = {
        "general-tab": this.#renderGeneral.bind(this),
        "properties-tab": this.#renderProperties.bind(this),
        "timeseries-tab": this.#renderTimeseries.bind(this),
        "events-tab": this.#renderEvents.bind(this),
    }
    #alreadyLoadedPerTab = {};

    #sitesTreeElmt = null;
    #zonesTreeElmt = null;

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();
        this.#initEventListeners();

        this.#updateTsSearchState();
        this.#updateEventsSearchState();
    }

    #loadOptions(options = {}) {
        this.#tzName = options.timezone || "UTC";
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#tabSitesElmts = [].slice.call(document.querySelectorAll("#tabSites button[data-bs-toggle='tab']"));
        this.#tabPropertiesElmts = [].slice.call(document.querySelectorAll("#tabProperties button[data-bs-toggle='tab']"));
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("properties-tabcontent");

        this.#tsSearchElmt = document.getElementById("tsSearch");
        this.#tsClearSearchBtnElmt = document.getElementById("tsClear");
        this.#tsRecurseSwitchElmt = document.getElementById("tsRecurseSwitch");
        this.#tsPageSizeElmt = document.getElementById("tsPageSize");
        this.#tsCountElmt = document.getElementById("tsCount");
        this.#tsPaginationElmt = document.getElementById("tsPagination");
        this.#tsListElmt = document.getElementById("tsList");

        this.#eventsSearchElmt = document.getElementById("eventsSearch");
        this.#eventsClearSearchBtnElmt = document.getElementById("eventsClear");
        this.#eventsRecurseSwitchElmt = document.getElementById("eventsRecurseSwitch");
        this.#eventsPageSizeElmt = document.getElementById("eventsPageSize");
        this.#eventsCountElmt = document.getElementById("eventsCount");
        this.#eventsPaginationElmt = document.getElementById("eventsPagination");
        this.#eventsListElmt = document.getElementById("eventsList");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#zonesTreeElmt = document.getElementById("zonesTree");
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
                this.#refreshTabs();
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
                this.#refreshTabs();
            });
        }

        this.#tsSearchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateTsSearchState();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#tsPaginationElmt.page = 1;
            this.#refreshTabs();
        });

        this.#tsClearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#tsSearchElmt.value = "";
            this.#updateTsSearchState();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#tsRecurseSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#tsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
                this.#tsPaginationElmt.page = 1;
                this.#refreshTabs();
            }
        });

        this.#tsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsSearchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateEventsSearchState();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#eventsPaginationElmt.page = 1;
            this.#refreshTabs();
        });

        this.#eventsClearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#eventsSearchElmt.value = "";
            this.#updateEventsSearchState();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsRecurseSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
                this.#eventsPaginationElmt.page = 1;
                this.#refreshTabs();
            }
        });

        this.#eventsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = false;
            this.#refreshTabs();
        });

        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.render(event.detail.id, event.detail.type, event.detail.path);
        });

        this.#zonesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.render(event.detail.id, event.detail.type, event.detail.path);
        });
    }

    #updateTsSearchState() {
        if (this.#tsSearchElmt.value != "") {
            this.#tsSearchElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            this.#tsClearSearchBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#tsSearchElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#tsClearSearchBtnElmt.classList.add("d-none", "invisible");
        }
    }

    #updateEventsSearchState() {
        if (this.#eventsSearchElmt.value != "") {
            this.#eventsSearchElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            this.#eventsClearSearchBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#eventsSearchElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#eventsClearSearchBtnElmt.classList.add("d-none", "invisible");
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
                tsDescElmt.innerText = tsData.description != null ? tsData.description : "-";
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

    #populateEventList(eventsList) {
        this.#eventsListElmt.innerHTML = "";
        if (eventsList.length > 0) {
            for (let eventData of eventsList) {
                let eventElmt = document.createElement("div");
                eventElmt.classList.add("list-group-item");

                let eventHeaderElmt = document.createElement("div");
                eventHeaderElmt.classList.add("d-flex", "align-items-center", "gap-1", "w-100");
                eventElmt.appendChild(eventHeaderElmt);

                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-journal-x", "me-1");
                eventHeaderElmt.appendChild(iconElmt);

                let headerContentElmt = document.createElement("div");
                headerContentElmt.classList.add("d-flex", "justify-content-between", "align-items-center", "gap-2", "w-100");
                eventHeaderElmt.appendChild(headerContentElmt);

                let timestampElmt = document.createElement("h6");
                timestampElmt.classList.add("text-nowrap", "mb-0");
                timestampElmt.innerText = TimeDisplay.toLocaleString(new Date(eventData.timestamp), {timezone: this.#tzName});
                headerContentElmt.appendChild(timestampElmt);

                let levelBadgeElmt = new EventLevelBadge();
                levelBadgeElmt.setAttribute("level", eventData.level.toUpperCase());
                headerContentElmt.appendChild(levelBadgeElmt);

                let bodyContentElmt = document.createElement("div");
                bodyContentElmt.classList.add("d-flex", "justify-content-between", "align-items-start", "gap-2");
                eventElmt.appendChild(bodyContentElmt);

                let eventDescElmt = document.createElement("small");
                eventDescElmt.classList.add("fst-italic", "text-muted");
                eventDescElmt.innerText = eventData.description;
                bodyContentElmt.appendChild(eventDescElmt);

                let sourceElmt = document.createElement("span");
                sourceElmt.classList.add("text-nowrap");
                sourceElmt.innerText = eventData.source;
                bodyContentElmt.appendChild(sourceElmt);

                this.#eventsListElmt.appendChild(eventElmt);
            }
        }
        else {
            let nodataSpanElmt = document.createElement("span");
            nodataSpanElmt.classList.add("fst-italic", "text-muted", "text-center");
            nodataSpanElmt.innerText = "No data";
            this.#eventsListElmt.appendChild(nodataSpanElmt);
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

        if (["space", "zone"].includes(type)) {
            this.#tsRecurseSwitchElmt.checked = false;
            this.#tsRecurseSwitchElmt.setAttribute("disabled", true);
        }
        else {
            this.#tsRecurseSwitchElmt.removeAttribute("disabled");
        }

        let tsOptions = {
            "page_size": this.#tsPageSizeElmt.current,
            "page": this.#tsPaginationElmt.page,
        };
        tsOptions[`${this.#tsRecurseSwitchElmt.checked ? "recurse_" : ""}${type}_id`] = id;
        if (this.#tsSearchElmt.value != "") {
            tsOptions["search"] = this.#tsSearchElmt.value;
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

    #renderEvents(id, type, path) {
        this.#eventsCountElmt.setLoading();
        this.#eventsListElmt.innerHTML = "";
        this.#eventsListElmt.appendChild(new Spinner());

        if (this.#eventsReqID != null) {
            this.#internalAPIRequester.abort(this.#eventsReqID);
            this.#eventsReqID = null;
        }

        if (["space", "zone"].includes(type)) {
            this.#eventsRecurseSwitchElmt.checked = false;
            this.#eventsRecurseSwitchElmt.setAttribute("disabled", true);
        }
        else {
            this.#eventsRecurseSwitchElmt.removeAttribute("disabled");
        }

        let eventsOptions = {
            "page_size": this.#eventsPageSizeElmt.current,
            "page": this.#eventsPaginationElmt.page,
        };
        eventsOptions[`${this.#eventsRecurseSwitchElmt.checked ? "recurse_" : ""}${type}_id`] = id;
        if (this.#eventsSearchElmt.value != "") {
            eventsOptions["in_source"] = this.#eventsSearchElmt.value;
        }

        this.#eventsReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_list`, eventsOptions),
            (data) => {
                let eventsPaginationOpts = {
                    pageSize: this.#eventsPageSizeElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#eventsPaginationElmt.reload(eventsPaginationOpts);
                this.#eventsCountElmt.update({totalCount: this.#eventsPaginationElmt.totalItems, firstItem: this.#eventsPaginationElmt.startItem, lastItem: this.#eventsPaginationElmt.endItem});

                this.#populateEventList(data.data);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #loadSitesTreeData() {
        this.#sitesTreeElmt.showLoading();

        if (this.#sitesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#sitesTreeReqID);
            this.#sitesTreeReqID = null;
        }

        this.#sitesTreeReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_tree_sites`),
            (data) => {
                this.#sitesTreeElmt.load(data.data);
                this.#sitesTreeElmt.collapseAll();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #loadZonesTreeData() {
        this.#zonesTreeElmt.showLoading();

        if (this.#zonesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#zonesTreeReqID);
            this.#zonesTreeReqID = null;
        }

        this.#zonesTreeReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_tree_zones`),
            (data) => {
                this.#zonesTreeElmt.load(data.data);
                this.#zonesTreeElmt.collapseAll();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #generateHelpElement(helpContext) {
        let helpContainerElmt = document.createElement("div");
        helpContainerElmt.classList.add("alert", "alert-info", "mb-0", "pb-0");

        let helpIconElmt = document.createElement("i");
        helpIconElmt.classList.add("bi", "bi-question-diamond", "me-2");
        helpContainerElmt.appendChild(helpIconElmt);

        let helpTitleElmt = document.createElement("span");
        helpTitleElmt.classList.add("fw-bold");
        helpTitleElmt.innerText = "Help";
        helpContainerElmt.appendChild(helpTitleElmt);

        let helpTextElmt = document.createElement("p");
        helpTextElmt.innerHTML = `Select a <span class="fw-bold">location (site, building...)</span> in the tree to see its <span class="fw-bold">${helpContext}</span>.`;
        helpContainerElmt.appendChild(helpTextElmt);

        return helpContainerElmt;
    }

    #refreshTabs() {
        let selectedItemData = this.#selectedItemsPerTab[this.#tabSitesSelected.id];
        if (selectedItemData != null) {
            if (!this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id]) {
                this.#renderPerTab[this.#tabPropertiesSelected.id]?.call(this, selectedItemData.id, selectedItemData.type, selectedItemData.path);
                this.#alreadyLoadedPerTab[this.#tabPropertiesSelected.id] = true;
            }
        }
        else {
            this.#generalTabContentElmt.innerHTML = "";
            this.#generalTabContentElmt.appendChild(this.#generateHelpElement("description"));
            this.#propertiesTabContentElmt.innerHTML = "";
            this.#propertiesTabContentElmt.appendChild(this.#generateHelpElement("properties"));
            this.#tsListElmt.innerHTML = "";
            this.#tsListElmt.appendChild(this.#generateHelpElement("related timeseries"));
            this.#eventsListElmt.innerHTML = "";
            this.#eventsListElmt.appendChild(this.#generateHelpElement("related events"));
        }
    }

    render(id, type, path) {
        this.#selectedItemsPerTab[this.#tabSitesSelected.id] = {id: id, type: type, path: path};
        for (let tabElmt of this.#tabPropertiesElmts) {
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
        }
        this.#tsPaginationElmt.reload();
        this.#refreshTabs();
    }

    refresh() {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();
        this.#refreshTabs();
    }
}

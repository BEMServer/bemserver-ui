import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import "/static/scripts/modules/components/itemsCount.js";
import "/static/scripts/modules/components/pagination.js";
import { TimeDisplay } from "/static/scripts/modules/tools/time.js";
import { EventLevelBadge } from "/static/scripts/modules/components/eventLevel.js";
import "/static/scripts/modules/components/tree.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";


export class StructuralElementsExploreView {

    #tzName = "UTC";

    #internalAPIRequester = null;
    #generalReqID = null;
    #propertiesReqID = null;
    #tsReqID = null;
    #eventsReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #tabSitesElmts = null;
    #tabDataItemElmts = null;
    #generalTabContentElmt = null;
    #propertiesTabContentElmt = null;
    #alertInfoDataElmt = null;
    #selectedStructutalElementInfoContainerElmt = null;
    #selectedStructuralElementTypeElmt = null;

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
    #tabDataSelected = null;

    #selectedItemsPerTab = {};
    #renderPerTab = {
        "general-tab": this.#renderGeneral.bind(this),
        "attributes-tab": this.#renderProperties.bind(this),
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
        this.#tabSitesElmts = [].slice.call(document.querySelectorAll("#tabSites button[data-bs-toggle='tab']"));
        this.#tabDataItemElmts = [].slice.call(document.querySelectorAll("#tabData button[data-bs-toggle='tab']"));
        this.#generalTabContentElmt = document.getElementById("general-tabcontent");
        this.#propertiesTabContentElmt = document.getElementById("attributes-tabcontent");

        this.#alertInfoDataElmt = document.getElementById("alertInfoData");
        this.#selectedStructutalElementInfoContainerElmt = document.getElementById("selectedStructutalElementInfoContainer");
        this.#selectedStructuralElementTypeElmt = document.getElementById("selectedStructuralElementType");

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
                for (let tabDataItemElmt of this.#tabDataItemElmts) {
                    this.#alreadyLoadedPerTab[tabDataItemElmt.id] = false;
                }
                this.#refreshTabs();
            });
        }

        for (let tabElmt of this.#tabDataItemElmts) {
            if (tabElmt.classList.contains("active")) {
                this.#tabDataSelected = tabElmt;
            }
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
            tabElmt.addEventListener("shown.bs.tab", (event) => {
                // newly activated tab is `event.target` ; previous active tab is `event.relatedTarget`
                this.#tabDataSelected = event.target;
                this.#refreshTabs();
            });
        }

        this.#tsSearchElmt.addEventListener("input", debounce((event) => {
            event.preventDefault();

            this.#updateTsSearchState();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#tsPaginationElmt.page = 1;
            this.#refreshTabs();    
        }), 700);

        this.#tsClearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#tsSearchElmt.value = "";
            this.#updateTsSearchState();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#tsRecurseSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#tsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
                this.#tsPaginationElmt.page = 1;
                this.#refreshTabs();
            }
        });

        this.#tsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsSearchElmt.addEventListener("input", debounce((event) => {
            event.preventDefault();

            this.#updateEventsSearchState();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#eventsPaginationElmt.page = 1;
            this.#refreshTabs();
        }), 700);

        this.#eventsClearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#eventsSearchElmt.value = "";
            this.#updateEventsSearchState();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsRecurseSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#eventsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
                this.#eventsPaginationElmt.page = 1;
                this.#refreshTabs();
            }
        });

        this.#eventsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = false;
            this.#refreshTabs();
        });

        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#render(event.detail.id, event.detail.type, event.detail.path);
        });

        this.#zonesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#render(event.detail.id, event.detail.type, event.detail.path);
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

    #createEditBtnElement(type, id, tab=null) {
        let editUrlParams = {type: type, id: id};
        if (tab != null) {
            editUrlParams["tab"] = tab;
        }

        try {
            let editUrl = app.urlFor(`structural_elements.edit`, editUrlParams);

            let elmt = document.createElement("a");
            elmt.classList.add("btn", "btn-sm", "btn-outline-primary", "text-nowrap");
            elmt.href = editUrl;
            elmt.setAttribute("role", "button");
            elmt.title = `Edit ${type}`;

            let iconElmt = document.createElement("i");
            iconElmt.classList.add("bi", "bi-pencil", "me-1");
            elmt.appendChild(iconElmt);

            let textElmt = document.createElement("span");
            textElmt.textContent = "Edit";
            elmt.appendChild(textElmt);

            return elmt;
        }
        catch (error) {
            app.flashMessage(error.toString(), "error");
        }

        return null;

    }

    #populateGeneral(data, path) {
        this.#generalTabContentElmt.innerHTML = "";

        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-start", "gap-3");
        this.#generalTabContentElmt.appendChild(mainContainerElmt);

        let titleContainerElmt = document.createElement("div");
        mainContainerElmt.appendChild(titleContainerElmt);

        if (path) {
            let structPathElmt = document.createElement("h6");
            structPathElmt.classList.add("text-muted", "text-break");
            structPathElmt.textContent = path;
            titleContainerElmt.appendChild(structPathElmt);
        }

        let structNameElmt = document.createElement("h5");
        structNameElmt.classList.add("text-break");
        structNameElmt.textContent = data.structural_element.name;
        titleContainerElmt.appendChild(structNameElmt);

        if (app.signedUser.is_admin) {
            let editBtnElmt = this.#createEditBtnElement(data.type, data.structural_element.id, "general");
            if (editBtnElmt != null) {
                mainContainerElmt.appendChild(editBtnElmt);
            }
        }

        let descElmt = document.createElement("small");
        descElmt.classList.add("fst-italic", "text-muted", "text-break");
        descElmt.textContent = data.structural_element.description;
        this.#generalTabContentElmt.appendChild(descElmt);

        let ifcContainerElmt = document.createElement("div");
        ifcContainerElmt.classList.add("row", "pt-2");
        this.#generalTabContentElmt.appendChild(ifcContainerElmt);
        let ifcIDContainerElmt = document.createElement("dl");
        ifcIDContainerElmt.classList.add("col");
        ifcContainerElmt.appendChild(ifcIDContainerElmt);
        let ifcIDTitleElmt = document.createElement("dt");
        ifcIDTitleElmt.textContent = `IFC ID (${data.type})`;
        ifcIDContainerElmt.appendChild(ifcIDTitleElmt);
        let ifcIDValueElmt = document.createElement("dd");
        ifcIDValueElmt.textContent = data.structural_element.ifc_id?.length > 0 ? data.structural_element.ifc_id : "-";
        ifcIDContainerElmt.appendChild(ifcIDValueElmt);

        if (data.type == "site") {
            let geoLocationContainerElmt = document.createElement("div");
            geoLocationContainerElmt.classList.add("row");
            this.#generalTabContentElmt.appendChild(geoLocationContainerElmt);

            let latContainerElmt = document.createElement("dl");
            latContainerElmt.classList.add("col");
            geoLocationContainerElmt.appendChild(latContainerElmt);
            let latTitleContainerElmt = document.createElement("dt");
            latContainerElmt.appendChild(latTitleContainerElmt);
            let latTitleNameElmt = document.createElement("span");
            latTitleNameElmt.textContent = "Latitude";
            latTitleContainerElmt.appendChild(latTitleNameElmt);
            let latTitleUnitElmt = document.createElement("small");
            latTitleUnitElmt.classList.add("text-muted", "ms-1");
            latTitleUnitElmt.textContent = "[°]";
            latTitleContainerElmt.appendChild(latTitleUnitElmt);
            let latValueElmt = document.createElement("dd");
            latValueElmt.textContent = data.structural_element.latitude != null ? data.structural_element.latitude : "-";
            latContainerElmt.appendChild(latValueElmt);

            let longContainerElmt = document.createElement("dl");
            longContainerElmt.classList.add("col");
            geoLocationContainerElmt.appendChild(longContainerElmt);
            let longTitleContainerElmt = document.createElement("dt");
            longContainerElmt.appendChild(longTitleContainerElmt);
            let longTitleNameElmt = document.createElement("span");
            longTitleNameElmt.textContent = "Longitude";
            longTitleContainerElmt.appendChild(longTitleNameElmt);
            let longTitleUnitElmt = document.createElement("small");
            longTitleUnitElmt.classList.add("text-muted", "ms-1");
            longTitleUnitElmt.textContent = "[°]";
            longTitleContainerElmt.appendChild(longTitleUnitElmt);
            let longValueElmt = document.createElement("dd");
            longValueElmt.textContent = data.structural_element.longitude != null ? data.structural_element.longitude : "-";
            longContainerElmt.appendChild(longValueElmt);
        }
    }

    #populateProperties(data, id) {
        this.#propertiesTabContentElmt.innerHTML = "";

        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-start", "gap-3");
        this.#propertiesTabContentElmt.appendChild(mainContainerElmt);

        let propContainerElmt = document.createElement("div");
        propContainerElmt.classList.add("d-flex", "gap-4");
        mainContainerElmt.appendChild(propContainerElmt);

        if (app.signedUser.is_admin) {
            let editBtnElmt = this.#createEditBtnElement(data.type, id, "attributes");
            if (editBtnElmt != null) {
                mainContainerElmt.appendChild(editBtnElmt);
            }
        }

        if (data.properties.length > 0) {
            for (let property of data.properties) {
                let propItemContainerElmt = document.createElement("div");
                propItemContainerElmt.classList.add("row");
                propContainerElmt.appendChild(propItemContainerElmt);

                let propItemElmt = document.createElement("dl");
                propItemElmt.classList.add("col");
                propItemContainerElmt.appendChild(propItemElmt);

                let propTitleElmt = document.createElement("dt");
                propItemElmt.appendChild(propTitleElmt);

                let propNameElmt = document.createElement("span");
                propNameElmt.textContent = property.name;
                propTitleElmt.appendChild(propNameElmt);

                if (property.unit_symbol?.length > 0) {
                    let propUnitElmt = document.createElement("small");
                    propUnitElmt.classList.add("text-muted", "ms-1");
                    propUnitElmt.textContent = `[${property.unit_symbol}]`;
                    propTitleElmt.appendChild(propUnitElmt);
                }

                if (property.description?.length > 0) {
                    let abbrContainerElmt = document.createElement("sup");
                    abbrContainerElmt.classList.add("ms-1");
                    propTitleElmt.appendChild(abbrContainerElmt);

                    let abbrElmt = document.createElement("abbr");
                    abbrElmt.title = property.description != null ? property.description : "";
                    abbrContainerElmt.appendChild(abbrElmt);

                    let abbrIconElmt = document.createElement("i");
                    abbrIconElmt.classList.add("bi", "bi-question-diamond");
                    abbrElmt.appendChild(abbrIconElmt);
                }

                let propValueElmt = document.createElement("dd");
                propValueElmt.textContent = property.value?.length > 0 ? property.value : "-";
                propItemElmt.appendChild(propValueElmt);
            }
        }
        else {
            propContainerElmt.appendChild(this.#createNoDataElement("No attributes"));
        }
    }

    #renderGeneral(id, type, path) {
        this.#generalTabContentElmt.innerHTML = "";
        this.#generalTabContentElmt.appendChild(new Spinner());

        if (this.#generalReqID != null) {
            this.#internalAPIRequester.abort(this.#generalReqID);
            this.#generalReqID = null;
        }
        this.#generalReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.structural_elements.retrieve_data`, {type: type, id: id}),
            (data) => {
                this.#populateGeneral(data, path);
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
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
            app.urlFor(`api.structural_elements.retrieve_property_data`, {type: type, id: id}),
            (data) => {
                this.#populateProperties(data, id);
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #createNoDataElement(text = "No data") {
        let elmt = document.createElement("span");
        elmt.classList.add("fst-italic", "text-muted", "text-center");
        elmt.textContent = text;
        return elmt;
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
            this.#tsListElmt.appendChild(this.#createNoDataElement());
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
            this.#eventsListElmt.appendChild(this.#createNoDataElement());
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
            app.urlFor(`api.timeseries.retrieve_list`, tsOptions),
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
                app.flashMessage(error.toString(), "error");
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
            app.urlFor(`api.events.retrieve_list`, eventsOptions),
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
                app.flashMessage(error.toString(), "error");
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
            app.urlFor(`api.structural_elements.retrieve_tree_sites`),
            (data) => {
                this.#sitesTreeElmt.load(data.data);
                this.#sitesTreeElmt.collapseAll();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
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
            app.urlFor(`api.structural_elements.retrieve_tree_zones`),
            (data) => {
                this.#zonesTreeElmt.load(data.data);
                this.#zonesTreeElmt.collapseAll();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #createNoSelectionElement() {
        let elmt = document.createElement("span");
        elmt.classList.add("fst-italic", "text-muted");
        elmt.textContent = "no location selected";
        return elmt;
    }

    #refreshTabs() {
        let selectedItemData = this.#selectedItemsPerTab[this.#tabSitesSelected.id];
        if (selectedItemData != null) {
            this.#selectedStructuralElementTypeElmt.textContent = selectedItemData.type;
            this.#alertInfoDataElmt.classList.add("d-none", "invisible");
            this.#selectedStructutalElementInfoContainerElmt.classList.remove("d-none", "invisible");

            if (!this.#alreadyLoadedPerTab[this.#tabDataSelected.id]) {
                this.#renderPerTab[this.#tabDataSelected.id]?.call(this, selectedItemData.id, selectedItemData.type, selectedItemData.path);
                this.#alreadyLoadedPerTab[this.#tabDataSelected.id] = true;
            }
        }
        else {
            this.#generalTabContentElmt.innerHTML = "";
            this.#generalTabContentElmt.appendChild(this.#createNoSelectionElement());
            this.#propertiesTabContentElmt.innerHTML = "";
            this.#propertiesTabContentElmt.appendChild(this.#createNoSelectionElement());
            this.#populateTimeseriesList([]);
            this.#populateEventList([]);

            this.#selectedStructuralElementTypeElmt.textContent = "?";
            this.#alertInfoDataElmt.classList.remove("d-none", "invisible");
            this.#selectedStructutalElementInfoContainerElmt.classList.add("d-none", "invisible");
        }
    }

    #render(id, type, path) {
        this.#selectedItemsPerTab[this.#tabSitesSelected.id] = {id: id, type: type, path: path};
        for (let tabElmt of this.#tabDataItemElmts) {
            this.#alreadyLoadedPerTab[tabElmt.id] = false;
        }
        this.#tsPaginationElmt.reload();
        this.#refreshTabs();
    }

    mount() {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();
        this.#refreshTabs();
    }
}

import { flaskES6 } from "../../../app.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { ItemsCount } from "../../components/itemsCount.js";
import "../../components/pagination.js";
import "../../components/time/datetimePicker.js";
import { FilterSelect } from "../../components/filterSelect.js";
import { TimeDisplay } from "../../tools/time.js";


export class EventListView {

    #tzName = "UTC";
    #defaultFilters = {};
    #levelStyles = {
        "default": {
            icon: [],
            badge: ["badge", "text-bg-dark", "p-2"],
        },
        "INFO": {
            icon: ["bi", "bi-info-square", "me-1"],
            badge: ["badge", "text-bg-success", "bg-opacity-75", "p-2"],
        },
        "WARNING": {
            icon: ["bi", "bi-exclamation-triangle", "me-1"],
            badge: ["badge", "text-bg-warning", "bg-opacity-50", "p-2"],
        },
        "ERROR": {
            icon: ["bi", "bi-x-octagon", "me-1"],
            badge: ["badge", "text-bg-danger", "bg-opacity-50", "text-black", "p-2"],
        },
        "CRITICAL": {
            icon: ["bi", "bi-radioactive", "me-1"],
            badge: ["badge", "text-bg-danger", "p-2"],
        },
    }

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;
    #loadTsReqIDs = {};

    #messagesElmt = null;

    #filtersContainerElmt = null;
    #sourceSearchFilterElmt = null;
    #timestampMinSearchFilterElmt = null;
    #timestampMaxSearchFilterElmt = null;
    #btnRemoveFiltersElmt = null;
    #searchSelectFilters = {};
    #dataFilters = {};

    #sortInputElmt = null;
    #sortRadioElmts = null;

    #itemsCountElmt = null;
    #pageSizeElmt = null;
    #paginationElmt = null;

    #eventsContainerElmt = null;
    #tsTabsLoaded = [];

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();

        this.#initFilters();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#tzName = options.timezone || "UTC";
        for (let [optFilterName, optFilterValue] of Object.entries(options.filters || {})) {
            this.#defaultFilters[optFilterName] = optFilterValue;
        }
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#filtersContainerElmt = document.getElementById("filtersContainer");
        this.#sourceSearchFilterElmt = document.getElementById("sourceSearch");
        this.#timestampMinSearchFilterElmt = document.getElementById("timestamp_min");
        this.#timestampMaxSearchFilterElmt = document.getElementById("timestamp_max");
        this.#btnRemoveFiltersElmt = document.getElementById("removeFiltersBtn");

        this.#sortInputElmt = document.getElementById("sort");
        this.#sortRadioElmts = [].slice.call(document.querySelectorAll(`input[type="radio"][id^="sort_"]`));

        this.#itemsCountElmt = document.getElementById("itemsCount");
        this.#pageSizeElmt = document.getElementById("pageSize");
        this.#paginationElmt = document.getElementById("pagination");

        this.#eventsContainerElmt = document.getElementById("eventsContainer");
    }

    #initFilters() {
        this.#searchSelectFilters = {
            "campaign_scope": {
                "label": "campaign scopes",
                "fetchUrl": flaskES6.urlFor(`api.campaign_scopes.retrieve_list`),
                "htmlElement": new FilterSelect(),
                "defaultValue": (this.#defaultFilters["campaign-scope"] || null)?.toString(),
            },
            "level": {
                "label": "levels",
                "fetchUrl": flaskES6.urlFor(`api.events.retrieve_levels`),
                "htmlElement": new FilterSelect(),
                "defaultValue": (this.#defaultFilters["level"] || null)?.toString(),
            },
            "category": {
                "label": "categories",
                "fetchUrl": flaskES6.urlFor(`api.events.retrieve_categories`),
                "htmlElement": new FilterSelect(),
                "defaultValue": (this.#defaultFilters["category"] || null)?.toString(),
            },
        };

        for (let [filterFetchUrl, filterReqID] of Object.entries(this.#filterReqIDs)) {
            this.#internalAPIRequester.abort(filterReqID);
            this.#filterReqIDs[filterFetchUrl] = null;
        }

        this.#filterReqIDs = this.#internalAPIRequester.gets(
            Object.values(this.#searchSelectFilters).map((filterOpts) => { return filterOpts["fetchUrl"]; }),
            (data) => {
                for (let [index, filterData] of Object.entries(data)) {
                    filterData = filterData.data != undefined ? filterData.data : filterData;

                    let searchSelectFilterKey = Object.keys(this.#searchSelectFilters)[index];
                    let searchSelectFilterOpts = this.#searchSelectFilters[searchSelectFilterKey];

                    this.#dataFilters[searchSelectFilterKey] = filterData;

                    let selectedOptionIndex = 0;
                    let selectOptions = filterData.map((row, filterIndex) => {
                        if (searchSelectFilterOpts["defaultValue"] == row.id.toString()) {
                            selectedOptionIndex = filterIndex + 1;
                        }
                        return {value: row.id.toString(), text: row.name};
                    });
                    selectOptions.splice(0, 0, {value: "None", text: `All ${searchSelectFilterOpts["label"]}`});

                    let searchSelectFilterElmt = searchSelectFilterOpts["htmlElement"];
                    this.#filtersContainerElmt.insertBefore(searchSelectFilterElmt, this.#btnRemoveFiltersElmt);
                    searchSelectFilterElmt.load(selectOptions, selectedOptionIndex);
                    searchSelectFilterElmt.addEventListener("change", (event) => {
                        event.preventDefault();

                        this.refresh();
                    });
                }

                this.refresh();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #initEventListeners() {
        this.#timestampMinSearchFilterElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#timestampMaxSearchFilterElmt.dateMin = this.#timestampMinSearchFilterElmt.date;
            this.refresh();
        });

        this.#timestampMaxSearchFilterElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#timestampMinSearchFilterElmt.dateMax = this.#timestampMaxSearchFilterElmt.date;
            this.refresh();
        });

        this.#sourceSearchFilterElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.refresh();
        });

        this.#btnRemoveFiltersElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            if (this.#timestampMinSearchFilterElmt.date != null || this.#timestampMinSearchFilterElmt.time != null && this.#timestampMaxSearchFilterElmt.date != null || this.#timestampMaxSearchFilterElmt.time != null) {
                this.#timestampMinSearchFilterElmt.reset();
                this.#timestampMaxSearchFilterElmt.reset();
                hasFilterChanged = true;
            }
            if (this.#sourceSearchFilterElmt.value != "") {
                this.#sourceSearchFilterElmt.value = "";
                hasFilterChanged = true;
            }
            for (let searchFilterElmt of Object.values(this.#searchSelectFilters).map((filterOpts) => { return filterOpts["htmlElement"]; })) {
                if (!searchFilterElmt.isDefaultSelected) {
                    searchFilterElmt.reset();
                    hasFilterChanged = true;
                }
            }
            if (hasFilterChanged) {
                this.#paginationElmt.page = 1;
                this.refresh();
            }
        });

        for (let sortRadioElmt of this.#sortRadioElmts) {
            sortRadioElmt.addEventListener("change", (event) => {
                event.preventDefault();

                let sortData = sortRadioElmt.id.split("_");
                let newSortValue = `${sortData[2].toLowerCase() == "asc" ? "+" : "-"}${sortData[1].toLowerCase()}`;
                if (this.#sortInputElmt.value != newSortValue) {
                    this.#sortInputElmt.value = newSortValue;
                    this.refresh();
                }
            });            
        }

        this.#pageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#paginationElmt.page = 1;
                this.refresh();
            }
        });

        this.#paginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.refresh();
        });
    }

    #getCampaignScopeData(campaignScopeId) {
        for (let campaignScopeData of this.#dataFilters["campaign_scope"]) {
            if (campaignScopeData.id == campaignScopeId) {
                return campaignScopeData;
            }
        }
        return null;
    }

    #getLevelData(levelId) {
        for (let levelData of this.#dataFilters["level"]) {
            if (levelData.id == levelId) {
                return levelData;
            }
        }
        return null;
    }

    #getCategoryData(categoryId) {
        for (let categoryData of this.#dataFilters["category"]) {
            if (categoryData.id == categoryId) {
                return categoryData;
            }
        }
        return null;
    }

    #createEventElement(eventData) {
        let panelCollapseId = `panelCollapseEvent-${eventData.id}`;

        let eventItemElmt = document.createElement("div");
        eventItemElmt.classList.add("accordion-item");

        // Event accordion item panel.
        let eventHeaderElmt = document.createElement("h2");
        eventHeaderElmt.classList.add("accordion-header");
        eventHeaderElmt.id = `panelHeadingEvent-${eventData.id}`;
        eventItemElmt.appendChild(eventHeaderElmt);

        let eventHeaderBtnElmt = document.createElement("button");
        eventHeaderBtnElmt.classList.add("accordion-button", "collapsed", "py-2");
        eventHeaderBtnElmt.setAttribute("type", "button");
        eventHeaderBtnElmt.setAttribute("data-bs-toggle", "collapse");
        eventHeaderBtnElmt.setAttribute("data-bs-target", `#${panelCollapseId}`);
        eventHeaderBtnElmt.setAttribute("aria-expanded", false);
        eventHeaderBtnElmt.setAttribute("aria-controls", panelCollapseId);
        eventHeaderElmt.appendChild(eventHeaderBtnElmt);

        let eventHeaderContainerElmt = document.createElement("div");
        eventHeaderContainerElmt.classList.add("row", "align-items-center", "w-100", "me-3");
        eventHeaderBtnElmt.appendChild(eventHeaderContainerElmt);

        let eventHeaderInfoElmt = document.createElement("div");
        eventHeaderInfoElmt.classList.add("col-auto", "d-flex", "flex-nowrap", "gap-2");
        eventHeaderContainerElmt.appendChild(eventHeaderInfoElmt);

        let eventIconElmt = document.createElement("i");
        eventIconElmt.classList.add("bi", "bi-calendar2-event");
        eventHeaderInfoElmt.appendChild(eventIconElmt);

        let eventHeaderTimestampElmt = document.createElement("span");
        eventHeaderTimestampElmt.innerText = TimeDisplay.toLocaleString(new Date(eventData.timestamp), {timezone: this.#tzName});
        eventHeaderInfoElmt.appendChild(eventHeaderTimestampElmt);

        let eventHeaderCol2Elmt = document.createElement("div");
        eventHeaderCol2Elmt.classList.add("col", "me-auto");
        eventHeaderContainerElmt.appendChild(eventHeaderCol2Elmt);

        let levelData = this.#getLevelData(eventData.level_id);
        if (levelData != null) {
            let levelStyle = this.#levelStyles[levelData.name];
            if (levelStyle == null) {
                levelStyle = this.#levelStyles["default"];
            }
            let eventLevelElmt = document.createElement("span");
            eventLevelElmt.classList.add(...levelStyle.badge);
            let eventLevelIconElmt = document.createElement("i");
            eventLevelIconElmt.classList.add(...levelStyle.icon);
            eventLevelElmt.appendChild(eventLevelIconElmt);
            let eventLevelNameElmt = document.createElement("span");
            eventLevelNameElmt.innerText = levelData.name;
            eventLevelElmt.appendChild(eventLevelNameElmt);
            eventHeaderCol2Elmt.appendChild(eventLevelElmt);
        }

        let eventHeaderCol3Elmt = document.createElement("div");
        eventHeaderCol3Elmt.classList.add("col-auto", "d-flex", "flex-nowrap", "align-items-center", "justify-content-end", "gap-2");
        eventHeaderContainerElmt.appendChild(eventHeaderCol3Elmt);

        let campaignScopeData = this.#getCampaignScopeData(eventData.campaign_scope_id);
        if (campaignScopeData != null) {
            let inLabelElmt = document.createElement("small");
            inLabelElmt.classList.add("text-muted");
            inLabelElmt.innerText = "In";
            eventHeaderCol3Elmt.appendChild(inLabelElmt);

            let campaignScopeHeaderElmt = document.createElement("small");
            campaignScopeHeaderElmt.classList.add("fw-bold", "text-muted");
            campaignScopeHeaderElmt.innerText = campaignScopeData.name;
            eventHeaderCol3Elmt.appendChild(campaignScopeHeaderElmt);
        }

        let categoryData = this.#getCategoryData(eventData.category_id);
        if (categoryData != null) {
            let categoryElmt = document.createElement("span");
            categoryElmt.classList.add("badge", "rounded-pill", "bg-primary", "font-monospace");
            categoryElmt.innerText = categoryData.name;
            eventHeaderCol3Elmt.appendChild(categoryElmt);
        }

        let fromLabelElmt = document.createElement("small");
        fromLabelElmt.classList.add("text-muted");
        fromLabelElmt.innerText = "from";
        eventHeaderCol3Elmt.appendChild(fromLabelElmt);

        let eventSourceElmt = document.createElement("small");
        eventSourceElmt.classList.add("fst-italic", "text-muted");
        eventSourceElmt.innerText = eventData.source;
        eventHeaderCol3Elmt.appendChild(eventSourceElmt);

        // Event accordion item panel.
        let eventPanelElmt = document.createElement("div");
        eventPanelElmt.classList.add("accordion-collapse", "collapse");
        eventPanelElmt.id = panelCollapseId;
        eventPanelElmt.setAttribute("aria-labelledby", eventHeaderElmt.id);
        eventPanelElmt.setAttribute("data-event-id", eventData.id);
        eventItemElmt.appendChild(eventPanelElmt);

        let eventPanelBodyElmt = document.createElement("div");
        eventPanelBodyElmt.classList.add("accordion-body");
        eventPanelElmt.appendChild(eventPanelBodyElmt);

        let tabsContainerElmt = document.createElement("ul");
        tabsContainerElmt.classList.add("nav", "nav-tabs", "app-tabs", "justify-content-center");
        tabsContainerElmt.setAttribute("role", "tablist");
        eventPanelBodyElmt.appendChild(tabsContainerElmt);

        let tabContentsContainerElmt = document.createElement("div");
        tabContentsContainerElmt.classList.add("tab-content", "overflow-auto", "border", "border-top-0", "bg-white", "mb-3");
        eventPanelBodyElmt.appendChild(tabContentsContainerElmt);

        let generalTabId = `general-tab-${eventData.id}`;
        let generalTabContentId = `general-tabcontent-${eventData.id}`;

        let generalTabElmt = document.createElement("li");
        generalTabElmt.classList.add("nav-item");
        generalTabElmt.setAttribute("role", "presentation");
        tabsContainerElmt.appendChild(generalTabElmt);

        let generalTabBtnElmt = document.createElement("button");
        generalTabBtnElmt.id = generalTabId;
        generalTabBtnElmt.classList.add("nav-link", "active");
        generalTabBtnElmt.setAttribute("data-bs-toggle", "tab");
        generalTabBtnElmt.setAttribute("data-bs-target", `#${generalTabContentId}`);
        generalTabBtnElmt.setAttribute("type", "button");
        generalTabBtnElmt.setAttribute("role", "tab");
        generalTabBtnElmt.setAttribute("aria-controls", generalTabContentId);
        generalTabBtnElmt.setAttribute("aria-selected", true);
        generalTabBtnElmt.innerText = "General";
        generalTabElmt.appendChild(generalTabBtnElmt);

        let generalTabContentElmt = document.createElement("div");
        generalTabContentElmt.classList.add("tab-pane", "fade", "show", "active", "p-3");
        generalTabContentElmt.id = generalTabContentId;
        generalTabContentElmt.setAttribute("role", "tabpanel");
        generalTabContentElmt.setAttribute("aria-labelledby", generalTabId);
        tabContentsContainerElmt.appendChild(generalTabContentElmt);

        let generalTabContentContainerElmt = document.createElement("div");
        generalTabContentContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-start");
        generalTabContentElmt.appendChild(generalTabContentContainerElmt);

        let generalTabContentInfoElmt = document.createElement("dl");
        generalTabContentContainerElmt.appendChild(generalTabContentInfoElmt);

        if (campaignScopeData != null) {
            let campaignScopeTitleElmt = document.createElement("dt");
            campaignScopeTitleElmt.innerText = "Campaign scope";
            generalTabContentInfoElmt.appendChild(campaignScopeTitleElmt);

            let campaignScopeElmt = document.createElement("dd");
            campaignScopeElmt.innerText = campaignScopeData.name;
            generalTabContentInfoElmt.appendChild(campaignScopeElmt);
        }

        let eventDescriptionTitleElmt = document.createElement("dt");
        eventDescriptionTitleElmt.innerText = "Description";
        generalTabContentInfoElmt.appendChild(eventDescriptionTitleElmt);

        let eventDescriptionElmt = document.createElement("dd");
        eventDescriptionElmt.innerText = eventData.description || "-";
        generalTabContentInfoElmt.appendChild(eventDescriptionElmt);

        let generalEditBtnElmt = document.createElement("a");
        generalEditBtnElmt.classList.add("btn", "btn-sm", "btn-outline-secondary", "ms-auto", "w-auto");
        generalEditBtnElmt.setAttribute("role", "button");
        generalEditBtnElmt.title = "Edit event";
        generalEditBtnElmt.href = flaskES6.urlFor("events.edit", {id: eventData.id});
        generalTabContentContainerElmt.appendChild(generalEditBtnElmt);

        let generalEditIconElmt = document.createElement("i");
        generalEditIconElmt.classList.add("bi", "bi-pencil", "me-1");
        generalEditBtnElmt.appendChild(generalEditIconElmt);

        let generalEditTextElmt = document.createElement("span");
        generalEditTextElmt.innerText = "Edit";
        generalEditBtnElmt.appendChild(generalEditTextElmt);

        let tsTabId = `ts-tab-${eventData.id}`;
        let tsTabContentId = `ts-tabcontent-${eventData.id}`;

        let tsTabElmt = document.createElement("li");
        tsTabElmt.classList.add("nav-item");
        tsTabElmt.setAttribute("role", "presentation");
        tabsContainerElmt.appendChild(tsTabElmt);

        let tsTabBtnElmt = document.createElement("button");
        tsTabBtnElmt.id = tsTabId;
        tsTabBtnElmt.classList.add("nav-link");
        tsTabBtnElmt.setAttribute("data-bs-toggle", "tab");
        tsTabBtnElmt.setAttribute("data-bs-target", `#${tsTabContentId}`);
        tsTabBtnElmt.setAttribute("type", "button");
        tsTabBtnElmt.setAttribute("role", "tab");
        tsTabBtnElmt.setAttribute("aria-controls", tsTabContentId);
        tsTabBtnElmt.setAttribute("aria-selected", false);
        tsTabBtnElmt.innerText = "Timeseries";
        tsTabElmt.appendChild(tsTabBtnElmt);

        let tsTabContentElmt = document.createElement("div");
        tsTabContentElmt.classList.add("tab-pane", "fade", "p-3");
        tsTabContentElmt.id = tsTabContentId;
        tsTabContentElmt.setAttribute("role", "tabpanel");
        tsTabContentElmt.setAttribute("aria-labelledby", tsTabId);
        tabContentsContainerElmt.appendChild(tsTabContentElmt);

        // Timeseries tab event listener.
        tsTabBtnElmt.addEventListener("click", (event) => {
            if (!this.#tsTabsLoaded.includes(tsTabBtnElmt.id)) {
                tsTabContentElmt.innerHTML = "";
                tsTabContentElmt.appendChild(new Spinner());

                if (this.#loadTsReqIDs[tsTabBtnElmt.id] != null) {
                    this.#internalAPIRequester.abort(this.#loadTsReqIDs[tsTabBtnElmt.id]);
                    this.#searchReqID = null;
                }

                this.#loadTsReqIDs[tsTabBtnElmt.id] = this.#internalAPIRequester.get(
                    flaskES6.urlFor(`api.events.retrieve_timeseries`, {id: eventData.id}),
                    (data) => {
                        tsTabContentElmt.innerHTML = "";

                        if (data.data.length > 0) {
                            let tsListItemsCountContainerElmt = document.createElement("div");
                            tsListItemsCountContainerElmt.classList.add("text-end", "mb-2");
                            tsTabContentElmt.appendChild(tsListItemsCountContainerElmt);

                            let tsListItemsCountFormatterElmt = document.createElement("small");
                            tsListItemsCountFormatterElmt.classList.add("text-nowrap", "text-muted");
                            tsListItemsCountContainerElmt.appendChild(tsListItemsCountFormatterElmt);

                            let tsListItemsCount = new ItemsCount();
                            tsListItemsCountFormatterElmt.appendChild(tsListItemsCount);
                            tsListItemsCount.update({firstItem: 1, lastItem: data.data.length, totalCount: data.data.length});
                        }

                        let tsListElmt = this.#createTimeseriesListElement(data.data);
                        tsTabContentElmt.appendChild(tsListElmt);

                        this.#tsTabsLoaded.push(tsTabBtnElmt.id);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        });

        return eventItemElmt;
    }

    #createTimeseriesListElement(tsList) {
        let tsListElmt = null;
        if (tsList.length > 0) {
            tsListElmt = document.createElement("div");
            tsListElmt.classList.add("list-group");
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

                tsListElmt.appendChild(tsElmt);
            }
        }
        else {
            tsListElmt = document.createElement("span");
            tsListElmt.classList.add("fst-italic", "text-muted", "text-center");
            tsListElmt.innerText = "No data";
        }
        return tsListElmt;
    }

    refresh() {
        this.#itemsCountElmt.setLoading();
        this.#eventsContainerElmt.innerHTML = "";
        this.#eventsContainerElmt.appendChild(new Spinner());

        let searchOptions = {
            "page_size": this.#pageSizeElmt.current,
            "page": this.#paginationElmt.page,
            "sort": this.#sortInputElmt.value,
        };
        if (this.#timestampMinSearchFilterElmt.date != null) {
            searchOptions["date_min"] = this.#timestampMinSearchFilterElmt.date;
        }
        if (this.#timestampMinSearchFilterElmt.time != null) {
            searchOptions["time_min"] = this.#timestampMinSearchFilterElmt.time;
        }
        if (this.#timestampMaxSearchFilterElmt.date != null) {
            searchOptions["date_max"] = this.#timestampMaxSearchFilterElmt.date;
        }
        if (this.#timestampMaxSearchFilterElmt.time != null) {
            searchOptions["time_max"] = this.#timestampMaxSearchFilterElmt.time;
        }
        if (this.#sourceSearchFilterElmt.value != "") {
            searchOptions["source"] = this.#sourceSearchFilterElmt.value;
        }
        for (let [searchOptName, searchOpts] of Object.entries(this.#searchSelectFilters)) {
            if (searchOpts["htmlElement"].value != "None") {
                searchOptions[searchOptName] = searchOpts["htmlElement"].value;
            }
        }

        if (this.#searchReqID != null) {
            this.#internalAPIRequester.abort(this.#searchReqID);
            this.#searchReqID = null;
        }

        this.#searchReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_list`, searchOptions),
            (data) => {
                this.#eventsContainerElmt.innerHTML = "";
                if (data.data.length > 0) {
                    for (let row of data.data) {
                        let eventItemElmt = this.#createEventElement(row);
                        this.#eventsContainerElmt.appendChild(eventItemElmt);
                    }
                }
                else {
                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noItemElmt.innerText = "No search results";
                    this.#eventsContainerElmt.appendChild(noItemElmt);
                }

                let paginationOpts = {
                    pageSize: this.#pageSizeElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#paginationElmt.reload(paginationOpts);
                this.#itemsCountElmt.update({totalCount: this.#paginationElmt.totalItems, firstItem: this.#paginationElmt.startItem, lastItem: this.#paginationElmt.endItem});
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}

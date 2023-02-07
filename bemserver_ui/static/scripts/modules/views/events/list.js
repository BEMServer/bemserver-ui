import { flaskES6 } from "../../../app.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import "../../components/itemsCount.js";
import "../../components/pagination.js";
import "../../components/time/datetimePicker.js";
import { FilterSelect } from "../../components/filterSelect.js";
import { TimeDisplay } from "../../tools/time.js";
import { Parser } from "../../tools/parser.js";
import { EventLevelBadge } from "../../components/eventLevel.js";
import { StructuralElementSelector } from "../../components/structuralElements/selector.js";


export class EventListView {

    #structuralElementTypes = []
    #tzName = "UTC";
    #defaultFilters = {};
    #defaultEventInfoTabListPageSize = 10;

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;
    #loadEventInfoTabReqIDs = {};
    #loadEventInfoTabReqPageIDs = {};
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #messagesElmt = null;

    #filtersContainerElmt = null;
    #sourceSearchFilterElmt = null;
    #timestampMinSearchFilterElmt = null;
    #timestampMaxSearchFilterElmt = null;
    #btnRemoveFiltersElmt = null;
    #searchSelectFilters = {};
    #dataFilters = {};
    #siteSelector = null;
    #zoneSelector = null;
    #siteSelectorRecursiveSwitchElmt = null;

    #sort = []
    #sortLinkTimestampElmt = null;

    #itemsCountElmt = null;
    #pageSizeElmt = null;
    #paginationElmt = null;

    #eventsTableElmt = null;
    #eventsHeaderElmt = null;
    #eventsContainerElmt = null;
    #eventInfoModalElmt = null;

    #eventEditLinkElmt = null;
    #eventInfoContainerElmt = null;
    #eventInfoTabElmts = {};
    #eventInfoTabContentElmts = {};
    #eventInfoTotalCountElmts = {};
    #eventInfoTabItemsCountElmts = {};
    #eventInfoTabPaginationElmts = {};
    #eventInfoTabListContainerElmts = {};
    #eventInfoTabSpinnerElmt = null;
    #eventInfoTabsElmt = null;
    #eventInfoTabContentsElmt = null;

    #currentEventElmt = null;
    #eventInfoRowIndexElmt = null;
    #eventInfoRowCountElmt = null;
    #eventInfoPageIndexElmt = null;
    #eventInfoPageCountElmt = null;
    #eventInfoNavFirstElmt = null;
    #eventInfoNavPreviousElmt = null;
    #eventInfoNavNextElmt = null;
    #eventInfoNavLastElmt = null;

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();

        this.#initSort();
        this.#initFilters();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#structuralElementTypes = options.structuralElementTypes || [];
        this.#tzName = options.timezone || "UTC";
        for (let [optFilterName, optFilterValue] of Object.entries(options.filters || {})) {
            this.#defaultFilters[optFilterName] = optFilterValue;
        }
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#siteSelector = StructuralElementSelector.getInstance("siteSelector");
        this.#zoneSelector = StructuralElementSelector.getInstance("zoneSelector");
        this.#siteSelectorRecursiveSwitchElmt = document.getElementById("siteSelectorRecursiveSwitch");

        this.#filtersContainerElmt = document.getElementById("filtersContainer");
        this.#sourceSearchFilterElmt = document.getElementById("sourceSearch");
        this.#timestampMinSearchFilterElmt = document.getElementById("timestamp_min");
        this.#timestampMaxSearchFilterElmt = document.getElementById("timestamp_max");
        this.#btnRemoveFiltersElmt = document.getElementById("removeFiltersBtn");

        this.#sortLinkTimestampElmt = document.getElementById("sort-timestamp");

        this.#itemsCountElmt = document.getElementById("itemsCount");
        this.#pageSizeElmt = document.getElementById("pageSize");
        this.#paginationElmt = document.getElementById("pagination");

        this.#eventsTableElmt = document.getElementById("eventsTable");
        this.#eventsHeaderElmt = document.getElementById("eventsHeader");
        this.#eventsContainerElmt = document.getElementById("eventsContainer");
        this.#eventInfoModalElmt = document.getElementById("eventInfoModal");

        this.#eventEditLinkElmt = document.getElementById("eventEditLink");
        this.#eventInfoContainerElmt = document.getElementById("eventInfoContainer");
        this.#eventInfoTabElmts["ts"] = document.getElementById("ts-tab");
        this.#eventInfoTabContentElmts["ts"] = document.getElementById("ts-tabcontent");
        this.#eventInfoTotalCountElmts["ts"] = document.getElementById("tsTotalCount");
        this.#eventInfoTabItemsCountElmts["ts"] = document.getElementById("tsItemsCount");
        this.#eventInfoTabPaginationElmts["ts"] = document.getElementById("tsPagination");
        this.#eventInfoTabListContainerElmts["ts"] = document.getElementById("tsListContainer");
        for (let structuralElment of this.#structuralElementTypes) {
            this.#eventInfoTabElmts[structuralElment] = document.getElementById(`${structuralElment}s-tab`);
            this.#eventInfoTabContentElmts[structuralElment] = document.getElementById(`${structuralElment}s-tabcontent`);
            this.#eventInfoTotalCountElmts[structuralElment] = document.getElementById(`${structuralElment}sTotalCount`);
            this.#eventInfoTabItemsCountElmts[structuralElment] = document.getElementById(`${structuralElment}sItemsCount`);
            this.#eventInfoTabPaginationElmts[structuralElment] = document.getElementById(`${structuralElment}sPagination`);
            this.#eventInfoTabListContainerElmts[structuralElment] = document.getElementById(`${structuralElment}sListContainer`);
        }
        this.#eventInfoTabSpinnerElmt = document.getElementById("eventInfoTabSpinner");
        this.#eventInfoTabsElmt = document.getElementById("eventInfoTabs");
        this.#eventInfoTabContentsElmt = document.getElementById("eventInfoTabContents");

        this.#eventInfoRowIndexElmt = document.getElementById("eventInfoRowIndex");
        this.#eventInfoRowCountElmt = document.getElementById("eventInfoRowCount");
        this.#eventInfoPageIndexElmt = document.getElementById("eventInfoPageIndex");
        this.#eventInfoPageCountElmt = document.getElementById("eventInfoPageCount");
        this.#eventInfoNavFirstElmt = document.getElementById("eventInfoNavFirst");
        this.#eventInfoNavPreviousElmt = document.getElementById("eventInfoNavPrevious");
        this.#eventInfoNavNextElmt = document.getElementById("eventInfoNavNext");
        this.#eventInfoNavLastElmt = document.getElementById("eventInfoNavLast");
    }

    #initSort() {
        let sortField = this.#sortLinkTimestampElmt.getAttribute("data-field") || "";
        let sortDirection = this.#sortLinkTimestampElmt.getAttribute("data-direction") || "";
        let sortData = `${sortDirection}${sortField}`;
        if (sortData != "") {
            this.#sort.push(sortData);
        }
    }

    #initFilters() {
        this.#searchSelectFilters = {
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
            "campaign_scope": {
                "label": "campaign scopes",
                "fetchUrl": flaskES6.urlFor(`api.campaign_scopes.retrieve_list`),
                "htmlElement": new FilterSelect(),
                "defaultValue": (this.#defaultFilters["campaign-scope"] || null)?.toString(),
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
                        return {value: row.id.toString(), text: `${searchSelectFilterKey == "level" ? "= " : ""}${row.name}`};
                    });
                    selectOptions.splice(0, 0, {value: "None", text: `All ${searchSelectFilterOpts["label"]}`});
                    if (searchSelectFilterKey == "level") {
                        for (let row of filterData) {
                            selectOptions.push({value: `${row.id.toString()}_min`, text: `>= ${row.name}`});
                        }
                    }

                    let searchSelectFilterElmt = searchSelectFilterOpts["htmlElement"];
                    this.#filtersContainerElmt.insertBefore(searchSelectFilterElmt, this.#btnRemoveFiltersElmt);
                    searchSelectFilterElmt.load(selectOptions, selectedOptionIndex);
                    searchSelectFilterElmt.addEventListener("change", (event) => {
                        event.preventDefault();

                        this.#paginationElmt.page = 1;
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
            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#timestampMaxSearchFilterElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#timestampMinSearchFilterElmt.dateMax = this.#timestampMaxSearchFilterElmt.date;
            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#sourceSearchFilterElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateSourceSearch();
            this.#paginationElmt.page = 1;
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
                this.#updateSourceSearch();
                hasFilterChanged = true;
            }
            for (let searchFilterElmt of Object.values(this.#searchSelectFilters).map((filterOpts) => { return filterOpts["htmlElement"]; })) {
                if (!searchFilterElmt.isDefaultSelected) {
                    searchFilterElmt.reset();
                    hasFilterChanged = true;
                }
            }
            if (this.#siteSelector.selectedData != null) {
                this.#siteSelector.unselect();
                hasFilterChanged = true;
            }
            if (this.#zoneSelector.selectedData != null) {
                this.#zoneSelector.unselect();
                hasFilterChanged = true;
            }
            if (hasFilterChanged) {
                this.#paginationElmt.page = 1;
                this.refresh();
            }
        });

        this.#sortLinkTimestampElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let sortField = this.#sortLinkTimestampElmt.getAttribute("data-field");
            let sortDirection = this.#sortLinkTimestampElmt.getAttribute("data-direction");

            let newSortDirection = sortDirection == "-" ? "+" : "-";
            this.#sortLinkTimestampElmt.setAttribute("data-direction", newSortDirection);

            let sortIconElmt = this.#sortLinkTimestampElmt.querySelector(`i[class^="bi bi-"]`);
            if (sortIconElmt.classList.contains("bi-sort-up")) {
                sortIconElmt.classList.remove("bi-sort-up");
                sortIconElmt.classList.add("bi-sort-down");
            }
            else {
                sortIconElmt.classList.remove("bi-sort-down");
                sortIconElmt.classList.add("bi-sort-up");
            }

            let oldSortData = `${sortDirection}${sortField}`;
            let newSortData = `${newSortDirection}${sortField}`;

            // Remove previous sort on field.
            let sortIndex = this.#sort.indexOf(oldSortData);
            if (sortIndex != -1) {
                this.#sort.splice(sortIndex, 1);
            }
            // Add new sort on field.
            if (newSortData != "") {
                this.#sort.push(newSortData);
            }

            this.refresh();
        });

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

        this.#eventInfoModalElmt.addEventListener("show.bs.modal", (event) => {
            // event.relatedTarget is the HTML element that triggered the modal
            this.#currentEventElmt = event.relatedTarget;
            this.#loadEventInfo();
        });

        this.#eventInfoModalElmt.addEventListener("hide.bs.modal", (event) => {
            this.#currentEventElmt.classList.remove("app-table-tr-selected");
            this.#currentEventElmt = null;
        });

        this.#eventInfoNavFirstElmt.addEventListener("click", (event) => {
            if (this.#currentEventElmt != null) {
                this.#currentEventElmt.classList.remove("app-table-tr-selected");
            }

            let updateAndLoadEventInfo = () => {
                // Get event at index=0 in table.
                this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="0"]`);
                this.#loadEventInfo();
            };

            // Need to load first page before loading event info?
            if (this.#paginationElmt.page != this.#paginationElmt.firstPage) {
                this.#paginationElmt.page = this.#paginationElmt.firstPage;
                this.refresh(updateAndLoadEventInfo);
            }
            else {
                updateAndLoadEventInfo();
            }
        });

        this.#eventInfoNavPreviousElmt.addEventListener("click", (event) => {
            let curIndex = 0;
            if (this.#currentEventElmt != null) {
                curIndex = Parser.parseIntOrDefault(this.#currentEventElmt.getAttribute("data-index"), 0);
                this.#currentEventElmt.classList.remove("app-table-tr-selected");
            }

            // Need to load previous page before loading event info?
            if (curIndex <= 0 && this.#paginationElmt.previousPage < this.#paginationElmt.page) {
                this.#paginationElmt.page = this.#paginationElmt.previousPage;
                this.refresh(() => {
                    // Get event at index=PAGE_SIZE in table.
                    this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="${this.#eventsContainerElmt.rows.length - 1}"]`);
                    this.#loadEventInfo();
                });
            }
            else {
                // Get event at index=curIndex-1 in table.
                let prevIndex = Math.max(0, curIndex - 1);
                this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="${prevIndex}"]`);
                this.#loadEventInfo();
            }
        });

        this.#eventInfoNavNextElmt.addEventListener("click", (event) => {
            let curIndex = 0;
            if (this.#currentEventElmt != null) {
                curIndex = Parser.parseIntOrDefault(this.#currentEventElmt.getAttribute("data-index"), 0);
                this.#currentEventElmt.classList.remove("app-table-tr-selected");
            }

            // Need to load next page before loading event info?
            if (curIndex >= this.#eventsContainerElmt.rows.length - 1 && this.#paginationElmt.nextPage > this.#paginationElmt.page) {
                this.#paginationElmt.page = this.#paginationElmt.nextPage;
                this.refresh(() => {
                    // Get event at index=0 in table.
                    this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="0"]`);
                    this.#loadEventInfo();
                });
            }
            else {
                // Get event at index=curIndex+1 in table.
                let nextIndex = Math.min(Math.max(0, this.#eventsContainerElmt.rows.length - 1), curIndex + 1);
                this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="${nextIndex}"]`);
                this.#loadEventInfo();
            }
        });

        this.#eventInfoNavLastElmt.addEventListener("click", (event) => {
            if (this.#currentEventElmt != null) {
                this.#currentEventElmt.classList.remove("app-table-tr-selected");
            }

            let updateAndLoadEventInfo = () => {
                // Get event at index=PAGE_SIZE in table.
                this.#currentEventElmt = this.#eventsContainerElmt.querySelector(`tr[data-index="${this.#eventsContainerElmt.rows.length - 1}"]`);
                this.#loadEventInfo();
            };

            // Need to load last page before loading event info?
            if (this.#paginationElmt.lastPage > this.#paginationElmt.page) {
                this.#paginationElmt.page = this.#paginationElmt.lastPage;
                this.refresh(updateAndLoadEventInfo);
            }
            else {
                updateAndLoadEventInfo();
            }
        });

        window.addEventListener("resize", (event) => {
            let descriptionCellWidth = this.#eventsTableElmt.offsetWidth * 0.25;
            for (let rowElmt of this.#eventsContainerElmt.rows) {
                rowElmt.cells.item(rowElmt.cells.length - 1).style.maxWidth = `${descriptionCellWidth}px`;
            }
        });

        this.#siteSelector.addEventListener("treeNodeSelect", (event) => {
            if (event.detail.type == "space") {
                this.#siteSelectorRecursiveSwitchElmt.checked = false;
                this.#siteSelectorRecursiveSwitchElmt.setAttribute("disabled", true);
            }
            else {
                this.#siteSelectorRecursiveSwitchElmt.removeAttribute("disabled");
            }

            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#siteSelector.addEventListener("treeNodeUnselect", () => {
            this.#siteSelectorRecursiveSwitchElmt.removeAttribute("disabled");

            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#zoneSelector.addEventListener("treeNodeSelect", () => {
            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#zoneSelector.addEventListener("treeNodeUnselect", () => {
            this.#paginationElmt.page = 1;
            this.refresh();
        });

        this.#siteSelectorRecursiveSwitchElmt.addEventListener("change", () => {
            if (this.#siteSelector.selectedData != null)
            {
                this.#paginationElmt.page = 1;
                this.refresh();
            }
        });
    }

    #updateSourceSearch() {
        if (this.#sourceSearchFilterElmt.value == "") {
            this.#sourceSearchFilterElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else if (!this.#sourceSearchFilterElmt.classList.contains("border-info")) {
            this.#sourceSearchFilterElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
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

    #loadEventInfo() {
        if (this.#currentEventElmt != null) {
            let eventId = this.#currentEventElmt.getAttribute("data-event");
            let rowIndex = Parser.parseIntOrDefault(this.#currentEventElmt.getAttribute("data-index"), 0);

            this.#currentEventElmt.classList.add("app-table-tr-selected");

            // Update event edit link button.
            this.#eventEditLinkElmt.href = flaskES6.urlFor(`events.edit`, {id: eventId});

            // Update footer navigation (on page-sized events table).
            let itemIndex = ((this.#paginationElmt.page - 1) * this.#pageSizeElmt.current) + rowIndex + 1;
            this.#eventInfoRowIndexElmt.innerText = itemIndex.toString();
            this.#eventInfoRowCountElmt.innerText = this.#paginationElmt.totalItems.toString();
            this.#eventInfoPageIndexElmt.innerText = this.#paginationElmt.page.toString();
            this.#eventInfoPageCountElmt.innerText = this.#paginationElmt.lastPage.toString();
            if (itemIndex <= 1) {
                this.#eventInfoNavFirstElmt.parentElement.classList.add("disabled");
                this.#eventInfoNavPreviousElmt.parentElement.classList.add("disabled");
                this.#eventInfoNavNextElmt.parentElement.classList.remove("disabled");
                this.#eventInfoNavLastElmt.parentElement.classList.remove("disabled");
            }
            else {
                this.#eventInfoNavFirstElmt.parentElement.classList.remove("disabled");
                this.#eventInfoNavPreviousElmt.parentElement.classList.remove("disabled");
            }
            if (itemIndex >= this.#paginationElmt.totalItems) {
                this.#eventInfoNavNextElmt.parentElement.classList.add("disabled");
                this.#eventInfoNavLastElmt.parentElement.classList.add("disabled");
            }
            else {
                this.#eventInfoNavNextElmt.parentElement.classList.remove("disabled");
                this.#eventInfoNavLastElmt.parentElement.classList.remove("disabled");
            }

            // Pick event general info from selected table row.
            this.#eventInfoContainerElmt.innerHTML = "";
            for (let [cellIndex, headerCellElmt] of Object.entries(this.#eventsHeaderElmt.cells)) {
                let colElmt = document.createElement("div");
                colElmt.classList.add("col-auto");
                this.#eventInfoContainerElmt.appendChild(colElmt);

                // Header cell can be sorted and therefore have a link which we do not want to display here.
                let headerText = headerCellElmt.innerHTML;
                let headerSortElmt = headerCellElmt.querySelector("a");
                if (headerSortElmt != null) {
                    headerText = headerSortElmt.querySelector("span").innerHTML;
                }

                let headerInfoElmt = document.createElement("h6");
                headerInfoElmt.classList.add("fw-bold");
                headerInfoElmt.innerHTML = headerText;
                colElmt.appendChild(headerInfoElmt);
                let valueInfoElmt = document.createElement("p");
                valueInfoElmt.innerHTML = this.#currentEventElmt.cells[cellIndex].innerHTML;
                colElmt.appendChild(valueInfoElmt);
            }

            // Load event info tabs (timeseries, sites...).
            this.#loadEventInfoTabs(eventId);
        }
    }

    #loadEventInfoTabs(eventId) {
        // Show event info tabs spinner loader.
        this.#eventInfoTabSpinnerElmt.classList.remove("d-none");
        // Hide all event info tabs and contents until data on timeseries or structural elements (if any) is loaded.
        this.#eventInfoTabsElmt.classList.add("d-none");
        this.#eventInfoTabContentsElmt.classList.add("d-none");
        for (let eventInfoTabElmt of Object.values(this.#eventInfoTabElmts)) {
            eventInfoTabElmt.classList.remove("active");
        }
        for (let eventInfoTabContentElmt of Object.values(this.#eventInfoTabContentElmts)) {
            eventInfoTabContentElmt.classList.remove("show", "active");
        }

        // Init web request data, used to load event info tabs.
        let eventInfoTabReqData = {
            "ts": {
                "fetchUrl": `api.events.retrieve_timeseries`,
                "fetchUrlParams": {id: eventId, page_size: this.#defaultEventInfoTabListPageSize},
                "listItemRenderer": this.#createTimeseriesElement,
                "iconClasses": ["bi", "bi-clock-history", "me-1"],
            },
        };
        for (let structuralElmentType of this.#structuralElementTypes) {
            eventInfoTabReqData[structuralElmentType] = {
                "fetchUrl": `api.events.retrieve_structural_elements`,
                "fetchUrlParams": {id: eventId, type: structuralElmentType, page_size: this.#defaultEventInfoTabListPageSize},
                "listItemRenderer": this.#createStructuralElementsElement,
                "iconClasses": structuralElmentType != "zone" ? ["bi", "bi-building", "me-1"] : ["bi", "bi-bullseye", "me-1"],
            };
        }

        // Abort previous event info tab web request, if any.
        for (let [eventInfoTabFetchUrl, eventInfoTabReqID] of Object.entries(this.#loadEventInfoTabReqIDs)) {
            this.#internalAPIRequester.abort(eventInfoTabReqID);
            this.#loadEventInfoTabReqIDs[eventInfoTabFetchUrl] = null;
        }

        let nbTabLoaded = 0;

        // Execute web request and load data on tabs.
        this.#loadEventInfoTabReqIDs = this.#internalAPIRequester.gets(
            Object.values(eventInfoTabReqData).map((eventInfoTabReqOpts) => { return flaskES6.urlFor(eventInfoTabReqOpts["fetchUrl"], eventInfoTabReqOpts["fetchUrlParams"]); }),
            (data) => {
                for (let [index, eventInfoTabData] of Object.entries(data)) {
                    let eventInfoTabDataPagination = eventInfoTabData.pagination;
                    eventInfoTabData = eventInfoTabData.data != undefined ? eventInfoTabData.data : eventInfoTabData;

                    let eventInfoTabKey = Object.keys(eventInfoTabReqData)[index];
                    let eventInfoReqOpts = eventInfoTabReqData[eventInfoTabKey];

                    this.#eventInfoTotalCountElmts[eventInfoTabKey].innerText = eventInfoTabDataPagination.total.toString();
                    this.#eventInfoTabListContainerElmts[eventInfoTabKey].innerHTML = "";

                    if (eventInfoTabData.length > 0) {
                        this.#updateEventInfoTab(eventInfoTabData, eventInfoTabDataPagination, eventInfoTabKey, eventInfoReqOpts);

                        this.#eventInfoTabContentElmts[eventInfoTabKey].addEventListener("pageItemClick", (event) => {
                            if (this.#loadEventInfoTabReqPageIDs[eventInfoTabKey] != null) {
                                this.#internalAPIRequester.abort(this.#loadEventInfoTabReqPageIDs[eventInfoTabKey]);
                                this.#loadEventInfoTabReqPageIDs[eventInfoTabKey] = null;
                            }

                            this.#eventInfoTabListContainerElmts[eventInfoTabKey].innerHTML = "";
                            this.#eventInfoTabListContainerElmts[eventInfoTabKey].appendChild(new Spinner());

                            let eventInfoReqParams = eventInfoReqOpts["fetchUrlParams"];
                            eventInfoReqParams["page"] = event.detail.page;

                            this.#loadEventInfoTabReqPageIDs[eventInfoTabKey] = this.#internalAPIRequester.get(
                                flaskES6.urlFor(eventInfoReqOpts["fetchUrl"], eventInfoReqParams),
                                (dataTab) => {
                                    let dataTabPagination = dataTab.pagination;
                                    dataTab = dataTab.data != undefined ? dataTab.data : dataTab;

                                    this.#updateEventInfoTab(dataTab, dataTabPagination, eventInfoTabKey, eventInfoReqOpts);
                                },
                                (error) => {
                                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                },
                            );
                        });

                        this.#eventInfoTabElmts[eventInfoTabKey].classList.remove("disabled", "d-none");
                        this.#eventInfoTabContentElmts[eventInfoTabKey].classList.remove("d-none");
                        nbTabLoaded += 1;

                        // Activate and show the first event info tab that could be loaded.
                        if (nbTabLoaded == 1) {
                            this.#eventInfoTabElmts[eventInfoTabKey].classList.add("active");
                            this.#eventInfoTabContentElmts[eventInfoTabKey].classList.add("show", "active");
                        }
                    }
                    else {
                        this.#eventInfoTabElmts[eventInfoTabKey].classList.add("disabled", "d-none");
                        this.#eventInfoTabContentElmts[eventInfoTabKey].classList.add("d-none");
                    }
                }

                // Hide event info tabs spinner loader.
                this.#eventInfoTabSpinnerElmt.classList.add("d-none");
            },
            (error) => {
                // Hide event info tabs spinner loader.
                this.#eventInfoTabSpinnerElmt.classList.add("d-none");

                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            () => {
                // Show event info tabs and contents if at least one tab has been loaded.
                if (nbTabLoaded > 0) {
                    this.#eventInfoTabsElmt.classList.remove("d-none");
                    this.#eventInfoTabContentsElmt.classList.remove("d-none");
                }
            },
        );
    }

    #updateEventInfoTab(data, pagination, eventInfoTabKey, eventInfoTabOpts) {
        this.#eventInfoTabListContainerElmts[eventInfoTabKey].innerHTML = "";

        if (data.length > 0) {
            if (eventInfoTabOpts["listItemRenderer"] != null) {
                for (let dataRow of data) {
                    let listItemElmt = eventInfoTabOpts["listItemRenderer"](dataRow, eventInfoTabOpts["iconClasses"]);
                    this.#eventInfoTabListContainerElmts[eventInfoTabKey].appendChild(listItemElmt);
                }
            }
        }
        else {
            let noDataElmt = document.createElement("span");
            noDataElmt.classList.add("fst-italic", "text-muted", "text-center");
            noDataElmt.innerText = "No data";
            this.#eventInfoTabListContainerElmts[eventInfoTabKey].appendChild(noDataElmt);
        }

        this.#eventInfoTabPaginationElmts[eventInfoTabKey].reload({
            pageSize: this.#defaultEventInfoTabListPageSize,
            totalItems: pagination.total,
            totalPages: pagination.total_pages,
            page: pagination.page,
            firstPage: pagination.first_page,
            lastPage: pagination.last_page,
            previousPage: pagination.previous_page,
            nextPage: pagination.next_page,
        });

        this.#eventInfoTabItemsCountElmts[eventInfoTabKey].update({
            firstItem: this.#eventInfoTabPaginationElmts[eventInfoTabKey].startItem,
            lastItem: this.#eventInfoTabPaginationElmts[eventInfoTabKey].endItem,
            totalCount: this.#eventInfoTabPaginationElmts[eventInfoTabKey].totalItems,
        });
    }

    #createEventElement(eventData, rowIndex) {
        let eventElmt = document.createElement("tr");
        eventElmt.classList.add("align-middle");
        eventElmt.setAttribute("role", "button");
        eventElmt.setAttribute("data-bs-toggle", "modal");
        eventElmt.setAttribute("data-bs-target", "#eventInfoModal");
        eventElmt.setAttribute("data-event", eventData.id);
        eventElmt.setAttribute("data-index", rowIndex)

        let timestampElmt = document.createElement("th");
        timestampElmt.setAttribute("scope", "row");
        timestampElmt.innerText = TimeDisplay.toLocaleString(new Date(eventData.timestamp), {timezone: this.#tzName});
        eventElmt.appendChild(timestampElmt);

        let sourceElmt = document.createElement("td");
        sourceElmt.innerText = eventData.source;
        eventElmt.appendChild(sourceElmt);

        let levelCellElmt = document.createElement("td");
        eventElmt.appendChild(levelCellElmt);
        let levelData = this.#getLevelData(eventData.level);
        if (levelData != null) {
            let levelBadgeElmt = new EventLevelBadge();
            levelBadgeElmt.setAttribute("level", levelData.name.toUpperCase());
            levelCellElmt.appendChild(levelBadgeElmt);
        }

        let categoryElmt = document.createElement("td");
        let categoryData = this.#getCategoryData(eventData.category_id);
        categoryElmt.innerText = categoryData != null ? categoryData.name : "?";
        eventElmt.appendChild(categoryElmt);

        let campaignScopeElmt = document.createElement("td");
        let campaignScopeData = this.#getCampaignScopeData(eventData.campaign_scope_id);
        campaignScopeElmt.innerText = campaignScopeData != null ? campaignScopeData.name : "?";
        eventElmt.appendChild(campaignScopeElmt);

        let descriptionElmt = document.createElement("td");
        descriptionElmt.classList.add("text-truncate");
        descriptionElmt.style.maxWidth = `${this.#eventsTableElmt.offsetWidth * 0.25}px`;
        descriptionElmt.innerText = eventData.description != null ? eventData.description : "-";
        eventElmt.appendChild(descriptionElmt);

        return eventElmt;
    }

    #createTimeseriesElement(tsData, iconClasses) {
        let tsElmt = document.createElement("div");
        tsElmt.classList.add("list-group-item");

        let tsHeaderElmt = document.createElement("div");
        tsHeaderElmt.classList.add("d-flex", "gap-1");

        let iconElmt = document.createElement("i");
        iconElmt.classList.add(...iconClasses);
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

        return tsElmt;
    }

    #createStructuralElementsElement(structuralElementData, iconClasses) {
        let structuralElementElmt = document.createElement("div");
        structuralElementElmt.classList.add("list-group-item");

        let structuralElementHeaderElmt = document.createElement("div");
        structuralElementHeaderElmt.classList.add("d-flex", "align-items-center", "gap-1");
        structuralElementElmt.appendChild(structuralElementHeaderElmt);

        let iconElmt = document.createElement("i");
        iconElmt.classList.add(...iconClasses);
        structuralElementHeaderElmt.appendChild(iconElmt);

        let nameSpanElmt = document.createElement("span");
        nameSpanElmt.classList.add("fw-bold", "text-break");
        nameSpanElmt.innerText = structuralElementData.name;
        structuralElementHeaderElmt.appendChild(nameSpanElmt);

        if (structuralElementData.path != null) {
            let pathElmt = document.createElement("small");
            pathElmt.classList.add("text-muted", "ms-3");
            pathElmt.innerText = structuralElementData.path;
            structuralElementHeaderElmt.appendChild(pathElmt);
        }

        let descElmt = document.createElement("small");
        descElmt.classList.add("fst-italic", "text-muted");
        descElmt.innerText = structuralElementData.description;
        structuralElementElmt.appendChild(descElmt);

        return structuralElementElmt;
    }

    #loadSitesTreeData() {
        this.#siteSelector.showLoadingTree();

        if (this.#sitesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#sitesTreeReqID);
            this.#sitesTreeReqID = null;
        }

        this.#sitesTreeReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_tree_sites`),
            (data) => {
                this.#siteSelector.loadTree(data.data);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #loadZonesTreeData() {
        this.#zoneSelector.showLoadingTree();

        if (this.#zonesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#zonesTreeReqID);
            this.#zonesTreeReqID = null;
        }

        this.#zonesTreeReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.structural_elements.retrieve_tree_zones`),
            (data) => {
                this.#zoneSelector.loadTree(data.data);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    refresh(afterResfreshCallback = null) {
        if (this.#searchReqID != null) {
            this.#internalAPIRequester.abort(this.#searchReqID);
            this.#searchReqID = null;
        }

        this.#itemsCountElmt.setLoading();
        this.#eventsContainerElmt.innerHTML = "";
        let loadingContainerElmt = document.createElement("tr");
        let loadingElmt = document.createElement("td");
        loadingElmt.classList.add("text-center", "p-4");
        loadingElmt.setAttribute("colspan", 6);
        loadingElmt.appendChild(new Spinner());
        loadingContainerElmt.appendChild(loadingElmt);
        this.#eventsContainerElmt.appendChild(loadingContainerElmt);

        let searchOptions = {
            "page_size": this.#pageSizeElmt.current,
            "page": this.#paginationElmt.page,
            "sort": this.#sort.join(),
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
            searchOptions["in_source"] = this.#sourceSearchFilterElmt.value;
        }
        for (let [searchOptName, searchOpts] of Object.entries(this.#searchSelectFilters)) {
            if (searchOpts["htmlElement"].value != "None") {
                let searchOptValue = searchOpts["htmlElement"].value;
                if (searchOptValue.endsWith("_min")) {
                    searchOptName = `${searchOptName}_min`;
                    searchOptValue = searchOptValue.replace("_min", "");
                }
                searchOptions[searchOptName] = searchOptValue;
            }
        }
        if (this.#siteSelector.selectedData != null) {
            searchOptions[`${this.#siteSelectorRecursiveSwitchElmt.checked ? "recurse_" : ""}${this.#siteSelector.selectedData.type}_id`] = this.#siteSelector.selectedData.id;
        }
        if (this.#zoneSelector.selectedData != null) {
            searchOptions["zone_id"] = this.#zoneSelector.selectedData.id;
        }

        this.#searchReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_list`, searchOptions),
            (data) => {
                this.#eventsContainerElmt.innerHTML = "";
                if (data.data.length > 0) {
                    for (let [rowIndex, row] of data.data.entries()) {
                        let eventItemElmt = this.#createEventElement(row, rowIndex);
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

                afterResfreshCallback?.();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    mount() {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();
    }
}

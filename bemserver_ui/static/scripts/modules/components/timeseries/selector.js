import { FilterSelect } from "../filterSelect.js";
import "../pagination.js";
import "../itemsCount.js";
import { FlashMessageTypes, FlashMessage } from "../flash.js";
import { Spinner } from "../spinner.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { Parser } from "../../tools/parser.js";
import { flaskES6 } from "../../../app.js";
import { StructuralElementSelector } from "../structuralElements/selector.js";


class TimeseriesItem {

    get label() {
        return `${this.name}${this.unit_symbol ? ` [${this.unit_symbol}]` : ""}`;
    }

    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.unit_symbol = data.unit_symbol;
        this.campaign_id = data.campaign_id;
        this.campaign_scope_id = data.campaign_scope_id;
    }
}


export class SelectedItem extends HTMLDivElement {

    #tsItem = null;

    #removeBtnElmt = null;

    constructor(tsItem) {
        super();

        this.#tsItem = tsItem;
    }

    get timeseries() {
        return this.#tsItem;
    }

    #initEventListeners() {
        this.#removeBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.remove();

            let removeEvent = new CustomEvent(
                "remove",
                { detail: this.#tsItem },
            );
            this.dispatchEvent(removeEvent);
        });

        this.#removeBtnElmt.addEventListener("mouseover", (event) => {
            event.preventDefault();

            this.#removeBtnElmt.classList.add("fw-bold");
            this.classList.replace("bg-primary", "bg-warning");
            this.classList.add("border-warning");
        });

        this.#removeBtnElmt.addEventListener("mouseleave", (event) => {
            event.preventDefault();

            this.#removeBtnElmt.classList.remove("fw-bold");
            this.classList.replace("bg-warning", "bg-primary");
            this.classList.remove("border-warning");
        });
    }

    connectedCallback() {
        this.innerHTML = "";

        this.style.maxWidth = "250px";
        this.classList.add("hstack", "badge", "rounded-pill", "border", "bg-primary", "bg-opacity-25", "text-dark", "gap-2");
        this.setAttribute("data-ts-id", this.#tsItem.id);

        let textContentElmt = document.createElement("span");
        textContentElmt.style.maxWidth = "200px";
        textContentElmt.classList.add("d-inline-block", "text-truncate", "py-1");
        textContentElmt.innerText = this.#tsItem.label;
        textContentElmt.title = this.#tsItem.label;
        this.appendChild(textContentElmt)

        this.#removeBtnElmt = document.createElement("a");
        this.#removeBtnElmt.classList.add("link-danger");
        this.#removeBtnElmt.title = `Unselect ${this.#tsItem.label}`;
        this.#removeBtnElmt.setAttribute("role", "button");
        this.appendChild(this.#removeBtnElmt);

        let removeIconElmt = document.createElement("i");
        removeIconElmt.classList.add("bi", "bi-x-lg");
        this.#removeBtnElmt.appendChild(removeIconElmt);

        this.#initEventListeners();
    }
}


export class SearchResultItem extends HTMLButtonElement {

    #tsItem = null;
    #isActive = false;
    #isEnabled = true;

    constructor(tsItem, isActive = false, isEnabled = true) {
        super();

        this.#tsItem = tsItem;
        this.#isActive = isActive;
        this.#isEnabled = isEnabled;

        this.#update();
    }

    get timeseries() {
        return this.#tsItem;
    }

    get isActive() {
        return this.#isActive;
    }
    set isActive(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#isActive);
        if (cleanValue != this.#isActive) {
            this.#isActive = cleanValue;
            this.#update();
            this.#dispatchEvents();
        }
    }

    get isEnabled() {
        return this.#isEnabled;
    }
    set isEnabled(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#isEnabled);
        if (cleanValue != this.#isEnabled) {
            this.#isEnabled = cleanValue;
            this.#update();
        }
    }

    #initEventListeners() {
        this.addEventListener("click", (event) => {
            event.preventDefault();

            if (this.#isEnabled) {
                this.#isActive = !this.#isActive;
                this.#update();
                this.#dispatchEvents();
            }
        });
    }

    #dispatchEvents() {
        let eventDetail = { timeseries: this.#tsItem, isActive: this.#isActive };

        let btnEvent = new CustomEvent(
            this.#isActive ? "on" : "off",
            { detail: eventDetail, bubbles: true },
        );
        this.dispatchEvent(btnEvent);

        let btnToggleEvent = new CustomEvent(
            "toggle",
            { detail: eventDetail, bubbles: true },
        );
        this.dispatchEvent(btnToggleEvent);
    }

    #update() {
        if (this.#isActive) {
            this.classList.add("active");
        }
        else {
            this.classList.remove("active");
        }
        this.setAttribute("aria-pressed", this.#isActive);

        if (!this.#isEnabled) {
            this.setAttribute("disabled", true);
        }
        else {
            this.removeAttribute("disabled");
        }

        this.title = "";
        if (this.isEnabled) {
            this.title = `${this.#isActive ? "Uns" : "S"}elect ${this.#tsItem.label}`;
        }
    }


    connectedCallback() {
        this.innerHTML = "";
        this.style.maxWidth = "250px";
        this.classList.add("btn", "btn-sm", "btn-outline-secondary", "text-truncate");
        this.setAttribute("type", "button");
        this.setAttribute("data-bs-toggle", "button");
        this.setAttribute("data-ts-id", this.#tsItem.id)
        this.innerText = this.#tsItem.label;

        this.#initEventListeners();
    }
}


export class TimeseriesSelector extends HTMLElement {

    #allowedSelectionLimit = -1;
    #defaultFilters = {};

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;
    #selectReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #messagesElmt = null;

    #selectedItemsContainerElmt = null;
    #selectedItems = [];
    #dropdownSearchPanelElmt = null;
    #bsDropdownSearchPanel = null;

    #searchInputElmt = null;

    #searchClearBtnElmt = null;
    #filtersRemoveBtnElmt = null;
    #searchFiltersContainerElmt = null;
    #searchSelectFilters = {};

    #searchResultsContainerElmt = null;
    #searchResultsPageSizeSelectorElmt = null;
    #searchResultsCountElmt = null;
    #searchResultsPaginationElmt = null;

    #selectionLimitElmt = null;
    #countResultsSelectedElmt = null;
    #selectAllResultsBtnElmt = null;
    #unselectAllResultsBtnElmt = null;
    #clearAllSelectionBtnElmt = null;

    #siteSelector = null;
    #zoneSelector = null;
    #siteSelectorRecursiveSwitchElmt = null;

    get selectedItems() {
        return this.#selectedItems;
    }

    constructor(options = {}) {
        super();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();

        if (this.#allowedSelectionLimit != -1) {
            this.#selectionLimitElmt.innerText = `Selection limit: ${this.#allowedSelectionLimit}`;
        }
    }

    #loadOptions(options = {}) {
        this.#allowedSelectionLimit = Parser.parseIntOrDefault(this.getAttribute("selection-limit") || options.allowedSelectionLimit, this.#allowedSelectionLimit);

        let attrFilters = {};
        for (let filterAttrName of ["campaign-scope", "site", "building", "storey", "space", "zone", "extend"]) {
            if (this.hasAttribute(filterAttrName)) {
                attrFilters[filterAttrName] = this.getAttribute(filterAttrName);
            }
        }
        if (Object.keys(attrFilters).length > 0) {
            this.#defaultFilters = attrFilters;
        }
        for (let [optFilterName, optFilterValue] of Object.entries(options.filters || {})) {
            this.#defaultFilters[optFilterName] = optFilterValue;
        }
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#selectedItemsContainerElmt = document.getElementById("selectedItemsContainer");
        this.#dropdownSearchPanelElmt = document.getElementById("dropdownSearchPanel");
        this.#bsDropdownSearchPanel = bootstrap.Dropdown.getOrCreateInstance(this.#dropdownSearchPanelElmt);

        this.#searchInputElmt = document.getElementById("search");

        this.#searchClearBtnElmt = document.getElementById("clearSearchBtn");
        this.#filtersRemoveBtnElmt = document.getElementById("removeFiltersBtn");

        this.#siteSelector = StructuralElementSelector.getInstance("siteSelector");
        this.#zoneSelector = StructuralElementSelector.getInstance("zoneSelector");
        this.#siteSelectorRecursiveSwitchElmt = document.getElementById("siteSelectorRecursiveSwitch");

        this.#searchFiltersContainerElmt = document.getElementById("searchFiltersContainer");

        this.#searchResultsContainerElmt = document.getElementById("searchResultsContainer");
        this.#searchResultsPageSizeSelectorElmt = document.getElementById("searchResultsPageSizeSelector");
        this.#searchResultsCountElmt = document.getElementById("searchResultsCount");
        this.#searchResultsPaginationElmt = document.getElementById("searchResultsPagination");

        this.#selectionLimitElmt = document.getElementById("selectionLimit");
        this.#countResultsSelectedElmt = document.getElementById("countResultsSelected");
        this.#selectAllResultsBtnElmt = document.getElementById("selectAllResultsBtn");
        this.#unselectAllResultsBtnElmt = document.getElementById("unselectAllResultsBtn");
        this.#clearAllSelectionBtnElmt = document.getElementById("clearAllSelectionBtn");
    }

    #initEventListeners() {
        this.#searchInputElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateSearchInput();
            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#filtersRemoveBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            if (this.#searchInputElmt.value != "") {
                this.#searchInputElmt.value = "";
                this.#updateSearchInput();
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
                this.#searchResultsPaginationElmt.page = 1;
                this.refresh();
            }
        });

        this.#searchClearBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchInputElmt.value = "";
            this.#updateSearchInput();
            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#searchResultsPageSizeSelectorElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#searchResultsPaginationElmt.page = 1;
                this.refresh();
            }
        });

        this.#searchResultsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.refresh();
        });

        this.#selectAllResultsBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let searchResultItems = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll("button"))
            for (let item of searchResultItems) {
                if (!item.isActive && item.isEnabled) {
                    item.click();
                }
                if (this.#isSelectionLimitReached()) {
                    break;
                }
            }
        });

        this.#unselectAllResultsBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let searchResultItems = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll("button"))
            for (let item of searchResultItems) {
                if (item.isActive) {
                    item.click();
                }
            }
        });

        this.#clearAllSelectionBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.clearAllSelection();
        });

        this.#siteSelector.addEventListener("treeNodeSelect", (event) => {
            if (event.detail.type == "space") {
                this.#siteSelectorRecursiveSwitchElmt.checked = false;
                this.#siteSelectorRecursiveSwitchElmt.setAttribute("disabled", true);
            }
            else {
                this.#siteSelectorRecursiveSwitchElmt.removeAttribute("disabled");
            }

            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#siteSelector.addEventListener("treeNodeUnselect", () => {
            this.#siteSelectorRecursiveSwitchElmt.removeAttribute("disabled");

            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#zoneSelector.addEventListener("treeNodeSelect", () => {
            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#zoneSelector.addEventListener("treeNodeUnselect", () => {
            this.#searchResultsPaginationElmt.page = 1;
            this.refresh();
        });

        this.#siteSelectorRecursiveSwitchElmt.addEventListener("change", () => {
            if (this.#siteSelector.selectedData != null)
            {
                this.#searchResultsPaginationElmt.page = 1;
                this.refresh();
            }
        });
    }

    #updateSearchInput() {
        if (this.#searchInputElmt.value == "") {
            this.#searchInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else if (!this.#searchInputElmt.classList.contains("border-info")) {
            this.#searchInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    #update() {
        if (this.#searchInputElmt.value != "") {
            this.#searchClearBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#searchClearBtnElmt.classList.add("d-none", "invisible");
        }

        this.#searchResultsCountElmt.update({totalCount: this.#searchResultsPaginationElmt.totalItems, firstItem: this.#searchResultsPaginationElmt.startItem, lastItem: this.#searchResultsPaginationElmt.endItem});

        this.#updateSelectedItemsContainer();
    }

    #updateSelectedItemsContainer() {
        if (this.#selectedItems.length <= 0) {
            this.#selectedItemsContainerElmt.innerHTML = "";
        }

        this.#countResultsSelectedElmt.innerText = `No items selected`;
        if (this.#selectedItems.length > 0) {
            this.#countResultsSelectedElmt.innerText = `${this.#selectedItems.length.toString()}${this.#allowedSelectionLimit != -1 ? `/${this.#allowedSelectionLimit.toString()}`: ""} item${this.#selectedItems.length > 1 ? "s" : ""} selected out of ${this.#searchResultsPaginationElmt.totalItems.toString()}`;
        }

        if (this.#isSelectionLimitReached()) {
            this.#selectionLimitElmt.classList.replace("text-muted", "text-danger");
            this.#selectAllResultsBtnElmt.setAttribute("disabled", true);

            let notSelectedSearchResultElmts = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll(`button:not(.active)`));
            for (let searchResultItem of notSelectedSearchResultElmts) {
                searchResultItem.isEnabled = false;
            }
        }
        else {
            this.#selectionLimitElmt.classList.replace("text-danger", "text-muted");
            this.#selectAllResultsBtnElmt.removeAttribute("disabled");

            let disabledSearchResultElmts = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll(`button[disabled="true"]`));
            for (let searchResultItem of disabledSearchResultElmts) {
                searchResultItem.isEnabled = true;
            }
        }
    }

    #initFilters() {
        if (this.#defaultFilters["extend"]) {
            this.#siteSelectorRecursiveSwitchElmt.checked = Parser.parseBoolOrDefault(this.#defaultFilters["extend"].toLowerCase(), false);
        }

        this.#loadSitesTreeData();
        this.#loadZonesTreeData();

        this.#searchSelectFilters = {
            "campaign_scope_id": {
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

                    let selectedOptionIndex = 0;
                    let selectOptions = filterData.map((row, filterIndex) => {
                        if (searchSelectFilterOpts["defaultValue"] == row.id.toString()) {
                            selectedOptionIndex = filterIndex + 1;
                        }
                        return {value: row.id.toString(), text: row.name};
                    });
                    selectOptions.splice(0, 0, {value: "None", text: `All ${searchSelectFilterOpts["label"]}`});

                    let searchSelectFilterElmt = searchSelectFilterOpts["htmlElement"];
                    this.#searchFiltersContainerElmt.insertBefore(searchSelectFilterElmt, this.#filtersRemoveBtnElmt);
                    searchSelectFilterElmt.load(selectOptions, selectedOptionIndex);
                    searchSelectFilterElmt.addEventListener("change", (event) => {
                        event.preventDefault();

                        this.#searchResultsPaginationElmt.page = 1;
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

    #isSelected(tsId) {
        return this.#selectedItems.map(ts => ts.id).includes(tsId);
    }

    #isSelectionLimitReached() {
        let isLimitReached = false;
        if (this.#allowedSelectionLimit != -1) {
            isLimitReached = this.#selectedItems.length >= this.#allowedSelectionLimit;
        }
        return isLimitReached;
    }

    #canSelect(tsId) {
        return !this.#isSelected(tsId) && !this.#isSelectionLimitReached();
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

                for (let structElmtType of ["site", "building", "storey", "space"]) {
                    if (this.#defaultFilters[structElmtType]) {
                        this.#siteSelector.select(`${structElmtType}-${this.#defaultFilters[structElmtType]}`);
                        break;
                    }
                }
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

                if (this.#defaultFilters["zone"]) {
                    this.#zoneSelector.select(`zone-${this.#defaultFilters["zone"]}`);
                }
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #createSelectedItemElement(tsData, afterRemoveSelectedCallback = null) {
        let selectedItem = new SelectedItem(tsData);
        selectedItem.addEventListener("remove", (event) => {
            event.preventDefault();

            let searchResultItem = this.#searchResultsContainerElmt.querySelector(`button[data-ts-id="${tsData.id.toString()}"]`);
            searchResultItem.isActive = false;

            this.#updateSelectedItemsContainer();
            afterRemoveSelectedCallback?.();
        });

        return selectedItem
    }

    #createSearchResultItemElement(tsData, afterRemoveSelectedCallback = null) {
        let tsItem = new TimeseriesItem(tsData);
        let searchResultItem = new SearchResultItem(tsItem, this.#isSelected(tsItem.id));

        searchResultItem.addEventListener("on", (event) => {
            event.preventDefault();

            if (this.#canSelect(event.detail.timeseries.id)) {
                let selectedItem = this.#createSelectedItemElement(event.detail.timeseries, afterRemoveSelectedCallback);

                if (this.#selectedItems.length <= 0) {
                    this.#selectedItemsContainerElmt.innerHTML = "";
                }
                this.#selectedItemsContainerElmt.appendChild(selectedItem);
                this.#selectedItems.push(selectedItem.timeseries);

                this.#updateSelectedItemsContainer();
            }
            else {
                searchResultItem.isActive = false;
            }
        });

        searchResultItem.addEventListener("off", (event) => {
            event.preventDefault();

            if (this.#isSelected(event.detail.timeseries.id)) {
                this.#selectedItems = this.#selectedItems.filter(ts => ts.id != event.detail.timeseries.id);

                let selectedItem = this.#selectedItemsContainerElmt.querySelector(`div[data-ts-id="${event.detail.timeseries.id.toString()}"]`);
                selectedItem?.remove();

                this.#updateSelectedItemsContainer();
            }
        });

        searchResultItem.addEventListener("toggle", (event) => {
            event.preventDefault();

            // Update dropdown-menu position, taking in account selected items container height.
            this.#dropdownSearchPanelElmt.style.transform = `translate(0px, ${this.#selectedItemsContainerElmt.offsetHeight + this.#bsDropdownSearchPanel._config.offset[1]}px)`;

            let toggleEvent = new CustomEvent("toggleItem", { detail: event.detail, bubbles: true});
            this.dispatchEvent(toggleEvent);
        });

        return searchResultItem;
    }

    connectedCallback() {
        this.#initFilters();
        this.#initEventListeners();
        this.#update();
    }

    clearAllSelection() {
        this.#unselectAllResultsBtnElmt.click();
        if (this.#selectedItems.length > 0) {
            this.#selectedItems = [];
            this.#updateSelectedItemsContainer();
        }
    }

    select(tsId, afterSelectCallback = null) {
        tsId = Parser.parseIntOrDefault(tsId);

        let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-ts-id="${tsId.toString()}"]`);
        if (searchResultItemElmt != null) {
            searchResultItemElmt.click();

            this.#update();
            afterSelectCallback?.();
        }
        else {
            if (this.#selectReqID != null) {
                this.#internalAPIRequester.abort(this.#selectReqID);
                this.#selectReqID = null;
            }

            this.#selectReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.timeseries.retrieve_one`, {id: tsId}),
                (data) => {
                    let tsItem = new TimeseriesItem(data.data);
                    let selectedItem = this.#createSelectedItemElement(tsItem, afterSelectCallback);

                    if (this.#selectedItems.length <= 0) {
                        this.#selectedItemsContainerElmt.innerHTML = "";
                    }
                    this.#selectedItemsContainerElmt.appendChild(selectedItem);
                    this.#selectedItems.push(selectedItem.timeseries);
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                () => {
                    this.#update();
                    afterSelectCallback?.();
                },
            );
        }
    }

    refresh() {
        if (this.#searchReqID != null) {
            this.#internalAPIRequester.abort(this.#searchReqID);
            this.#searchReqID = null;
        }

        this.#searchResultsCountElmt.setLoading();
        this.#searchResultsContainerElmt.innerHTML = "";
        this.#searchResultsContainerElmt.appendChild(new Spinner());

        let searchOptions = {
            "page_size": this.#searchResultsPageSizeSelectorElmt.current,
            "page": this.#searchResultsPaginationElmt.page,
        };
        if (this.#searchInputElmt.value != "") {
            searchOptions["search"] = this.#searchInputElmt.value;
        }
        for (let [searchOptName, searchOpts] of Object.entries(this.#searchSelectFilters)) {
            if (searchOpts["htmlElement"].value != "None") {
                searchOptions[searchOptName] = searchOpts["htmlElement"].value;
            }
        }
        if (this.#siteSelector.selectedData != null) {
            searchOptions[`${this.#siteSelectorRecursiveSwitchElmt.checked ? "recurse_" : ""}${this.#siteSelector.selectedData.type}_id`] = this.#siteSelector.selectedData.id;
        }
        if (this.#zoneSelector.selectedData != null) {
            searchOptions["zone_id"] = this.#zoneSelector.selectedData.id;
        }

        this.#searchReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries.retrieve_list`, searchOptions),
            (data) => {
                this.#searchResultsContainerElmt.innerHTML = "";

                if (data.data.length > 0) {
                    for (let row of data.data) {
                        let searchResultItem = this.#createSearchResultItemElement(row);
                        this.#searchResultsContainerElmt.appendChild(searchResultItem);
                    }
                }
                else {
                    let noResultsElmt = document.createElement("p");
                    noResultsElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noResultsElmt.innerText = "No search results";
                    this.#searchResultsContainerElmt.appendChild(noResultsElmt);
                }

                let paginationOpts = {
                    pageSize: this.#searchResultsPageSizeSelectorElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#searchResultsPaginationElmt.reload(paginationOpts);

                this.#update();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    static getInstance(elementId = null) {
        let queryId = "";
        if (elementId != null) {
            queryId = `[id="${elementId}"]`;
        }
        return document.querySelector(`app-ts-selector${queryId}`);
    }
}


if (window.customElements.get("app-ts-selected-item") == null) {
    window.customElements.define("app-ts-selected-item", SelectedItem, { extends: "div" });
}
if (window.customElements.get("app-ts-search-result-item") == null) {
    window.customElements.define("app-ts-search-result-item", SearchResultItem, { extends: "button" });
}
if (window.customElements.get("app-ts-selector") == null) {
    window.customElements.define("app-ts-selector", TimeseriesSelector);
}

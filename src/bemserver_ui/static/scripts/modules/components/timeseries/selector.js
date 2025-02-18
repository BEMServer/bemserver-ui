import { app } from "/static/scripts/app.js";
import { FilterSelect } from "/static/scripts/modules/components/filterSelect.js";
import "/static/scripts/modules/components/pagination.js";
import "/static/scripts/modules/components/itemsCount.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { StructuralElementSelector } from "/static/scripts/modules/components/structuralElements/selector.js";
import { debounce, timer } from "/static/scripts/modules/tools/utils.js";


class TimeseriesItem {

    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.unit_symbol = data.unit_symbol;
        this.campaign_id = data.campaign_id;
        this.campaign_scope_id = data.campaign_scope_id;

        this.label = `${this.name}${this.unit_symbol ? ` [${this.unit_symbol}]` : ""}`;
    }
}


class SelectedItem extends HTMLDivElement {

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

    remove(dispatchActionEvents = true) {
        super.remove();

        if (dispatchActionEvents) {
            let removeEvent = new CustomEvent("remove", { detail: this.#tsItem });
            this.dispatchEvent(removeEvent);
        }
    }
}


class SearchResultItem extends HTMLButtonElement {

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

            this.toggle();
        });
    }

    #dispatchEvents() {
        let eventDetail = { timeseries: this.#tsItem, isActive: this.#isActive };
        let toggleEvent = new CustomEvent("toggle", { detail: eventDetail, bubbles: true });
        this.dispatchEvent(toggleEvent);
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

    select(dispatchActionEvents = true) {
        if (this.#isEnabled && !this.#isActive) {
            this.#isActive = true;
            this.#update();
            if (dispatchActionEvents) {
                this.#dispatchEvents();
            }
        }
    }

    unselect(dispatchActionEvents = true) {
        if (this.#isEnabled && this.#isActive) {
            this.#isActive = false;
            this.#update();
            if (dispatchActionEvents) {
                this.#dispatchEvents();
            }
        }
    }

    toggle(dispatchActionEvents = true) {
        if (this.#isActive) {
            this.unselect(dispatchActionEvents);
        }
        else {
            this.select(dispatchActionEvents);
        }
    }
}


export class TimeseriesSelector extends HTMLElement {

    #allowedSelectionLimit = -1;
    #defaultFilters = {};

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;
    #getTimeseriesRedIDs = {};

    #selectedItemsContainerElmt = null;
    #clearSelectionBtnElmt = null;
    #dropdownSearchBtnElmt = null;
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

    #availableFilters = ["campaign-scope", "site", "building", "storey", "space", "zone", "extend"];

    // null -> not loaded
    // loading
    // ready -> loaded
    #filterStates = {
        "sites": null,
        "zones": null,
        "campaign_scopes": null,
    };

    // List of SelectedItem instance that are in selectedItemsContainerElmt.
    #selectedItemElmts = [];

    #isOpened = false;

    // TODO rename to selectedTimeseries
    get selectedItems() {
        // TODO maybe we can assume here that all element in selected items container are only SelectedItem instances?
        return this.#selectedItemElmts.map(x => x.timeseries);
    }

    get isOpened() {
        return this.#isOpened;
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
        for (let filterAttrName of [this.#availableFilters]) {
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
        this.#selectedItemsContainerElmt = document.getElementById("selectedItemsContainer");
        this.#clearSelectionBtnElmt = this.querySelector("#clearSelectionBtn");
        this.#dropdownSearchBtnElmt = document.getElementById("dropdownSearchBtn");
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
        this.#clearSelectionBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.clearAllSelection();
        });

        this.#searchInputElmt.addEventListener("input", debounce((event) => {
            event.preventDefault();

            this.#updateSearchInput();

            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        }, 700));

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
                this.#loadSearchResults();
            }
        });

        this.#searchClearBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchInputElmt.value = "";
            this.#updateSearchInput();
            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        });

        this.#searchResultsPageSizeSelectorElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#searchResultsPaginationElmt.page = 1;
                this.#loadSearchResults();
            }
        });

        this.#searchResultsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#loadSearchResults();
        });

        this.#selectAllResultsBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            // Get all search result items and filter them to get only the part corresponding to the unselected items.
            let searchResultItems = [].slice.call(
                this.#searchResultsContainerElmt.querySelectorAll(`button[data-ts-id]`)
            ).filter(x => !this.#isSelected(x.timeseries.id));

            for (let item of searchResultItems) {
                item.select(false);
                this.#updateSelection(item, false);
                if (this.#isSelectionLimitReached()) {
                    break;
                }
            }

            this.#dispatchSelectionChanged();
        });

        this.#unselectAllResultsBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            // Get all search result items and filter them to get only the part corresponding to the selected items.
            let searchResultItems = [].slice.call(
                this.#searchResultsContainerElmt.querySelectorAll(`button[data-ts-id]`)
            ).filter(x => this.#isSelected(x.timeseries.id));

            for (let item of searchResultItems) {
                item.unselect(false);
                this.#updateSelection(item, false);
            }

            this.#dispatchSelectionChanged();
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
            this.#loadSearchResults();
        });

        this.#siteSelector.addEventListener("treeNodeUnselect", () => {
            this.#siteSelectorRecursiveSwitchElmt.removeAttribute("disabled");

            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        });

        this.#zoneSelector.addEventListener("treeNodeSelect", () => {
            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        });

        this.#zoneSelector.addEventListener("treeNodeUnselect", () => {
            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        });

        this.#siteSelectorRecursiveSwitchElmt.addEventListener("change", () => {
            if (this.#siteSelector.selectedData != null) {
                this.#searchResultsPaginationElmt.page = 1;
                this.#loadSearchResults();
            }
        });

        this.#dropdownSearchBtnElmt.addEventListener("shown.bs.dropdown", () => {
            this.#isOpened = true;
            this.#fixDropdownSearchPanelPosition();
        });

        this.#dropdownSearchBtnElmt.addEventListener("show.bs.dropdown", () => {
            let eventDetail = { isOpened: true };

            let openEvent = new CustomEvent("openPanel", { detail: eventDetail, bubbles: true });
            this.dispatchEvent(openEvent);

            let toggleEvent = new CustomEvent("togglePanel", { detail: eventDetail, bubbles: true });
            this.dispatchEvent(toggleEvent);
        });

        this.#dropdownSearchBtnElmt.addEventListener("hide.bs.dropdown", () => {
            let eventDetail = { isOpened: false };

            let openEvent = new CustomEvent("closePanel", { detail: eventDetail, bubbles: true });
            this.dispatchEvent(openEvent);

            let toggleEvent = new CustomEvent("togglePanel", { detail: eventDetail, bubbles: true });
            this.dispatchEvent(toggleEvent);
        });

        this.#dropdownSearchBtnElmt.addEventListener("hidden.bs.dropdown", () => {
            this.#isOpened = false;
        });
    }

    #dispatchSelectionChanged() {
        let selectionChangedEvent = new CustomEvent("selectionChanged", { bubbles: true});
        this.dispatchEvent(selectionChangedEvent);
    }

    #updateSearchInput() {
        if (this.#searchInputElmt.value == "") {
            this.#searchInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#searchClearBtnElmt.classList.add("d-none", "invisible");
        }
        else if (!this.#searchInputElmt.classList.contains("border-info")) {
            this.#searchInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            this.#searchClearBtnElmt.classList.remove("d-none", "invisible");
        }
    }

    #update() {
        this.#searchResultsCountElmt.update({totalCount: this.#searchResultsPaginationElmt.totalItems, firstItem: this.#searchResultsPaginationElmt.startItem, lastItem: this.#searchResultsPaginationElmt.endItem});

        this.#updateSelectedItemsContainer();
        this.#updateSearchResultsContainer();
    }

    #updateSelectedItemsCounter() {
        // Update the selected items counter.
        this.#countResultsSelectedElmt.innerText = `No items selected`;
        if (this.#selectedItemElmts.length > 0) {
            this.#countResultsSelectedElmt.innerText = `${this.#selectedItemElmts.length.toString()}${this.#allowedSelectionLimit != -1 ? `/${this.#allowedSelectionLimit.toString()}`: ""} item${this.#selectedItemElmts.length > 1 ? "s" : ""} selected out of ${this.#searchResultsPaginationElmt.totalItems.toString()}`;
        }
    }

    #updateSelectedItemsContainer() {
        if (this.#selectedItemElmts.length <= 0) {
            this.#selectedItemsContainerElmt.innerHTML = "";

            this.#clearSelectionBtnElmt.classList.add("d-none", "invisible");
        }
        else {
            // Ensure that #selectedItemElmts and elements in selected items container is synchronized.
            // Add missing elements.
            for (let selectedItemElmt of this.#selectedItemElmts) {
                if (!this.#selectedItemsContainerElmt.contains(selectedItemElmt)) {
                    this.#selectedItemsContainerElmt.appendChild(selectedItemElmt);
                }
            }
            // Remove ghosts... (this should never happen)
            let selectedItemElmts = [].slice.call(this.#selectedItemsContainerElmt.querySelectorAll(`div[data-ts-id]`));
            for (let selectedItemElmt of selectedItemElmts) {
                if (!this.#selectedItemElmts.includes(selectedItemElmt)) {
                    selectedItemElmt.remove(false);
                }
            }

            this.#clearSelectionBtnElmt.classList.remove("d-none", "invisible");
        }

        this.#updateSelectedItemsCounter();

        // Enable or disable (not selected yet) search items based on reaching the selection limit.
        if (this.#isSelectionLimitReached()) {
            this.#selectionLimitElmt.classList.replace("text-muted", "text-danger");
            this.#selectAllResultsBtnElmt.setAttribute("disabled", true);

            let notSelectedSearchResultElmts = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll(`button:not(.active)`));
            for (let searchResultItem of notSelectedSearchResultElmts) {
                if (!this.#isSelected(searchResultItem.timeseries.id)) {
                    searchResultItem.isEnabled = false;
                }
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

    #updateSearchResultsContainer() {
        let searchResultItems = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll(`button[data-ts-id]`))
        for (let item of searchResultItems) {
            if (this.#isSelected(item.timeseries.id)) {
                item.select(false);
            }
            else {
                item.unselect(false);
            }
        }
    }

    #initFilters() {
        // Check if some filters are not initialized yet...
        if (!Object.values(this.#filterStates).every(x => x != null)) {
            if (this.#defaultFilters["extend"] != null && this.#filterStates["extend"] == null) {
                this.#filterStates["extend"] = "loading";
                this.#siteSelectorRecursiveSwitchElmt.checked = Parser.parseBoolOrDefault(this.#defaultFilters["extend"].toLowerCase(), false);
                this.#filterStates["extend"] = "loaded";
            }

            this.#loadSitesTreeData();
            this.#loadZonesTreeData();

            if (this.#filterStates["campaign_scopes"] == null) {
                this.#filterStates["campaign_scopes"] = "loading";

                this.#searchSelectFilters = {
                    "campaign_scope_id": {
                        "label": "campaign scopes",
                        "fetchUrl": app.urlFor(`api.campaign_scopes.retrieve_list`),
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
                            searchSelectFilterElmt.id = searchSelectFilterKey;
                            this.#searchFiltersContainerElmt.insertBefore(searchSelectFilterElmt, this.#filtersRemoveBtnElmt);
                            searchSelectFilterElmt.load(selectOptions, selectedOptionIndex);
                            searchSelectFilterElmt.addEventListener("change", (event) => {
                                event.preventDefault();

                                this.#searchResultsPaginationElmt.page = 1;
                                this.#loadSearchResults();
                            });
                        }

                        this.#filterStates["campaign_scopes"] = "loaded";
                        this.#loadSearchResults();
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");
                        this.#filterStates["campaign_scopes"] = null;
                    },
                );
            }
        }
    }

    #isSelected(tsId) {
        return this.#getSelectedItem(tsId) != null;
    }

    #getSelectedItem(tsId) {
        return this.#selectedItemElmts.find(x => x.timeseries.id.toString() == tsId.toString());
    }

    #isSelectionLimitReached() {
        let isLimitReached = false;
        if (this.#allowedSelectionLimit != -1) {
            isLimitReached = this.#selectedItemElmts.length >= this.#allowedSelectionLimit;
        }
        return isLimitReached;
    }

    #canSelect(tsId) {
        return !this.#isSelected(tsId) && !this.#isSelectionLimitReached();
    }

    #loadSitesTreeData() {
        if (this.#filterStates["sites"] == null) {
            this.#filterStates["sites"] = "loading";

            this.#siteSelector.showLoadingTree();

            if (this.#sitesTreeReqID != null) {
                this.#internalAPIRequester.abort(this.#sitesTreeReqID);
                this.#sitesTreeReqID = null;
            }

            this.#sitesTreeReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.structural_elements.retrieve_tree_sites`),
                (data) => {
                    this.#siteSelector.loadTree(data.data);

                    for (let structElmtType of ["site", "building", "storey", "space"]) {
                        if (this.#defaultFilters[structElmtType]) {
                            this.#siteSelector.select(`${structElmtType}-${this.#defaultFilters[structElmtType]}`);
                            break;
                        }
                    }

                    this.#filterStates["sites"] = "loaded";
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");
                    this.#filterStates["sites"] = null;
                },
            );
        }
    }

    #loadZonesTreeData() {
        if (this.#filterStates["zones"] == null) {
            this.#filterStates["zones"] = "loading";

            this.#zoneSelector.showLoadingTree();

            if (this.#zonesTreeReqID != null) {
                this.#internalAPIRequester.abort(this.#zonesTreeReqID);
                this.#zonesTreeReqID = null;
            }

            this.#zonesTreeReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.structural_elements.retrieve_tree_zones`),
                (data) => {
                    this.#zoneSelector.loadTree(data.data);

                    if (this.#defaultFilters["zone"]) {
                        this.#zoneSelector.select(`zone-${this.#defaultFilters["zone"]}`);
                    }

                    this.#filterStates["zones"] = "loaded";
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");
                    this.#filterStates["zones"] = null;
                },
            );
        }
    }

    #createSelectedItemElement(tsData) {
        let tsItem = new TimeseriesItem(tsData);
        let selectedItem = new SelectedItem(tsItem);

        selectedItem.addEventListener("remove", (event) => {
            event.preventDefault();

            let searchResultItem = this.#searchResultsContainerElmt.querySelector(`button[data-ts-id="${tsData.id.toString()}"]`);
            searchResultItem?.unselect(false);

            this.#selectedItemElmts = this.#selectedItemElmts.filter(x => x.timeseries.id != selectedItem.timeseries.id);
            this.#update();

            let eventDetail = { timeseries: selectedItem.timeseries };
            let removeEvent = new CustomEvent("removeItem", { detail: eventDetail, bubbles: true});
            this.dispatchEvent(removeEvent);
        });

        return selectedItem;
    }

    #createSearchResultItemElement(tsData) {
        let tsItem = new TimeseriesItem(tsData);
        let searchResultItem = new SearchResultItem(tsItem, this.#isSelected(tsItem.id));

        searchResultItem.addEventListener("toggle", (event) => {
            event.preventDefault();

            this.#updateSelection(searchResultItem);
        });

        return searchResultItem;
    }

    #updateSelection(searchResultItem, dispatchActionEvent = true) {
        if (searchResultItem.isActive) {
            if (this.#canSelect(searchResultItem.timeseries.id)) {
                let selectedItemElmt = this.#createSelectedItemElement(searchResultItem.timeseries);
                this.#selectedItemElmts.push(selectedItemElmt);

                this.#updateSelectedItemsContainer();
            }
            else {
                dispatchActionEvent = false;
            }
        }
        else {
            let selectedItemElmt = this.#getSelectedItem(searchResultItem.timeseries.id);
            if (selectedItemElmt != null) {
                selectedItemElmt.remove(dispatchActionEvent);
                this.#selectedItemElmts = this.#selectedItemElmts.filter(x => x.timeseries.id.toString() != selectedItemElmt.timeseries.id.toString());

                this.#updateSelectedItemsContainer();
            }
            else {
                dispatchActionEvent = false;
            }
        }

        this.#fixDropdownSearchPanelPosition();

        if (dispatchActionEvent) {
            let eventDetail = { timeseries: searchResultItem.timeseries, isActive: searchResultItem.isActive };
            let toggleEvent = new CustomEvent("toggleItem", { detail: eventDetail, bubbles: true});
            this.dispatchEvent(toggleEvent);
        }
    }

    #fixDropdownSearchPanelPosition() {
        // Update dropdown-menu position, taking in account selected items container height.
        this.#dropdownSearchPanelElmt.style.transform = `translate(0px, ${this.#selectedItemsContainerElmt.offsetHeight + this.#bsDropdownSearchPanel._config.offset[1]}px)`;
    }

    #loadSearchResults() {
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
            app.urlFor(`api.timeseries.retrieve_list`, searchOptions),
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
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    connectedCallback() {
        this.#initFilters();
        this.#initEventListeners();
        this.#update();
    }

    clearAllSelection() {
        this.#selectedItemElmts = [];
        this.#updateSelectedItemsContainer();
        this.#updateSearchResultsContainer();

        let clearEvent = new CustomEvent("clearSelection", { bubbles: true});
        this.dispatchEvent(clearEvent);
    }

    select(tsIds, afterSelectCallback = null) {
        // Exclude timeseries that are already selected.
        tsIds = tsIds.map(
            tsId => Parser.parseIntOrDefault(tsId)
        ).filter(
            tsId => this.#canSelect(tsId)
        );

        // Apply selection limit.
        if (this.#allowedSelectionLimit != -1) {
            tsIds = tsIds.slice(0, this.#allowedSelectionLimit);
        }

        for (let [fetchUrl, reqID] of Object.entries(this.#getTimeseriesRedIDs)) {
            this.#internalAPIRequester.abort(reqID);
            this.#getTimeseriesRedIDs[fetchUrl] = null;
        }

        this.#getTimeseriesRedIDs = this.#internalAPIRequester.gets(
            tsIds.map(tsId => app.urlFor(`api.timeseries.retrieve_one`, {id: tsId})),
            (responses) => {
                for (let tsResponse of responses) {
                    if (this.#canSelect(tsResponse.data.id)) {
                        let selectedItemElmt = this.#createSelectedItemElement(tsResponse.data);
                        this.#selectedItemElmts.push(selectedItemElmt);
                    }
                }

                this.#update();
                afterSelectCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    async setFilters(filters) {
        // TODO raise timeout if waited more than XXX seconds?

        // Wait until all filters are loaded before setting values.
        while (!Object.values(this.#filterStates).every(x => x == "loaded")) {
            await timer(100);
        }

        let searchResultsReloadNeeded = false;
        for (let [optFilterName, optFilterValue] of Object.entries(filters || {})) {
            if (this.#availableFilters.includes(optFilterName) && this.#defaultFilters[optFilterName] != optFilterValue) {
                this.#defaultFilters[optFilterName] = optFilterValue;
                searchResultsReloadNeeded = true;
            }

            if (["site", "building", "storey", "space"].includes(optFilterName)) {
                this.#siteSelector.select(`${optFilterName}-${optFilterValue}`);
            }
            else if (optFilterName == "zone") {
                this.#zoneSelector.select(`${optFilterName}-${optFilterValue}`);
            }
            else if (optFilterName == "extend") {
                this.#siteSelectorRecursiveSwitchElmt.checked = Parser.parseBoolOrDefault(optFilterValue, false);
            }
            else if (optFilterName == "campaign-scope") {
                let filterElmt = this.#searchFiltersContainerElmt.querySelector(`select[id="campaign_scope_id"]`);
                filterElmt.value = optFilterValue;
            }
        }

        if (searchResultsReloadNeeded) {
            this.#searchResultsPaginationElmt.page = 1;
            this.#loadSearchResults();
        }
    }

    open() {
        this.#bsDropdownSearchPanel.show();
    }

    close() {
        this.#bsDropdownSearchPanel.hide();
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

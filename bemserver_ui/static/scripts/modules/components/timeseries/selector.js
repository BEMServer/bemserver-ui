import { FilterSelect } from "../filterSelect.js";
import { Pagination, PageSizeSelector } from "../pagination.js";
import { FlashMessageTypes, FlashMessage } from "../flash.js";
import { Spinner } from "../spinner.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { Parser } from "../../tools/parser.js";
import { flaskES6 } from "../../../app.js";


export class SelectedItem extends HTMLSpanElement {

    #itemId = null;
    #itemName = null;
    #itemSymbol = null;
    #itemLabel = null;

    #removeBtnElmt = null;

    constructor(itemId, itemName, itemSymbol, itemLabel) {
        super();

        this.#itemId = itemId;
        this.#itemName = itemName;
        this.#itemSymbol = itemSymbol;
        this.#itemLabel = itemLabel;
    }

    get itemId() {
        return this.#itemId;
    }
    get itemName() {
        return this.#itemName;
    }

    #initEventListeners() {
        this.#removeBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let removeEvent = new CustomEvent("remove", { detail: { itemId: this.#itemId, itemName: this.#itemName, itemSymbol: this.#itemSymbol, itemLabel: this.#itemLabel }});
            this.dispatchEvent(removeEvent);
        });
    }

    connectedCallback() {
        this.innerHTML = "";

        this.style.maxWidth = "250px";

        this.classList.add("badge", "rounded-pill", "bg-info", "text-dark");
        this.setAttribute("data-item-id", this.#itemId?.toString());

        let textContentElmt = document.createElement("span");
        textContentElmt.style.maxWidth = "200px";
        textContentElmt.classList.add("d-inline-block", "text-truncate");
        textContentElmt.innerText = this.#itemLabel;
        textContentElmt.title = this.#itemLabel;
        this.appendChild(textContentElmt)

        this.#removeBtnElmt = document.createElement("i");
        this.#removeBtnElmt.classList.add("bi", "bi-x-lg", "ms-2");
        this.#removeBtnElmt.setAttribute("role", "button");
        this.appendChild(this.#removeBtnElmt);

        this.#initEventListeners();
    }
}


export class SearchResultItem extends HTMLButtonElement {

    #itemId = null;
    #itemName = null;
    #itemSymbol = null;
    #itemIsActive = false;

    constructor(itemId, itemName, itemSymbol, itemIsActive = false) {
        super();

        this.#itemId = itemId;
        this.#itemName = itemName;
        this.#itemSymbol = itemSymbol;
        this.#itemIsActive = itemIsActive;

        this.#update();
    }

    get itemLabel() {
        let ret = this.#itemName;
        if (this.#itemSymbol) {
            ret += ` [${this.#itemSymbol}]`;
        }
        return ret;
    }

    get isActive() {
        return this.#itemIsActive;
    }
    set isActive(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#itemIsActive);
        if (cleanValue != this.#itemIsActive) {
            this.#itemIsActive = cleanValue;
            this.#update();
            this.#dispatchEvents();
        }
    }

    #initEventListeners() {
        this.addEventListener("click", (event) => {
            event.preventDefault();

            this.#itemIsActive = !this.#itemIsActive;
            this.#dispatchEvents();
        });
    }

    #dispatchEvents() {
        let buttonEvent = null;
        if (this.#itemIsActive) {
            buttonEvent = new CustomEvent("on", { detail: { itemId: this.#itemId, itemName: this.#itemName, itemSymbol: this.#itemSymbol, itemLabel: this.itemLabel }, bubbles: true });
        }
        else {
            buttonEvent = new CustomEvent("off", { detail: { itemId: this.#itemId }, bubbles: true });
        }
        this.dispatchEvent(buttonEvent);

        let buttonToggleEvent = new CustomEvent("toggle", { detail: { itemId: this.#itemId, itemName: this.#itemName, itemSymbol: this.#itemSymbol, itemLabel: this.itemLabel, itemIsActive: this.#itemIsActive }, bubbles: true});
        this.dispatchEvent(buttonToggleEvent);
    }

    #update() {
        if (this.#itemIsActive) {
            this.classList.add("active");
        }
        else {
            this.classList.remove("active");
        }
        this.setAttribute("aria-pressed", this.#itemIsActive);
    }

    connectedCallback() {
        this.innerHTML = "";
        this.style.maxWidth = "250px";
        this.classList.add("btn", "btn-outline-secondary", "text-truncate");
        this.setAttribute("type", "button");
        this.setAttribute("data-bs-toggle", "button");
        this.setAttribute("data-item-id", this.#itemId?.toString());
        this.innerText = this.itemLabel;
        this.title = this.itemLabel;

        this.#initEventListeners();
    }
}


export class TimeseriesSelector extends HTMLDivElement {

    #allowedSelectionLimit = -1;

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;
    #selectReqID = null;

    #messagesElmt = null;

    #selectedItemsContainerElmt = null;
    #selectedItems = [];

    #searchInputElmt = null;

    #searchClearBtnElmt = null;
    #filtersRemoveBtnElmt = null;

    #searchFiltersContainerElmt = null;
    #searchFilterCampaignScopeElmt = null;
    #searchFilterSiteElmt = null;
    #searchFilterBuildingElmt = null;
    #searchFilterStoreyElmt = null;
    #searchFilterSpaceElmt = null;
    #searchFilterZoneElmt = null;
    #searchFilterElmts = [];

    #searchResultsContainerElmt = null;
    #searchResultsPageSizeSelectorElmt = null;
    #searchResultsCountElmt = null;
    #searchResultsPaginationElmt = null;

    #selectionLimitElmt = null;
    #countResultsSelectedElmt = null;
    #selectAllResultsLnkElmt = null;
    #unselectAllResultsLnkElmt = null;
    #clearAllSelectionLnkElmt = null;

    constructor(options = {}) {
        super();

        this.#allowedSelectionLimit = Parser.parseIntOrDefault(options.allowedSelectionLimit, this.#allowedSelectionLimit);

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initFilters();
        this.#initEventListeners();
        this.#update();

        if (this.#allowedSelectionLimit != -1) {
            this.#selectionLimitElmt.innerText = `Selection limit: ${this.#allowedSelectionLimit}`;
        }
        if (this.#allowedSelectionLimit == 1) {
            this.#selectAllResultsLnkElmt.classList.add("d-none", "invisible");
        }
    }

    get selectedItemIds() {
        return this.#selectedItems.map((item) => { return item.itemId; });
    }

    get selectedItemNames() {
        return this.#selectedItems.map((item) => { return item.itemName; });
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#selectedItemsContainerElmt = document.getElementById("selectedItemsContainer");

        this.#searchInputElmt = document.getElementById("search");

        this.#searchClearBtnElmt = document.getElementById("clearSearchBtn");
        this.#filtersRemoveBtnElmt = document.getElementById("removeFiltersBtn");

        this.#searchFiltersContainerElmt = document.getElementById("searchFiltersContainer");

        this.#searchResultsContainerElmt = document.getElementById("searchResultsContainer");
        this.#searchResultsPageSizeSelectorElmt = document.getElementById("searchResultsPageSizeSelector");
        this.#searchResultsCountElmt = document.getElementById("searchResultsCount");
        this.#searchResultsPaginationElmt = document.getElementById("searchResultsPagination");

        this.#selectionLimitElmt = document.getElementById("selectionLimit");
        this.#countResultsSelectedElmt = document.getElementById("countResultsSelected");
        this.#selectAllResultsLnkElmt = document.getElementById("selectAllResultsLnk");
        this.#unselectAllResultsLnkElmt = document.getElementById("unselectAllResultsLnk");
        this.#clearAllSelectionLnkElmt = document.getElementById("clearAllSelectionLnk");
    }

    #initEventListeners() {
        this.#searchInputElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.refresh();
        });

        this.#filtersRemoveBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            for (let searchFilterElmt of this.#searchFilterElmts) {
                if (!searchFilterElmt.isDefaultSelected) {
                    searchFilterElmt.reset();
                    hasFilterChanged = true;
                }
            }
            if (hasFilterChanged) {
                this.refresh();
            }
        });

        this.#searchClearBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchInputElmt.value = "";
            this.refresh();
        });

        this.#searchResultsPageSizeSelectorElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.refresh();
            }
        });

        this.#searchResultsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.refresh({ page: event.detail.page });
        });

        this.#selectAllResultsLnkElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let searchResultItems = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll("button"))
            for (let item of searchResultItems) {
                if (!item.isActive) {
                    item.isActive = true;
                }
            }
        });

        this.#unselectAllResultsLnkElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let searchResultItems = [].slice.call(this.#searchResultsContainerElmt.querySelectorAll("button"))
            for (let item of searchResultItems) {
                if (item.isActive) {
                    item.isActive = false;
                }
            }
        });

        this.#clearAllSelectionLnkElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.clearAllSelection();
        });
    }

    #update() {
        if (this.#searchInputElmt.value != "") {
            this.#searchClearBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#searchClearBtnElmt.classList.add("d-none", "invisible");
        }

        if (this.#searchResultsPaginationElmt.totalItems > 0) {
            this.#searchResultsCountElmt.innerText = `Items ${this.#searchResultsPaginationElmt.startItem.toString()} - ${this.#searchResultsPaginationElmt.endItem.toString()} out of ${this.#searchResultsPaginationElmt.totalItems.toString()}`;
        }
        else {
            this.#searchResultsCountElmt.innerText = "No items";
        }

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
    }

    #initFilter(filterElmt, getFilterDataUrl, prepareFilterOptionsCallback) {
        this.#searchFiltersContainerElmt.insertBefore(filterElmt, this.#filtersRemoveBtnElmt);

        if (this.#filterReqIDs[getFilterDataUrl] != null) {
            this.#internalAPIRequester.abort(this.#filterReqIDs[getFilterDataUrl]);
            this.#filterReqIDs[getFilterDataUrl] = null;
        }
        this.#filterReqIDs[getFilterDataUrl] = this.#internalAPIRequester.get(
            getFilterDataUrl,
            (data) => {
                let filterOptions = prepareFilterOptionsCallback(data);
                filterElmt.load(filterOptions);

                filterElmt.addEventListener("change", (event) => {
                    event.preventDefault();

                    this.refresh();
                });

                this.#searchFilterElmts.push(filterElmt);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #initFilters() {
        // Campaign scopes filter.
        this.#searchFilterCampaignScopeElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterCampaignScopeElmt, flaskES6.urlFor(`api.campaign_scopes.retrieve_list`), (data) => {
            let filterOptions = data.data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All campaign scopes"});
            return filterOptions;
        });

        // Sites filter.
        this.#searchFilterSiteElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterSiteElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "sites" }), (data) => {
            let filterOptions = data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All sites"});
            return filterOptions;
        });

        // Buildings filter.
        this.#searchFilterBuildingElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterBuildingElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "buildings" }), (data) => {
            let filterOptions = data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All buildings"});
            return filterOptions;
        });

        // Storeys filter.
        this.#searchFilterStoreyElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterStoreyElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "storeys" }), (data) => {
            let filterOptions = data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All storeys"});
            return filterOptions;
        });
        
        // Buildings filter.
        this.#searchFilterSpaceElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterSpaceElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "spaces" }), (data) => {
            let filterOptions = data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All spaces"});
            return filterOptions;
        });

        // Zones filter.
        this.#searchFilterZoneElmt = new FilterSelect();
        this.#initFilter(this.#searchFilterZoneElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "zones" }), (data) => {
            let filterOptions = data.map((row) => {
                return {value: row.id.toString(), text: row.name};
            });
            filterOptions.splice(0, 0, {value: "None", text: "All zones"});
            return filterOptions;
        });
    }

    #canSelect(itemId) {
        let isLimitOK = true;
        if (this.#allowedSelectionLimit != -1) {
            isLimitOK = this.#selectedItems.length < this.#allowedSelectionLimit;
        }
        return !this.selectedItemIds.includes(itemId) && isLimitOK;
    }

    clearAllSelection() {
        this.#unselectAllResultsLnkElmt.click();
        if (this.#selectedItems.length > 0) {
            this.#selectedItems = [];
            this.#updateSelectedItemsContainer();
        }
    }

    select(tsId, afterSelectCallback = null) {
        let itemId = Parser.parseIntOrDefault(tsId);

        let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-item-id="${itemId.toString()}"]`);
        if (searchResultItemElmt != null) {
            searchResultItemElmt.click();
        }
        else {
            if (this.#selectReqID != null) {
                this.#internalAPIRequester.abort(this.#selectReqID);
                this.#selectReqID = null;
            }

            this.#selectReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.timeseries.retrieve_one`, {id: itemId}),
                (data) => {
                    let itemIsAlreadySelected = this.selectedItemIds.includes(data.data.id);
                    searchResultItemElmt = new SearchResultItem(data.data.id, data.data.name, data.data.unit_symbol, itemIsAlreadySelected);

                    // XXX: this code is duplicated... (almost same code as in "refresh", see below...)
                    if (this.#canSelect(itemId)) {
                        let selectedItem = new SelectedItem(itemId, data.data.name, data.data.unit_symbol, searchResultItemElmt.itemLabel);

                        selectedItem.addEventListener("remove", (event) => {
                            event.preventDefault();

                            let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-item-id="${itemId.toString()}"]`);
                            if (searchResultItemElmt != null) {
                                searchResultItemElmt.isActive = false;
                            }
                            else {
                                event.target.remove();
                                this.#selectedItems = this.#selectedItems.filter(item => item.itemId != itemId);
                            }

                            this.#updateSelectedItemsContainer();

                            afterSelectCallback?.();
                        });

                        if (this.#selectedItems.length <= 0) {
                            this.#selectedItemsContainerElmt.innerHTML = "";
                        }
                        this.#selectedItemsContainerElmt.appendChild(selectedItem);
                        this.#selectedItems.push(selectedItem);

                        this.#updateSelectedItemsContainer();
                    }

                    searchResultItemElmt.click();
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                () => {
                    afterSelectCallback?.();

                    this.#update();
                },
            );
        }
    }

    refresh(options = {}) {
        if (this.#searchReqID != null) {
            this.#internalAPIRequester.abort(this.#searchReqID);
            this.#searchReqID = null;
        }

        this.#searchResultsCountElmt.innerHTML = "";
        this.#searchResultsCountElmt.appendChild(new Spinner({useSmallSize: true}));
        this.#searchResultsContainerElmt.innerHTML = "";
        this.#searchResultsContainerElmt.appendChild(new Spinner());

        let searchOptions = {"page_size": Parser.parseIntOrDefault(options.pageSize, this.#searchResultsPageSizeSelectorElmt.current), "page": Parser.parseIntOrDefault(options.page, 1)};
        if ("search" in options) {
            searchOptions["search"] = options.search;
        }
        else if (this.#searchInputElmt.value != "") {
            searchOptions["search"] = this.#searchInputElmt.value;
        }
        if (this.#searchFilterCampaignScopeElmt.value != "None") {
            searchOptions["campaign_scope_id"] = this.#searchFilterCampaignScopeElmt.value;
        }
        if (this.#searchFilterSiteElmt.value != "None") {
            searchOptions["site_id"] = this.#searchFilterSiteElmt.value;
        }
        if (this.#searchFilterBuildingElmt.value != "None") {
            searchOptions["building_id"] = this.#searchFilterBuildingElmt.value;
        }
        if (this.#searchFilterStoreyElmt.value != "None") {
            searchOptions["storey_id"] = this.#searchFilterStoreyElmt.value;
        }
        if (this.#searchFilterSpaceElmt.value != "None") {
            searchOptions["space_id"] = this.#searchFilterSpaceElmt.value;
        }
        if (this.#searchFilterZoneElmt.value != "None") {
            searchOptions["zone_id"] = this.#searchFilterZoneElmt.value;
        }

        this.#searchReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries.retrieve_list`, searchOptions),
            (data) => {
                this.#searchResultsContainerElmt.innerHTML = "";

                if (data.data.length > 0) {
                    for (let row of data.data) {
                        let itemIsAlreadySelected = this.selectedItemIds.includes(row.id);
                        let searchResultItem = new SearchResultItem(row.id, row.name, row.unit_symbol, itemIsAlreadySelected);

                        searchResultItem.addEventListener("on", (event) => {
                            event.preventDefault();

                            if (this.#canSelect(event.detail.itemId)) {
                                let selectedItem = new SelectedItem(event.detail.itemId, event.detail.itemName, event.detail.itemSymbol, event.detail.itemLabel);

                                selectedItem.addEventListener("remove", (event) => {
                                    event.preventDefault();

                                    let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-item-id="${event.detail.itemId.toString()}"]`);
                                    if (searchResultItemElmt != null) {
                                        searchResultItemElmt.isActive = false;
                                    }
                                    else {
                                        event.target.remove();
                                        this.#selectedItems = this.#selectedItems.filter(item => item.itemId != event.detail.itemId);
                                    }

                                    this.#updateSelectedItemsContainer();
                                });

                                if (this.#selectedItems.length <= 0) {
                                    this.#selectedItemsContainerElmt.innerHTML = "";
                                }
                                this.#selectedItemsContainerElmt.appendChild(selectedItem);
                                this.#selectedItems.push(selectedItem);

                                this.#updateSelectedItemsContainer();
                            }
                            else {
                                let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-item-id="${event.detail.itemId.toString()}"]`);
                                if (searchResultItemElmt != null) {
                                    searchResultItemElmt.isActive = false;
                                }
                            }
                        });

                        searchResultItem.addEventListener("off", (event) => {
                            event.preventDefault();

                            if (this.selectedItemIds.includes(event.detail.itemId)) {
                                this.#selectedItems = this.#selectedItems.filter(item => item.itemId != event.detail.itemId);

                                let selectedItemElmt = this.#selectedItemsContainerElmt.querySelector(`span[data-item-id="${event.detail.itemId.toString()}"]`);
                                selectedItemElmt?.remove();

                                this.#updateSelectedItemsContainer();
                            }
                        });

                        searchResultItem.addEventListener("toggle", (event) => {
                            event.preventDefault();

                            let toggleEvent = new CustomEvent("toggleItem", { detail: event.detail, bubbles: true});
                            this.dispatchEvent(toggleEvent);
                        });

                        this.#searchResultsContainerElmt.appendChild(searchResultItem);
                    }
                }
                else {
                    let searchResultNoItems = document.createElement("p");
                    searchResultNoItems.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    searchResultNoItems.innerText = "No search results";
                    this.#searchResultsContainerElmt.appendChild(searchResultNoItems);
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
}


if (customElements.get("app-ts-selected-item") == null) {
    customElements.define("app-ts-selected-item", SelectedItem, { extends: "span" });
}
if (customElements.get("app-ts-search-result-item") == null) {
    customElements.define("app-ts-search-result-item", SearchResultItem, { extends: "button" });
}
if (customElements.get("app-ts-selector") == null) {
    customElements.define("app-ts-selector", TimeseriesSelector, { extends: "div" });
}

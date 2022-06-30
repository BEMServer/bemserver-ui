import { SearchResultItem, SelectedItem } from "../../components/timeseries/selector.js";
import { FilterSelect } from "../../components/filterSelect.js";
import { Pagination, PageSizeSelector } from "../../components/pagination.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { Parser } from "../../tools/parser.js";
import { flaskES6 } from "../../../app.js";


class TimeseriesSelectorView {

    #allowedSelectionLimit = -1;

    #internalAPIRequester = null;
    #filterReqIDs = {};
    #searchReqID = null;

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

    constructor(options = {}) {
        this.#allowedSelectionLimit = Parser.parseIntOrDefault(options.allowedSelectionLimit, this.#allowedSelectionLimit);

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initFilters();
        this.#initEventListeners();
        this.#update();
    }

    get selectedItems() {
        return this.#selectedItems;
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
    }

    #update() {
        if (this.#searchInputElmt.value != "") {
            this.#searchClearBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#searchClearBtnElmt.classList.add("d-none", "invisible");
        }

        if (this.#searchResultsPaginationElmt.totalItems > 0) {
            this.#searchResultsCountElmt.innerText = `Items ${this.#searchResultsPaginationElmt.startItem} - ${this.#searchResultsPaginationElmt.endItem} out of ${this.#searchResultsPaginationElmt.totalItems}`;
        }
        else {
            this.#searchResultsCountElmt.innerText = "No items";
        }
    }

    #updateSelectedItemsContainer() {
        if (this.#selectedItems.length <= 0) {
            this.#selectedItemsContainerElmt.innerHTML = "";
            let noSelectedItemsElmt = document.createElement("span");
            noSelectedItemsElmt.classList.add("fst-italic", "opacity-75");
            noSelectedItemsElmt.innerText = "No items selected";
            this.#selectedItemsContainerElmt.appendChild(noSelectedItemsElmt);
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
                this.#searchFilterElmts.push(filterElmt);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );

        return this.#internalAPIRequester.getPromise(this.#filterReqIDs[getFilterDataUrl]);
    }

    #initFilters() {
        // Campaign scopes filter.
        this.#searchFilterCampaignScopeElmt = new FilterSelect();
        let filterCampaignScopeFetcherPromise = this.#initFilter(this.#searchFilterCampaignScopeElmt, flaskES6.urlFor(`api.campaign_scopes.retrieve_list`), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All campaign scopes"})
            for (let row of data.data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });

        // Sites filter.
        this.#searchFilterSiteElmt = new FilterSelect();
        let filterSiteFetcherPromise = this.#initFilter(this.#searchFilterSiteElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "sites" }), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All sites"})
            for (let row of data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });

        // Buildings filter.
        this.#searchFilterBuildingElmt = new FilterSelect();
        let filterBuildingFetcherPromise = this.#initFilter(this.#searchFilterBuildingElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "buildings" }), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All buildings"})
            for (let row of data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });

        // Storeys filter.
        this.#searchFilterStoreyElmt = new FilterSelect();
        let filterStoreyFetcherPromise = this.#initFilter(this.#searchFilterStoreyElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "storeys" }), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All storeys"})
            for (let row of data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });
        
        // Buildings filter.
        this.#searchFilterSpaceElmt = new FilterSelect();
        let filterSpaceFetcherPromise = this.#initFilter(this.#searchFilterSpaceElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "spaces" }), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All spaces"})
            for (let row of data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });

        // Zones filter.
        this.#searchFilterZoneElmt = new FilterSelect();
        let filterZoneFetcherPromise = this.#initFilter(this.#searchFilterZoneElmt, flaskES6.urlFor(`api.structural_elements.retrieve_list_for`, { type: "zones" }), (data) => {
            let filterOptions = [];
            filterOptions.push({value: "None", text: "All zones"})
            for (let row of data) {
                filterOptions.push({value: row.id.toString(), text: row.name});
            }
            return filterOptions;
        });

        Promise.all([filterCampaignScopeFetcherPromise, filterSiteFetcherPromise, filterBuildingFetcherPromise, filterStoreyFetcherPromise, filterSpaceFetcherPromise, filterZoneFetcherPromise]).then(() => {
            for (let searchFilterElmt of this.#searchFilterElmts) {
                searchFilterElmt?.addEventListener("change", (event) => {
                    event.preventDefault();
        
                    this.refresh();
                });
            }
        });
    }

    #canSelect(itemId) {
        let isLimitOK = true;
        if (this.#allowedSelectionLimit != -1) {
            isLimitOK = this.#selectedItems.length < this.#allowedSelectionLimit;
        }
        return !this.#selectedItems.includes(itemId) && isLimitOK;
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
                        let itemText = row.name;
                        if (row.unit_symbol) {
                            itemText += ` [${row.unit_symbol}]`;
                        }
                        let itemIsAlreadySelected = this.#selectedItems.includes(row.id);
                        let searchResultItem = new SearchResultItem(row.id, itemText, itemIsAlreadySelected);

                        searchResultItem.addEventListener("on", (event) => {
                            event.preventDefault();

                            if (this.#canSelect(event.detail.itemId)) {
                                let selectedItem = new SelectedItem(event.detail.itemId, event.detail.itemText);

                                selectedItem.addEventListener("remove", (event) => {
                                    event.preventDefault();

                                    let searchResultItemElmt = this.#searchResultsContainerElmt.querySelector(`button[data-item-id="${event.detail.itemId.toString()}"]`);
                                    if (searchResultItemElmt != null) {
                                        searchResultItemElmt.isActive = false;
                                    }
                                    else {
                                        event.target.remove();
                                        this.#selectedItems = this.#selectedItems.filter(item => item != event.detail.itemId);
                                    }

                                    this.#updateSelectedItemsContainer();
                                });

                                if (this.#selectedItems.length <= 0) {
                                    this.#selectedItemsContainerElmt.innerHTML = "";
                                }
                                this.#selectedItemsContainerElmt.appendChild(selectedItem);
                                this.#selectedItems.push(event.detail.itemId);

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

                            if (this.#selectedItems.includes(event.detail.itemId)) {
                                this.#selectedItems = this.#selectedItems.filter(item => item != event.detail.itemId);

                                let selectedItemElmt = this.#selectedItemsContainerElmt.querySelector(`span[data-item-id="${event.detail.itemId.toString()}"]`);
                                selectedItemElmt?.remove();

                                this.#updateSelectedItemsContainer();
                            }
                        });

                        this.#searchResultsContainerElmt.appendChild(searchResultItem);
                    }
                }
                else {
                    let searchResultNoItems = document.createElement("p");
                    searchResultNoItems.classList.add("fst-italic", "text-center", "opacity-75", "w-100");
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


export { TimeseriesSelectorView } ;

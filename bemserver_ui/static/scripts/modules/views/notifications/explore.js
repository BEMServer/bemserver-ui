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
import { ItemsCount } from "../../components/itemsCount.js";
import { Pagination, PageSizeSelector } from "../../components/pagination.js";
import { NotificationUpdater } from "../../notifications.js";


export class NotificationExploreView {

    #structuralElementTypes = []
    #campaigns = [];
    #currentCampaign = null;
    #defaultFilters = {};
    #defaultEventInfoTabListPageSize = 10;

    #sort = {};
    #selectedCampaignIds = [];
    #campaignScopesByCampaign = {};
    #eventCategories = [];
    #notifUpdater = null;
    #messagesElmt = null;
    #internalAPIRequester = null;
    #countReqID = null;
    #searchReqIDs = {};
    #loadEventInfoTabReqIDs = {};
    #loadEventInfoTabReqPageIDs = {};
    #updateNotifStatusReqIDs = {};
    #markAllAsReadReqIDs = {};

    #accordionFiltersCollapsibleElmt = null;
    #filtersContainerElmt = null;
    #stateFilterElmt = null;
    #timestampMinSearchFilterElmt = null;
    #timestampMaxSearchFilterElmt = null;
    #removeFiltersBtnElmt = null;

    #addCampaignDropDownBtnElmt = null;
    #addCampaignDropDownLabelElmt = null;
    #addCampaignDropDownListElmt = null;
    #campaignTabsElmt = null;
    #campaignTabContentsElmt = null;
    #currentTabCampaignData = {};

    #currentNotifElmt = null;
    #notifInfoModalElmt = null;
    #notifInfoContainerElmt = null;

    #eventInfoDescriptionElmt = null;
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

    #notifInfoRowIndexElmt = null;
    #notifInfoRowCountElmt = null;
    #notifInfoPageIndexElmt = null;
    #notifInfoPageCountElmt = null;
    #notifInfoNavFirstElmt = null;
    #notifInfoNavPreviousElmt = null;
    #notifInfoNavNextElmt = null;
    #notifInfoNavLastElmt = null;

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        // TODO: find a better way (maybe using app instance)
        this.#notifUpdater = new NotificationUpdater({ disableAutoRefresh: true });

        this.#loadOptions(options);
        this.#cacheDOM();

        this.#initData();
        this.#initFilters();
        this.#initTabs();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#structuralElementTypes = options.structuralElementTypes || [];
        for (let [optFilterName, optFilterValue] of Object.entries(options.filters || {})) {
            this.#defaultFilters[optFilterName] = optFilterValue;
        }
        this.#campaigns = options.campaigns || [];
        this.#currentCampaign = options.currentCampaign;
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#accordionFiltersCollapsibleElmt = new bootstrap.Collapse("#collapseFilters");

        this.#filtersContainerElmt = document.getElementById("filtersContainer");
        this.#timestampMinSearchFilterElmt = document.getElementById("timestamp_min");
        this.#timestampMaxSearchFilterElmt = document.getElementById("timestamp_max");
        this.#removeFiltersBtnElmt = document.getElementById("removeFiltersBtn");

        this.#addCampaignDropDownBtnElmt = document.getElementById("addCampaignDropDown");
        this.#addCampaignDropDownLabelElmt = document.getElementById("addCampaignDropDownLabel");
        this.#addCampaignDropDownListElmt = document.getElementById("addCampaignDropDownList");
        this.#campaignTabsElmt = document.getElementById("campaignTabs");
        this.#campaignTabContentsElmt = document.getElementById("campaignTabContents");
    
        this.#notifInfoModalElmt = document.getElementById("notifInfoModal");
        this.#notifInfoContainerElmt = document.getElementById("notifInfoContainer");

        this.#eventInfoDescriptionElmt = document.getElementById("eventInfoDescription");
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

        this.#notifInfoRowIndexElmt = document.getElementById("notifInfoRowIndex");
        this.#notifInfoRowCountElmt = document.getElementById("notifInfoRowCount");
        this.#notifInfoPageIndexElmt = document.getElementById("notifInfoPageIndex");
        this.#notifInfoPageCountElmt = document.getElementById("notifInfoPageCount");
        this.#notifInfoNavFirstElmt = document.getElementById("notifInfoNavFirst");
        this.#notifInfoNavPreviousElmt = document.getElementById("notifInfoNavPrevious");
        this.#notifInfoNavNextElmt = document.getElementById("notifInfoNavNext");
        this.#notifInfoNavLastElmt = document.getElementById("notifInfoNavLast");
    }

    #initData() {
        this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_categories`),
            (data) => {
                this.#eventCategories = data;
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );

        for (let campaignData of this.#campaigns) {
            this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.campaign_scopes.retrieve_list`, {campaign_id: campaignData.id}),
                (data) => {
                    this.#campaignScopesByCampaign[campaignData.id] = data.data;
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }

    #getCampaignData(campaignId) {
        // Get campaign data (name, timezone...).
        let ret = {id: campaignId, timezone: "UTC"};
        for (let campData of this.#campaigns) {
            if (campData.id == campaignId) {
                ret = campData;
                break;
            }
        }
        return ret;
    }

    #getEventCategoryData(eventCategoryId) {
        // Get event category data (name...).
        let ret = {id: eventCategoryId};
        for (let eventCatData of this.#eventCategories) {
            if (eventCatData.id == eventCategoryId) {
                ret = eventCatData;
                break;
            }
        }
        return ret;
    }

    #getCampaignScopeData(campaignId, campaignScopeId) {
        // Get campaign scope data (name...).
        let ret = {id: campaignScopeId, campaign_id: campaignId};
        for (let campScopeData of this.#campaignScopesByCampaign[campaignId]) {
            if (campScopeData.id == campaignScopeId) {
                ret = campScopeData;
                break;
            }
        }
        return ret;
    }

    #initFilters() {
        let selectedOptionIndex = 0;
        let selectOptions = [
            {value: "all", text: "All notifications"},
            {value: "read", text: "Read"},
            {value: "unread", text: "Unread"},
        ];

        if (this.#defaultFilters["state"] != null) {
            for (let i=1 ; i<selectOptions.length ; i++) {
                if (this.#defaultFilters["state"] == selectOptions[i].value) {
                    selectedOptionIndex = i;
                    break;
                }
            }
        }

        this.#stateFilterElmt = new FilterSelect();
        this.#filtersContainerElmt.appendChild(this.#stateFilterElmt);
        this.#stateFilterElmt.load(selectOptions, selectedOptionIndex);

        if (!this.#stateFilterElmt.isDefaultSelected) {
            this.#accordionFiltersCollapsibleElmt.show();
        }
    }

    #initTabs() {
        this.#addCampaignDropDownListElmt.innerHTML = "";
        for (let campaignData of this.#campaigns) {
            let addCampaignDropdownItemContainer = document.createElement("li");
            addCampaignDropdownItemContainer.id = `camp-${campaignData.id}-includeBtn`;
            this.#addCampaignDropDownListElmt.appendChild(addCampaignDropdownItemContainer);

            let addCampaignDropdownItem = document.createElement("a");
            addCampaignDropdownItem.classList.add("dropdown-item");
            addCampaignDropdownItem.setAttribute("role", "button");
            addCampaignDropdownItem.innerText = campaignData.name;
            addCampaignDropdownItemContainer.appendChild(addCampaignDropdownItem);

            addCampaignDropdownItem.addEventListener("click", () => {
                this.#addCampaignTab(campaignData, 0, true);
            });
        }
    }

    #initEventListeners() {
        this.#addCampaignDropDownBtnElmt.addEventListener("hidden.bs.dropdown", () => {
            this.#updateAddCampaignDropdownBtnStatus();
        });

        this.#timestampMinSearchFilterElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#timestampMaxSearchFilterElmt.dateMin = this.#timestampMinSearchFilterElmt.date;

            for (let campId of this.#selectedCampaignIds) {
                let campaignTabPagination = document.getElementById(`camp-${campId}-Pagination`);
                campaignTabPagination.page = 1;
                let campaignData = this.#getCampaignData(campId);
                this.#refreshNotifications(campaignData);
            }
        });

        this.#timestampMaxSearchFilterElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#timestampMinSearchFilterElmt.dateMax = this.#timestampMaxSearchFilterElmt.date;

            for (let campId of this.#selectedCampaignIds) {
                let campaignTabPagination = document.getElementById(`camp-${campId}-Pagination`);
                campaignTabPagination.page = 1;
                let campaignData = this.#getCampaignData(campId);
                this.#refreshNotifications(campaignData);
            }
        });

        this.#stateFilterElmt.addEventListener("change", (event) => {
            event.preventDefault();

            for (let campId of this.#selectedCampaignIds) {
                let campaignMarkAsReadLink = document.getElementById(`camp-${campId}-MarkAsRead`);
                if (this.#stateFilterElmt.value == "read") {
                    campaignMarkAsReadLink.classList.add("d-none", "invisible");
                }
                else {
                    campaignMarkAsReadLink.classList.remove("d-none", "invisible");
                }

                let campaignTabPagination = document.getElementById(`camp-${campId}-Pagination`);
                campaignTabPagination.page = 1;
                let campaignData = this.#getCampaignData(campId);
                this.#refreshNotifications(campaignData);
            }
        });

        this.#removeFiltersBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            if (this.#timestampMinSearchFilterElmt.date != null || this.#timestampMinSearchFilterElmt.time != null && this.#timestampMaxSearchFilterElmt.date != null || this.#timestampMaxSearchFilterElmt.time != null) {
                this.#timestampMinSearchFilterElmt.reset();
                this.#timestampMaxSearchFilterElmt.reset();
                hasFilterChanged = true;
            }
            if (!this.#stateFilterElmt.isDefaultSelected) {
                this.#stateFilterElmt.reset();
                hasFilterChanged = true;
            }
            if (hasFilterChanged) {
                for (let campId of this.#selectedCampaignIds) {
                    let campaignTabPagination = document.getElementById(`camp-${campId}-Pagination`);
                    campaignTabPagination.page = 1;
                    let campaignData = this.#getCampaignData(campId);
                    this.#refreshNotifications(campaignData);
                }
            }
        });

        this.#notifInfoModalElmt.addEventListener("show.bs.modal", (event) => {
            // event.relatedTarget is the HTML element that triggered the modal
            this.#currentNotifElmt = event.relatedTarget;
            this.#loadCurrentNotifInfo();
        });

        this.#notifInfoModalElmt.addEventListener("hide.bs.modal", (event) => {
            this.#currentNotifElmt.classList.remove("app-table-tr-selected");
            this.#currentNotifElmt = null;

            this.#notifInfoContainerElmt.innerHTML = "";
            this.#eventInfoContainerElmt.innerHTML = "";
            this.#eventInfoDescriptionElmt.innerText = "";
        });

        this.#notifInfoNavFirstElmt.addEventListener("click", () => {
            if (this.#currentNotifElmt != null) {
                this.#currentNotifElmt.classList.remove("app-table-tr-selected");
            }

            let campaignId = this.#currentTabCampaignData.id;
            let campaignNotifsPagination = document.getElementById(`camp-${campaignId.toString()}-Pagination`);
            let tableBodyContainerElmt = document.getElementById(`camp-${campaignId.toString()}-tbody`);

            let updateAndLoadNotifInfo = () => {
                // Get notif at index=0 in table.
                this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="0"]`);
                this.#loadCurrentNotifInfo();
            };

            // Need to load first page before loading notif info?
            if (campaignNotifsPagination.page != campaignNotifsPagination.firstPage) {
                campaignNotifsPagination.page = campaignNotifsPagination.firstPage;
                this.#refreshNotifications(this.#currentTabCampaignData, updateAndLoadNotifInfo);
            }
            else {
                updateAndLoadNotifInfo();
            }
        });

        this.#notifInfoNavPreviousElmt.addEventListener("click", () => {
            let curIndex = 0;
            if (this.#currentNotifElmt != null) {
                curIndex = Parser.parseIntOrDefault(this.#currentNotifElmt.getAttribute("data-index"), 0);
                this.#currentNotifElmt.classList.remove("app-table-tr-selected");
            }

            let campaignId = this.#currentTabCampaignData.id;
            let campaignNotifsPagination = document.getElementById(`camp-${campaignId.toString()}-Pagination`);
            let tableBodyContainerElmt = document.getElementById(`camp-${campaignId.toString()}-tbody`);

            // Need to load previous page before loading notif info?
            if (curIndex <= 0 && campaignNotifsPagination.previousPage < campaignNotifsPagination.page) {
                campaignNotifsPagination.page = campaignNotifsPagination.previousPage;
                this.#refreshNotifications(this.#currentTabCampaignData, () => {
                    // Get notif at index=PAGE_SIZE in table.
                    this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="${tableBodyContainerElmt.rows.length - 1}"]`);
                    this.#loadCurrentNotifInfo();
                });
            }
            else {
                // Get notif at index=curIndex-1 in table.
                let prevIndex = Math.max(0, curIndex - 1);
                this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="${prevIndex}"]`);
                this.#loadCurrentNotifInfo();
            }
        });

        this.#notifInfoNavNextElmt.addEventListener("click", () => {
            let curIndex = 0;
            if (this.#currentNotifElmt != null) {
                curIndex = Parser.parseIntOrDefault(this.#currentNotifElmt.getAttribute("data-index"), 0);
                this.#currentNotifElmt.classList.remove("app-table-tr-selected");
            }

            let campaignId = this.#currentTabCampaignData.id;
            let campaignNotifsPagination = document.getElementById(`camp-${campaignId.toString()}-Pagination`);
            let tableBodyContainerElmt = document.getElementById(`camp-${campaignId.toString()}-tbody`);

            // Need to load next page before loading notif info?
            if (curIndex >= tableBodyContainerElmt.rows.length - 1 && campaignNotifsPagination.nextPage > campaignNotifsPagination.page) {
                campaignNotifsPagination.page = campaignNotifsPagination.nextPage;
                this.#refreshNotifications(this.#currentTabCampaignData, () => {
                    // Get notif at index=0 in table.
                    this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="0"]`);
                    this.#loadCurrentNotifInfo();
                });
            }
            else {
                // Get notif at index=curIndex+1 in table.
                let nextIndex = Math.min(Math.max(0, tableBodyContainerElmt.rows.length - 1), curIndex + 1);
                this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="${nextIndex}"]`);
                this.#loadCurrentNotifInfo();
            }
        });

        this.#notifInfoNavLastElmt.addEventListener("click", (event) => {
            if (this.#currentNotifElmt != null) {
                this.#currentNotifElmt.classList.remove("app-table-tr-selected");
            }

            let campaignId = this.#currentTabCampaignData.id;
            let campaignNotifsPagination = document.getElementById(`camp-${campaignId.toString()}-Pagination`);
            let tableBodyContainerElmt = document.getElementById(`camp-${campaignId.toString()}-tbody`);

            let updateAndLoadNotifInfo = () => {
                // Get notif at index=PAGE_SIZE in table.
                this.#currentNotifElmt = tableBodyContainerElmt.querySelector(`tr[data-index="${tableBodyContainerElmt.rows.length - 1}"]`);
                this.#loadCurrentNotifInfo();
            };

            // Need to load last page before loading notif info?
            if (campaignNotifsPagination.lastPage > campaignNotifsPagination.page) {
                campaignNotifsPagination.page = campaignNotifsPagination.lastPage;
                this.#refreshNotifications(this.#currentTabCampaignData, updateAndLoadNotifInfo);
            }
            else {
                updateAndLoadNotifInfo();
            }
        });

        window.addEventListener("resize", () => {
            for (let campaignId of this.#selectedCampaignIds) {
                this.#updateDescriptionCellWidth(campaignId);
            }
        });
    }

    #updateNotifReadStatus(notifId, updateReadState = true, afterUpdateCallback = null) {
        if (this.#updateNotifStatusReqIDs[notifId] != null) {
            this.#internalAPIRequester.abort(this.#updateNotifStatusReqIDs[notifId]);
            this.#updateNotifStatusReqIDs[notifId] = null;
        }

        this.#updateNotifStatusReqIDs[notifId] = this.#internalAPIRequester.put(
            flaskES6.urlFor(`api.notifications.update`, {id: notifId}),
            {read: updateReadState},
            null,
            (data) => {
                let notifIdPrefix = `notif-${notifId.toString()}`;
                let notifRowElmt = document.getElementById(`${notifIdPrefix}-row`);
                let notifTimestampElmt = document.getElementById(`${notifIdPrefix}-timestamp`);

                notifRowElmt.notifData = data.data;

                if (data.data.read) {
                    notifRowElmt.classList.remove("bg-warning", "bg-opacity-10");
                    notifTimestampElmt.classList.remove("border-start", "border-end-0", "border-5", "border-warning");
                }
                else {
                    notifRowElmt.classList.add("bg-warning", "bg-opacity-10");
                    notifTimestampElmt.classList.add("border-start", "border-end-0", "border-5", "border-warning");
                }

                afterUpdateCallback?.();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #markAllAsRead(campaignData) {
        if (this.#markAllAsReadReqIDs[campaignData.id] != null) {
            this.#internalAPIRequester.abort(this.#markAllAsReadReqIDs[campaignData.id]);
            this.#markAllAsReadReqIDs[campaignData.id] = null;
        }

        this.#markAllAsReadReqIDs[campaignData.id] = this.#internalAPIRequester.put(
            flaskES6.urlFor(`api.notifications.mark_all_as_read`, {campaign_id: campaignData.id}),
            null,
            null,
            (data) => {
                if (data.success) {
                    this.#notifUpdater.refresh();
                    this.#refreshNotifications(campaignData);
                }
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #updateAddCampaignDropdownBtnStatus() {
        let addCampaignDropDown = new bootstrap.Dropdown(this.#addCampaignDropDownBtnElmt)
        addCampaignDropDown?.hide();

        let activeAddCampaignDropdownItemContainers = [].slice.call(this.#addCampaignDropDownListElmt.querySelectorAll("li:not(.d-none)"));

        // Update add campaign dropdown button visibility.
        if (activeAddCampaignDropdownItemContainers.length > 0) {
            this.#addCampaignDropDownBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#addCampaignDropDownBtnElmt.classList.add("d-none", "invisible");
        }

        // Update add campaign dropdown label visibility.
        if (this.#selectedCampaignIds.length > 0) {
            this.#addCampaignDropDownLabelElmt.classList.add("d-none", "invisible");
        }
        else {
            this.#addCampaignDropDownLabelElmt.classList.remove("d-none", "invisible");
        }
    }

    #updateDescriptionCellWidth(campaignId) {
        let descriptionCellWidth = this.#campaignTabContentsElmt.offsetWidth * 0.2;
        let campaignNotifsTableElmt = document.getElementById(`camp-${campaignId.toString()}-notifsTable`);
        if (campaignNotifsTableElmt != null) {
            for (let rowElmt of campaignNotifsTableElmt.rows) {
                rowElmt.cells.item(rowElmt.cells.length - 1).style.maxWidth = `${descriptionCellWidth}px`;
            }
        }
    }

    #addCampaignTab(campaignData, notifsCount = 0, selectTab = false) {
        // Update the list of selected campaign IDs.
        if (!this.#selectedCampaignIds.includes(campaignData.id)) {
            this.#selectedCampaignIds.push(campaignData.id);
        }

        let campaignDataIdPrefix = `camp-${campaignData.id.toString()}`;
        let campaginTabContentId = `${campaignDataIdPrefix}-tabcontent`;

        // Tab.
        let campaignTab = document.createElement("li");
        campaignTab.classList.add("nav-item");
        campaignTab.setAttribute("role", "presentation");

        let campaignTabBtn = document.createElement("button");
        campaignTabBtn.classList.add("nav-link", "position-relative");
        campaignTabBtn.id = `${campaignDataIdPrefix}-tab`;
        campaignTabBtn.setAttribute("type", "button");
        campaignTabBtn.setAttribute("role", "tab");
        campaignTabBtn.setAttribute("data-bs-toggle", "tab");
        campaignTabBtn.setAttribute("data-bs-target", `#${campaginTabContentId}`);
        campaignTabBtn.setAttribute("aria-controls", campaginTabContentId);
        campaignTabBtn.setAttribute("aria-selected", false);
        campaignTab.appendChild(campaignTabBtn);
        this.#campaignTabsElmt.appendChild(campaignTab);

        let campaignTabBtnText = document.createElement("span");
        campaignTabBtnText.innerText = campaignData.name;
        campaignTabBtn.appendChild(campaignTabBtnText);

        let campaignTabBtnCount = document.createElement("span");
        campaignTabBtnCount.classList.add("badge", "bg-secondary", "ms-2");
        campaignTabBtnCount.id = `${campaignDataIdPrefix}-TotalCount`;
        campaignTabBtnCount.innerText = notifsCount.toString();
        campaignTabBtn.appendChild(campaignTabBtnCount);

        let campaignTabCloseContainer = document.createElement("span");
        campaignTabCloseContainer.classList.add("position-absolute", "top-0", "end-0", "translate-middle-y");
        campaignTabBtn.appendChild(campaignTabCloseContainer);

        let campaignTabCloseLink = document.createElement("a");
        campaignTabCloseLink.classList.add("text-decoration-none", "text-danger", "bg-white", "rounded-circle");
        campaignTabCloseLink.title = "Remove campaign tab";
        campaignTabCloseContainer.appendChild(campaignTabCloseLink);

        let campaignTabCloseLinkIcon = document.createElement("i");
        campaignTabCloseLinkIcon.classList.add("bi", "bi-x-circle-fill");
        campaignTabCloseLink.appendChild(campaignTabCloseLinkIcon);

        // Tab content.
        let campaignTabContent = document.createElement("div");
        campaignTabContent.classList.add("tab-pane", "p-3");
        campaignTabContent.id = campaginTabContentId;
        campaignTabContent.setAttribute("role", "tabpanel");
        campaignTabContent.setAttribute("aria-labelledby", campaignTab.id);
        this.#campaignTabContentsElmt.appendChild(campaignTabContent);

        let campaignTabContentNav = document.createElement("nav");
        campaignTabContentNav.classList.add("row", "mb-2");
        campaignTabContentNav.setAttribute("aria-label", `Notifications pagination for ${campaignData.name}`);
        campaignTabContent.appendChild(campaignTabContentNav);

        let campaignTabContentNavPageSizeContainer = document.createElement("div");
        campaignTabContentNavPageSizeContainer.classList.add("col-auto", "align-self-center", "py-1");
        campaignTabContentNav.appendChild(campaignTabContentNavPageSizeContainer);

        let campaignTabContentNavPageSize = new PageSizeSelector();
        campaignTabContentNavPageSize.id = `${campaignDataIdPrefix}-PageSize`;
        campaignTabContentNavPageSizeContainer.appendChild(campaignTabContentNavPageSize);

        let campaignTabContentNavPaginationContainer = document.createElement("div");
        campaignTabContentNavPaginationContainer.classList.add("col", "d-flex", "flex-wrap", "justify-content-end", "align-items-center", "gap-2");
        campaignTabContentNav.appendChild(campaignTabContentNavPaginationContainer);

        let campaignTabContentNavItemsCountContainer = document.createElement("small");
        campaignTabContentNavItemsCountContainer.classList.add("text-muted", "text-nowrap");
        campaignTabContentNavPaginationContainer.appendChild(campaignTabContentNavItemsCountContainer);
        let campaignTabContentNavItemsCount = new ItemsCount();
        campaignTabContentNavItemsCount.id = `${campaignDataIdPrefix}-ItemsCount`;
        campaignTabContentNavItemsCountContainer.appendChild(campaignTabContentNavItemsCount);

        let campaignTabContentNavPagination = new Pagination();
        campaignTabContentNavPagination.id = `${campaignDataIdPrefix}-Pagination`;
        campaignTabContentNavPaginationContainer.appendChild(campaignTabContentNavPagination);

        // Update include campaign dropdown content.
        this.#addCampaignDropDownListElmt.querySelector(`#${campaignDataIdPrefix}-includeBtn`)?.classList.add("d-none", "invisible");
        this.#updateAddCampaignDropdownBtnStatus();

        // Init event listeners for components in this tab.
        campaignTab.addEventListener("show.bs.tab", () => {
            this.#currentTabCampaignData = campaignData;

            this.#updateDescriptionCellWidth(campaignData.id);
        });

        campaignTabCloseLink.addEventListener("click", () => {
            // Remove current tab campaign id from the list of selected campaign IDs.
            this.#selectedCampaignIds = this.#selectedCampaignIds.filter(campId => campId != campaignData.id);

            // Remove tab and tab content components.
            campaignTab.remove();
            campaignTabContent.remove();

            // Update include campaign dropdown content.
            document.getElementById(`${campaignDataIdPrefix}-includeBtn`).classList.remove("d-none", "invisible");
            this.#updateAddCampaignDropdownBtnStatus();

            // Select first tab, if any.
            let triggerFirstTabElmt = this.#campaignTabsElmt.querySelector("li:first-child button");
            if (triggerFirstTabElmt != null) {
                bootstrap.Tab.getOrCreateInstance(triggerFirstTabElmt).show();
            }
        });

        campaignTabContentNavPageSize.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                campaignTabContentNavPagination.page = 1;
                this.#refreshNotifications(campaignData);
            }
        });

        campaignTabContentNavPagination.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#refreshNotifications(campaignData);
        });
        
        // Do this tab should be shown?
        if (selectTab) {
            bootstrap.Tab.getOrCreateInstance(campaignTabBtn)?.show();
        }

        // Fill tab content with notifications table, pagination...
        this.#buildAndMountNotificationTable(campaignData, campaignTabContent);
        this.#refreshNotifications(campaignData);
        this.#updateDescriptionCellWidth(campaignData.id);
    }

    #buildAndMountNotificationTable(campaignData, parentContainerElmt) {
        let campaignDataIdPrefix = `camp-${campaignData.id.toString()}`;

        let tableContainer = document.createElement("div");
        tableContainer.classList.add("table-responsive-xl");
        parentContainerElmt.appendChild(tableContainer);

        let tableElmt = document.createElement("table");
        tableElmt.id = `${campaignDataIdPrefix}-notifsTable`;
        tableElmt.classList.add("table", "table-sm", "table-hover", "table-bordered");
        tableContainer.appendChild(tableElmt);

        // Create table header.
        let tableHeaderContainerElmt = document.createElement("thead");
        tableElmt.appendChild(tableHeaderContainerElmt);

        let tableHeaderElmt = document.createElement("tr");
        tableHeaderElmt.classList.add("align-middle");
        tableHeaderContainerElmt.appendChild(tableHeaderElmt);

        let tableHeaderTimestampColElmt = document.createElement("th");
        tableHeaderTimestampColElmt.setAttribute("scope", "col");
        tableHeaderTimestampColElmt.setAttribute("rowspan", 2);
        tableHeaderElmt.appendChild(tableHeaderTimestampColElmt);

        let timestampSortElmt = document.createElement("a");
        timestampSortElmt.id = "sort-timestamp";
        timestampSortElmt.classList.add("hstack", "gap-2");
        timestampSortElmt.setAttribute("role", "button");
        timestampSortElmt.setAttribute("data-field", "timestamp");
        timestampSortElmt.setAttribute("data-direction", "-");
        tableHeaderTimestampColElmt.appendChild(timestampSortElmt);

        let sortField = timestampSortElmt.getAttribute("data-field") || "";
        let sortDirection = timestampSortElmt.getAttribute("data-direction") || "";
        let sortData = `${sortDirection}${sortField}`;
        if (sortData != "") {
            if (this.#sort[campaignData.id] == null) {
                this.#sort[campaignData.id] = [];
            }
            this.#sort[campaignData.id].push(sortData);
        }

        let timestampTextElmt = document.createElement("span");
        timestampTextElmt.innerText = "Notification timestamp";
        timestampSortElmt.appendChild(timestampTextElmt);

        let timestampSortIconElmt = document.createElement("i");
        timestampSortIconElmt.classList.add("bi", "bi-sort-down");
        timestampSortElmt.appendChild(timestampSortIconElmt);

        let tableHeaderEventColElmt = document.createElement("th");
        tableHeaderEventColElmt.classList.add("border-start", "border-4");
        tableHeaderEventColElmt.setAttribute("scope", "col");
        tableHeaderEventColElmt.setAttribute("colspan", 6);
        tableHeaderElmt.appendChild(tableHeaderEventColElmt);

        let tableHeaderEventColContainerElmt = document.createElement("div");
        tableHeaderEventColContainerElmt.classList.add("d-flex", "justify-content-between", "gap-2");
        tableHeaderEventColElmt.appendChild(tableHeaderEventColContainerElmt);

        let tableHeaderEventColTextElmt = document.createElement("span");
        tableHeaderEventColTextElmt.innerText = "Notified event";
        tableHeaderEventColContainerElmt.appendChild(tableHeaderEventColTextElmt);

        let markAllAsReadLinkElmt = document.createElement("a");
        markAllAsReadLinkElmt.id = `${campaignDataIdPrefix}-MarkAsRead`;
        markAllAsReadLinkElmt.classList.add("fw-normal", "text-nowrap");
        if (this.#stateFilterElmt.value == "read") {
            markAllAsReadLinkElmt.classList.add("d-none", "invisible");
        }
        markAllAsReadLinkElmt.setAttribute("role", "button");
        markAllAsReadLinkElmt.innerText = "Mark all as read";
        tableHeaderEventColContainerElmt.appendChild(markAllAsReadLinkElmt);

        let tableHeaderEventElmt = document.createElement("tr");
        tableHeaderEventElmt.classList.add("align-top");
        tableHeaderContainerElmt.appendChild(tableHeaderEventElmt);

        let tableHeaderEventTimestampColElmt = document.createElement("th");
        tableHeaderEventTimestampColElmt.classList.add("border-start", "border-4");
        tableHeaderEventTimestampColElmt.setAttribute("scope", "col");
        tableHeaderEventTimestampColElmt.innerText = "Timestamp";
        tableHeaderEventElmt.appendChild(tableHeaderEventTimestampColElmt);

        for (let eventCol of ["Source", "Level", "Category", "Campaign scope", "Description"]) {
            let tableHeaderEventInfoColElmt = document.createElement("th");
            tableHeaderEventInfoColElmt.innerText = eventCol;
            tableHeaderEventElmt.appendChild(tableHeaderEventInfoColElmt);
        }

        let tableBodyContainerElmt = document.createElement("tbody");
        tableBodyContainerElmt.id = `${campaignDataIdPrefix}-tbody`;
        tableElmt.appendChild(tableBodyContainerElmt);

        // Init event listeners for notifications table components.
        markAllAsReadLinkElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#markAllAsRead(campaignData);
        });

        timestampSortElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let sortField = timestampSortElmt.getAttribute("data-field");
            let sortDirection = timestampSortElmt.getAttribute("data-direction");

            let newSortDirection = sortDirection == "-" ? "+" : "-";
            timestampSortElmt.setAttribute("data-direction", newSortDirection);

            if (timestampSortIconElmt.classList.contains("bi-sort-up")) {
                timestampSortIconElmt.classList.remove("bi-sort-up");
                timestampSortIconElmt.classList.add("bi-sort-down");
            }
            else {
                timestampSortIconElmt.classList.remove("bi-sort-down");
                timestampSortIconElmt.classList.add("bi-sort-up");
            }

            let oldSortData = `${sortDirection}${sortField}`;
            let newSortData = `${newSortDirection}${sortField}`;

            // Remove previous sort on field.
            let sortIndex = this.#sort[campaignData.id].indexOf(oldSortData);
            if (sortIndex != -1) {
                this.#sort[campaignData.id].splice(sortIndex, 1);
            }
            // Add new sort on field.
            if (newSortData != "") {
                this.#sort[campaignData.id].push(newSortData);
            }

            this.#refreshNotifications(campaignData);
        });
    }

    #createNotifRowElement(notifData, campaignData, rowIndex) {
        let rowElmt = document.createElement("tr");
        rowElmt.id = `notif-${notifData.id.toString()}-row`;
        rowElmt.classList.add("align-middle");
        if (!notifData.read) {
            rowElmt.classList.add("bg-warning", "bg-opacity-10");
        }
        rowElmt.setAttribute("role", "button");
        rowElmt.setAttribute("data-bs-toggle", "modal");
        rowElmt.setAttribute("data-bs-target", "#notifInfoModal");
        rowElmt.setAttribute("data-index", rowIndex)
        rowElmt.notifData = notifData;

        let timestampElmt = document.createElement("th");
        timestampElmt.id = `notif-${notifData.id.toString()}-timestamp`;
        if (!notifData.read) {
            timestampElmt.classList.add("border-start", "border-end-0", "border-5", "border-warning");
        }
        timestampElmt.setAttribute("scope", "row");
        timestampElmt.innerText = TimeDisplay.toLocaleString(new Date(notifData.timestamp), {timezone: campaignData.timezone});
        rowElmt.appendChild(timestampElmt);

        let eventRowElmt = this.#createEventRowElement(notifData.event, campaignData);
        for (let [cellIndex, eventCellElmt] of Object.entries(eventRowElmt.cells)) {
            if (cellIndex == 0) {
                eventCellElmt.classList.add("border-start", "border-4");
            }
            rowElmt.appendChild(eventCellElmt);
        }

        return rowElmt;
    }

    #refreshNotifications(campaignData, afterResfreshCallback = null) {
        let campaignDataIdPrefix = `camp-${campaignData.id.toString()}`;
        let campaignNotifsPageSize = document.getElementById(`${campaignDataIdPrefix}-PageSize`);
        let campaignNotifsItemsCount = document.getElementById(`${campaignDataIdPrefix}-ItemsCount`);
        let campaignNotifsPagination = document.getElementById(`${campaignDataIdPrefix}-Pagination`);
        let campaignNotifsTotalCount = document.getElementById(`${campaignDataIdPrefix}-TotalCount`);
        let tableBodyContainerElmt = document.getElementById(`${campaignDataIdPrefix}-tbody`);

        // Set loading state for:
        //  - notif items count (on top of table)
        campaignNotifsItemsCount.setLoading();
        //  - notif count (badge in tab)
        campaignNotifsTotalCount.innerHTML = "";
        campaignNotifsTotalCount.innerText = "";
        campaignNotifsTotalCount.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));
        //  - notifs table body
        tableBodyContainerElmt.innerHTML = "";
        let loadingContainerElmt = document.createElement("tr");
        let loadingElmt = document.createElement("td");
        loadingElmt.setAttribute("colspan", 7);
        loadingElmt.classList.add("text-center", "p-4");
        loadingElmt.appendChild(new Spinner());
        loadingContainerElmt.appendChild(loadingElmt);
        tableBodyContainerElmt.appendChild(loadingContainerElmt);

        let searchOptions = {
            "page_size": campaignNotifsPageSize.current,
            "page": campaignNotifsPagination.page,
            "sort": this.#sort[campaignData.id].join(),
            "campaign_id": campaignData.id,
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
        if (this.#stateFilterElmt.value != "all") {
            searchOptions["read"] = this.#stateFilterElmt.value == "read";
        }

        if (this.#searchReqIDs[campaignData.id] != null) {
            this.#internalAPIRequester.abort(this.#searchReqIDs[campaignData.id]);
            this.#searchReqIDs[campaignData.id] = null;
        }

        this.#searchReqIDs[campaignData.id] = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.notifications.retrieve_list`, searchOptions),
            (data) => {
                tableBodyContainerElmt.innerHTML = "";

                campaignNotifsTotalCount.innerHTML = "";
                campaignNotifsTotalCount.innerText = data.pagination.total.toString();

                if (data.data.length > 0) {
                    for (let [rowIndex, notifData] of data.data.entries()) {
                        let notifItemElmt = this.#createNotifRowElement(notifData, campaignData, rowIndex);
                        tableBodyContainerElmt.appendChild(notifItemElmt);
                    }
                }
                else {
                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noItemElmt.innerText = "No search results";
                    tableBodyContainerElmt.appendChild(noItemElmt);
                }

                let paginationOpts = {
                    pageSize: campaignNotifsPageSize.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                campaignNotifsPagination.reload(paginationOpts);
                campaignNotifsItemsCount.update({totalCount: campaignNotifsPagination.totalItems, firstItem: campaignNotifsPagination.startItem, lastItem: campaignNotifsPagination.endItem});

                afterResfreshCallback?.();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    #loadCurrentNotifInfo() {
        if (this.#currentNotifElmt != null) {
            this.#currentNotifElmt.classList.add("app-table-tr-selected");

            // Mark notif as read (if unread only, of course).
            let afterUpdateNotifReadStatusCallback = (readState) => {
                updateNotifStatusBtnElmt.innerText = `Mark as ${readState ? "unread": "read"}`;

                if (readState) {
                    statusValueElmt.classList.remove("fw-bold", "text-danger");
                    statusValueElmt.innerText = "read";
                }
                else {
                    statusValueElmt.classList.add("fw-bold", "text-danger");
                    statusValueElmt.innerText = "unread";
                }

                this.#notifUpdater.refresh();
            };

            if (!this.#currentNotifElmt.notifData.read) {
                this.#updateNotifReadStatus(this.#currentNotifElmt.notifData.id, true, () => { afterUpdateNotifReadStatusCallback(true); });
            }

            let campaignId = this.#currentTabCampaignData.id;
            let campaignNotifsPageSize = document.getElementById(`camp-${campaignId.toString()}-PageSize`);
            let campaignNotifsPagination = document.getElementById(`camp-${campaignId.toString()}-Pagination`);

            let rowIndex = Parser.parseIntOrDefault(this.#currentNotifElmt.getAttribute("data-index"), 0);

            // Update footer navigation (on page-sized events table).
            let itemIndex = ((campaignNotifsPagination.page - 1) * campaignNotifsPageSize.current) + rowIndex + 1;
            this.#notifInfoRowIndexElmt.innerText = itemIndex.toString();
            this.#notifInfoRowCountElmt.innerText = campaignNotifsPagination.totalItems.toString();
            this.#notifInfoPageIndexElmt.innerText = campaignNotifsPagination.page.toString();
            this.#notifInfoPageCountElmt.innerText = campaignNotifsPagination.lastPage.toString();
            if (itemIndex <= 1) {
                this.#notifInfoNavFirstElmt.parentElement.classList.add("disabled");
                this.#notifInfoNavPreviousElmt.parentElement.classList.add("disabled");
            }
            else {
                this.#notifInfoNavFirstElmt.parentElement.classList.remove("disabled");
                this.#notifInfoNavPreviousElmt.parentElement.classList.remove("disabled");
            }
            if (itemIndex >= campaignNotifsPagination.totalItems) {
                this.#notifInfoNavNextElmt.parentElement.classList.add("disabled");
                this.#notifInfoNavLastElmt.parentElement.classList.add("disabled");
            }
            else {
                this.#notifInfoNavNextElmt.parentElement.classList.remove("disabled");
                this.#notifInfoNavLastElmt.parentElement.classList.remove("disabled");
            }

            this.#notifInfoContainerElmt.innerHTML = "";

            let campaignColElmt = document.createElement("div");
            campaignColElmt.classList.add("col-auto");
            this.#notifInfoContainerElmt.appendChild(campaignColElmt);

            let campaignTitleElmt = document.createElement("h6");
            campaignTitleElmt.classList.add("fw-bold");
            campaignTitleElmt.innerText = "Campaign";
            campaignColElmt.appendChild(campaignTitleElmt);

            let campaignValueElmt = document.createElement("p");
            campaignValueElmt.innerText = this.#currentTabCampaignData.name;
            campaignColElmt.appendChild(campaignValueElmt);

            let timestampColElmt = document.createElement("div");
            timestampColElmt.classList.add("col-auto");
            this.#notifInfoContainerElmt.appendChild(timestampColElmt);

            let timestampTitleElmt = document.createElement("h6");
            timestampTitleElmt.classList.add("fw-bold");
            timestampTitleElmt.innerText = "Timestamp";
            timestampColElmt.appendChild(timestampTitleElmt);

            let timestampValueElmt = document.createElement("p");
            timestampValueElmt.innerText = TimeDisplay.toLocaleString(new Date(this.#currentNotifElmt.notifData.timestamp), {timezone: this.#currentTabCampaignData.timezone});
            timestampColElmt.appendChild(timestampValueElmt);

            let statusColElmt = document.createElement("div");
            statusColElmt.classList.add("col-auto");
            this.#notifInfoContainerElmt.appendChild(statusColElmt);

            let statusTitleElmt = document.createElement("h6");
            statusTitleElmt.classList.add("fw-bold");
            statusTitleElmt.innerText = "Status";
            statusColElmt.appendChild(statusTitleElmt);

            let statusValueElmt = document.createElement("p");
            if (!this.#currentNotifElmt.notifData.read) {
                statusValueElmt.classList.add("fw-bold", "text-danger");
            }
            statusValueElmt.innerText = this.#currentNotifElmt.notifData.read ? "read" : "unread";
            statusColElmt.appendChild(statusValueElmt);

            let colElmt = document.createElement("div");
            colElmt.classList.add("col-auto", "ms-auto");
            this.#notifInfoContainerElmt.appendChild(colElmt);

            let updateNotifStatusBtnElmt = document.createElement("button");
            updateNotifStatusBtnElmt.classList.add("btn", "btn-sm", "btn-outline-secondary");
            updateNotifStatusBtnElmt.innerText = `Mark as ${this.#currentNotifElmt.notifData.read ? "unread": "read"}`;
            colElmt.appendChild(updateNotifStatusBtnElmt);

            updateNotifStatusBtnElmt.addEventListener("click", (event) => {
                event.preventDefault();

                let newReadState = !this.#currentNotifElmt.notifData.read;
                this.#updateNotifReadStatus(this.#currentNotifElmt.notifData.id, newReadState, () => { afterUpdateNotifReadStatusCallback(newReadState); });
            });

            // Load event info (timeseries, sites...).
            this.#loadCurrentEventInfo();
        }
    }

    #loadCurrentEventInfo() {
        let eventData = this.#currentNotifElmt.notifData.event;

        this.#eventInfoContainerElmt.innerHTML = "";
        let eventRowElmt = this.#createEventRowElement(eventData, this.#currentTabCampaignData, false);
        this.#eventInfoContainerElmt.appendChild(eventRowElmt);

        this.#eventInfoDescriptionElmt.innerText = eventData.description != null ? eventData.description : "-";

        // Load event info tabs (timeseries, sites...).
        this.#loadEventInfoTabs(eventData.id);
    }

    #loadEventInfoTabs(eventId) {
        // Show event info tabs spinner loader.
        this.#eventInfoTabSpinnerElmt.classList.remove("d-none", "invisible");
        // Hide all event info tabs and contents until data on timeseries or structural elements (if any) is loaded.
        this.#eventInfoTabsElmt.classList.add("d-none", "invisible");
        this.#eventInfoTabContentsElmt.classList.add("d-none", "invisible");
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

                        this.#eventInfoTabElmts[eventInfoTabKey].classList.remove("disabled", "d-none", "invisible");
                        this.#eventInfoTabContentElmts[eventInfoTabKey].classList.remove("d-none", "invisible");
                        nbTabLoaded += 1;

                        // Activate and show the first event info tab that could be loaded.
                        if (nbTabLoaded == 1) {
                            this.#eventInfoTabElmts[eventInfoTabKey].classList.add("active");
                            this.#eventInfoTabContentElmts[eventInfoTabKey].classList.add("show", "active");
                        }
                    }
                    else {
                        this.#eventInfoTabElmts[eventInfoTabKey].classList.add("disabled", "d-none", "invisible");
                        this.#eventInfoTabContentElmts[eventInfoTabKey].classList.add("d-none", "invisible");
                    }
                }

                // Hide event info tabs spinner loader.
                this.#eventInfoTabSpinnerElmt.classList.add("d-none", "invisible");
            },
            (error) => {
                // Hide event info tabs spinner loader.
                this.#eventInfoTabSpinnerElmt.classList.add("d-none", "invisible");

                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            () => {
                // Show event info tabs and contents if at least one tab has been loaded.
                if (nbTabLoaded > 0) {
                    this.#eventInfoTabsElmt.classList.remove("d-none", "invisible");
                    this.#eventInfoTabContentsElmt.classList.remove("d-none", "invisible");
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

    #createEventRowElement(eventData, campaignData, withDescription = true) {
        let eventElmt = document.createElement("tr");
        eventElmt.classList.add("align-middle");

        let timestampElmt = document.createElement("th");
        timestampElmt.setAttribute("scope", "row");
        timestampElmt.innerText = TimeDisplay.toLocaleString(new Date(eventData.timestamp), {timezone: campaignData.timezone});
        eventElmt.appendChild(timestampElmt);

        let sourceElmt = document.createElement("td");
        sourceElmt.innerText = eventData.source;
        eventElmt.appendChild(sourceElmt);

        let levelCellElmt = document.createElement("td");
        eventElmt.appendChild(levelCellElmt);
        let levelBadgeElmt = new EventLevelBadge();
        levelBadgeElmt.setAttribute("level", eventData.level.toUpperCase());
        levelCellElmt.appendChild(levelBadgeElmt);

        let categoryElmt = document.createElement("td");
        let categoryData = this.#getEventCategoryData(eventData.category_id);
        categoryElmt.innerText = categoryData?.name != null ? categoryData.name : "?";
        eventElmt.appendChild(categoryElmt);

        let campaignScopeElmt = document.createElement("td");
        let campaignScopeData = this.#getCampaignScopeData(campaignData.id, eventData.campaign_scope_id);
        campaignScopeElmt.innerText = campaignScopeData?.name != null ? campaignScopeData.name : "?";
        eventElmt.appendChild(campaignScopeElmt);

        if (withDescription) {
            let descriptionElmt = document.createElement("td");
            descriptionElmt.classList.add("text-truncate");
            descriptionElmt.innerText = eventData.description != null ? eventData.description : "-";
            eventElmt.appendChild(descriptionElmt);
        }

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

    refresh() {
        if (this.#countReqID != null) {
            this.#internalAPIRequester.abort(this.#countReqID);
            this.#countReqID = null;
        }

        let countOptions = {};
        if (this.#stateFilterElmt.value != "all") {
            countOptions["read"] = this.#stateFilterElmt.value == "read";
        }

        this.#countReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.notifications.retrieve_count`, countOptions),
            (data) => {
                let isCurrentCampaignLoaded = false;

                for (let [index, campaignNotifsData] of Object.entries(data.data.campaigns)) {
                    let campaignData = this.#getCampaignData(campaignNotifsData.campaign_id);
                    let selectTab = (index == 0 || this.#currentCampaign?.id == campaignNotifsData.campaign_id);
                    this.#addCampaignTab(campaignData, campaignNotifsData.count, selectTab);
                    if (!isCurrentCampaignLoaded) {
                        isCurrentCampaignLoaded = campaignNotifsData.campaign_id == this.#currentCampaign?.id;
                    }
                }

                if (!isCurrentCampaignLoaded && this.#currentCampaign?.id != null) {
                    // Select current campaign tab only if no other campaign has unread notifications.
                    let selectTab = data.data.total <= 0;
                    this.#addCampaignTab(this.#currentCampaign, 0, selectTab);
                }
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}

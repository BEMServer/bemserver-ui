import { flaskES6 } from "../../../app.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import "../../components/itemsCount.js";
import "../../components/pagination.js";
import "../../components/time/datetimePicker.js";
import { StructuralElementSelector } from "../../components/structuralElements/selector.js";
import { TimeseriesSelector } from  "../../components/timeseries/selector.js";
import { ModalConfirm } from "../../components/modalConfirm.js";


export class EventEditView {

    #eventData = {};
    #structuralElementTypes = []

    #messagesElmt = null;
    #internalAPIRequester = null;
    #tsListReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;
    #structElmtListReqIDs = {};

    #sourceInputElmt = null;
    #sourceEditBtnElmt = null;

    #tsTabContentElmt = null;
    #tsBadgeCountElmt = null;
    #tsItemsCountElmt = null;
    #tsPageSizeElmt = null;
    #tsPaginationElmt = null;
    #tsContainerElmt = null;
    #tsLinkBtnElmt = null;
    #tsUnlinkSelectedBtnElmt = null;
    #tsUnlinkSelectedCountElmt = null;
    #tsSelectAllBtnElmt = null;
    #tsUnselectAllBtnElmt = null;
    #selectedTimeseriesLinks = {};
    #tsSelectModalElmt = null;
    #tsSelectModal = null;
    #tsSelector = null;
    #tsSelectedSaveBtnElmt = null;
    #tsUnlinkSelectedModalConfirm = null;

    #locTabContentElmts = {};
    #locBadgeCountElmts = {};
    #locItemsCountElmts = {};
    #locPageSizeElmts = {};
    #locPaginationElmts = {};
    #locContainerElmts = {};
    #locLinkBtnElmts = {};
    #locUnlinkSelectedBtnElmts = {};
    #locUnlinkSelectedCountElmts = {};
    #locSelectAllBtnElmts = {};
    #locUnselectAllBtnElmts = {};
    #siteSelector = null;
    #zoneSelector = null;
    #locSelectModalElmt = null;
    #locSelectModalTitleTypeElmt = null;
    #locSelectModal = null;
    #locSelectedSaveBtnElmt = null;
    #locUnlinkSelectedModalConfirms = {};
    #selectedLocations = {};

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#eventData = options.event;
        this.#structuralElementTypes = options.structuralElementTypes || [];
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#sourceInputElmt = document.getElementById("source");
        this.#sourceEditBtnElmt = document.getElementById("btnEditSource");

        this.#tsTabContentElmt = document.getElementById("timeseries-tabcontent");
        this.#tsBadgeCountElmt = document.getElementById("ts-badgeCount");
        this.#tsItemsCountElmt = document.getElementById("ts-itemsCount");
        this.#tsPageSizeElmt = document.getElementById("ts-pageSize");
        this.#tsPaginationElmt = document.getElementById("ts-pagination");
        this.#tsContainerElmt = document.getElementById("ts-container");
        this.#tsLinkBtnElmt = document.getElementById("ts-linkBtn");
        this.#tsUnlinkSelectedBtnElmt = document.getElementById("ts-unlinkSelectedBtn");
        this.#tsUnlinkSelectedCountElmt = document.getElementById("ts-unlinkSelectedCount");
        this.#tsSelectAllBtnElmt = document.getElementById("ts-selectAllBtn");
        this.#tsUnselectAllBtnElmt = document.getElementById("ts-unselectAllBtn");
        this.#tsSelectModalElmt = document.getElementById("ts-selectModal");
        this.#tsSelectModal = new bootstrap.Modal(this.#tsSelectModalElmt);
        this.#tsSelector = TimeseriesSelector.getInstance("ts-selector");
        this.#tsSelectedSaveBtnElmt = document.getElementById("ts-selectedSaveBtn");

        this.#locSelectModalElmt = document.getElementById("locations-selectModal");
        this.#locSelectModalTitleTypeElmt = document.getElementById("locations-selectModalTitleType");
        this.#locSelectModal = new bootstrap.Modal(this.#locSelectModalElmt);
        this.#locSelectedSaveBtnElmt = document.getElementById("locations-selectedSaveBtn");
        this.#siteSelector = StructuralElementSelector.getInstance("siteSelectorLink");
        this.#zoneSelector = StructuralElementSelector.getInstance("zoneSelectorLink");

        for (let structElmtType of this.#structuralElementTypes) {
            this.#locTabContentElmts[structElmtType] = document.getElementById(`${structElmtType}s-tabcontent`);
            this.#locBadgeCountElmts[structElmtType] = document.getElementById(`${structElmtType}s-badgeCount`);
            this.#locItemsCountElmts[structElmtType] = document.getElementById(`${structElmtType}s-itemsCount`);
            this.#locPageSizeElmts[structElmtType] = document.getElementById(`${structElmtType}s-pageSize`);
            this.#locPaginationElmts[structElmtType] = document.getElementById(`${structElmtType}s-pagination`);
            this.#locContainerElmts[structElmtType] = document.getElementById(`${structElmtType}s-container`);
            this.#locLinkBtnElmts[structElmtType] = document.getElementById(`${structElmtType}-linkBtn`);
            this.#locUnlinkSelectedBtnElmts[structElmtType] = document.getElementById(`${structElmtType}s-unlinkSelectedBtn`);
            this.#locUnlinkSelectedCountElmts[structElmtType] = document.getElementById(`${structElmtType}s-unlinkSelectedCount`);
            this.#locSelectAllBtnElmts[structElmtType] = document.getElementById(`${structElmtType}s-selectAllBtn`);
            this.#locUnselectAllBtnElmts[structElmtType] = document.getElementById(`${structElmtType}s-unselectAllBtn`);
        }
    }

    #initEventListeners() {
        this.#sourceEditBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#sourceInputElmt.classList.remove("bg-dark", "bg-opacity-25");
            this.#sourceInputElmt.removeAttribute("readonly");
            this.#sourceInputElmt.select();
            this.#sourceEditBtnElmt.remove();
        });

        this.#tsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            this.#refreshTimeseries();
        });

        this.#tsPaginationElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#refreshTimeseries();
        });

        this.#tsSelectModalElmt.addEventListener("show.bs.modal", () => {
            this.#tsSelector.clearAllSelection();

            this.#updateTimeseriesSaveSelectedBtn();
        });

        this.#tsSelector?.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateTimeseriesSaveSelectedBtn();
        });

        this.#tsSelectedSaveBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#tsSelectModal.hide();

            this.#tsLinkBtnElmt.parentElement.classList.add("placeholder-glow");
            this.#tsLinkBtnElmt.classList.add("placeholder");
            this.#linkTimeseriesSelected(() => {
                this.#tsLinkBtnElmt.parentElement.classList.remove("placeholder-glow");
                this.#tsLinkBtnElmt.classList.remove("placeholder");
            });
        });

        this.#tsUnlinkSelectedBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let selectedTsNames = Object.values(this.#selectedTimeseriesLinks).map((tsLinkData) => { return tsLinkData.timeseries.name; });
            this.#tsUnlinkSelectedModalConfirm.message = `Unlink <mark>${selectedTsNames.length.toString()}</mark> timeseries: ${selectedTsNames.join(", ")}`;
            this.#tsUnlinkSelectedModalConfirm.show();
        });

        this.#tsSelectAllBtnElmt.addEventListener("click", () => {
            if (this.#tsPaginationElmt.totalItems > 0) {
                for (let tsSelectSwitchElmt of [].slice.call(this.#tsContainerElmt.querySelectorAll(`input[type="checkbox"]`))) {
                    if (!tsSelectSwitchElmt.checked) {
                        tsSelectSwitchElmt.click();
                    }
                }
            }
            else {
                this.#selectedTimeseriesLinks = {};
            }

            this.#updateTimeseriesUnlinkTools();
        });

        this.#tsUnselectAllBtnElmt.addEventListener("click", () => {
            if (this.#tsPaginationElmt.totalItems > 0) {
                for (let tsSelectSwitchElmt of [].slice.call(this.#tsContainerElmt.querySelectorAll(`input[type="checkbox"]`))) {
                    if (tsSelectSwitchElmt.checked) {
                        tsSelectSwitchElmt.click();
                    }
                }
            }
            else {
                this.#selectedTimeseriesLinks = {};
            }

            this.#updateTimeseriesUnlinkTools();
        });

        for (let structElmtType of this.#structuralElementTypes) {
            this.#selectedLocations[structElmtType] = {};

            this.#locPageSizeElmts[structElmtType].addEventListener("pageSizeChange", (event) => {
                event.preventDefault();

                this.#refreshTimeseries();
            });

            this.#locPaginationElmts[structElmtType].addEventListener("pageItemClick", (event) => {
                event.preventDefault();

                this.#refreshTimeseries();
            });

            this.#locLinkBtnElmts[structElmtType].addEventListener("click", () => {
                this.#locSelectModalElmt.setAttribute("data-type", this.#locLinkBtnElmts[structElmtType].getAttribute("data-type"));
            });

            this.#locSelectAllBtnElmts[structElmtType].addEventListener("click", () => {
                if (this.#locPaginationElmts[structElmtType].totalItems > 0) {
                    for (let selectSwitchElmt of [].slice.call(this.#locContainerElmts[structElmtType].querySelectorAll(`input[type="checkbox"]`))) {
                        if (!selectSwitchElmt.checked) {
                            selectSwitchElmt.click();
                        }
                    }
                }
                else {
                    this.#selectedLocations[structElmtType] = {};
                }

                this.#updateStructuralElementUnlinkTools(structElmtType);
            });

            this.#locUnselectAllBtnElmts[structElmtType].addEventListener("click", () => {
                if (this.#locPaginationElmts[structElmtType].totalItems > 0) {
                    for (let selectSwitchElmt of [].slice.call(this.#locContainerElmts[structElmtType].querySelectorAll(`input[type="checkbox"]`))) {
                        if (selectSwitchElmt.checked) {
                            selectSwitchElmt.click();
                        }
                    }
                }
                else {
                    this.#selectedLocations[structElmtType] = {};
                }

                this.#updateStructuralElementUnlinkTools(structElmtType);
            });

            this.#locUnlinkSelectedBtnElmts[structElmtType].addEventListener("click", (event) => {
                event.preventDefault();

                let selectedLocNames = Object.values(this.#selectedLocations[structElmtType]).map(locData => `${locData.name}${locData.path ? ` (${locData.path})` : ""}`);
                this.#locUnlinkSelectedModalConfirms[structElmtType].message = `Unlink <mark>${selectedLocNames.length.toString()}</mark> ${structElmtType}${selectedLocNames.length > 1 ? "s": ""}: ${selectedLocNames.join(", ")}`;
                this.#locUnlinkSelectedModalConfirms[structElmtType].show();
            });
        }

        this.#locSelectModalElmt.addEventListener("show.bs.modal", (event) => {
            let locationType = event.relatedTarget.getAttribute("data-type");
            this.#locSelectModalTitleTypeElmt.innerText = locationType;

            if (locationType != "zone") {
                this.#siteSelector.unselect();
                this.#siteSelector.setSelectableTypes([locationType]);
                this.#siteSelector.classList.remove("d-none", "invisible");
                this.#zoneSelector.classList.add("d-none", "invisible");
            }
            else {
                this.#zoneSelector.unselect();
                this.#siteSelector.classList.add("d-none", "invisible");
                this.#zoneSelector.classList.remove("d-none", "invisible");
            }

            this.#updateStructuralElementSaveSelectedBtn(locationType);
        });

        this.#siteSelector.addEventListener("treeNodeSelect", (event) => {
            this.#updateStructuralElementSaveSelectedBtn(event.detail.type);
        });

        this.#siteSelector.addEventListener("treeNodeUnselect", (event) => {
            this.#updateStructuralElementSaveSelectedBtn(event.detail.type);
        });

        this.#zoneSelector.addEventListener("treeNodeSelect", (event) => {
            this.#updateStructuralElementSaveSelectedBtn(event.detail.type);
        });

        this.#zoneSelector.addEventListener("treeNodeUnselect", (event) => {
            this.#updateStructuralElementSaveSelectedBtn(event.detail.type);
        });

        this.#locSelectedSaveBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#locSelectModal.hide();

            let locationType = this.#locSelectModalElmt.getAttribute("data-type");

            this.#locLinkBtnElmts[locationType].parentElement.classList.add("placeholder-glow");
            this.#locLinkBtnElmts[locationType].classList.add("placeholder");
            this.#linkStructuralElementsSelected(locationType, () => {
                this.#locLinkBtnElmts[locationType].parentElement.classList.remove("placeholder-glow");
                this.#locLinkBtnElmts[locationType].classList.remove("placeholder");
            });
        });
    }

    #updateTimeseriesSaveSelectedBtn() {
        if (this.#tsSelector.selectedItems.length > 0) {
            this.#tsSelectedSaveBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#tsSelectedSaveBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateTimeseriesUnlinkTools() {
        let nbSelectedTimeseriesLinks = Object.keys(this.#selectedTimeseriesLinks).length;

        this.#tsUnlinkSelectedCountElmt.innerText = nbSelectedTimeseriesLinks.toString();

        if (nbSelectedTimeseriesLinks > 0) {
            this.#tsUnlinkSelectedBtnElmt.removeAttribute("disabled");
            this.#tsUnselectAllBtnElmt.removeAttribute("disabled");
            this.#tsUnselectAllBtnElmt.classList.remove("d-none", "invisible");
            this.#tsSelectAllBtnElmt.classList.remove("rounded-1");

            if (nbSelectedTimeseriesLinks == Math.min(this.#tsPaginationElmt.totalItems, this.#tsPageSizeElmt.current)) {
                this.#tsSelectAllBtnElmt.setAttribute("disabled", true)
                this.#tsSelectAllBtnElmt.classList.add("d-none", "invisible");
            }
            else {
                this.#tsSelectAllBtnElmt.removeAttribute("disabled");
                this.#tsSelectAllBtnElmt.classList.remove("d-none", "invisible");
            }
        }
        else {
            this.#tsUnlinkSelectedBtnElmt.setAttribute("disabled", true);
            this.#tsUnselectAllBtnElmt.setAttribute("disabled", true);
            this.#tsUnselectAllBtnElmt.classList.add("d-none", "invisible");
            this.#tsSelectAllBtnElmt.classList.remove("d-none", "invisible");
            this.#tsSelectAllBtnElmt.classList.add("rounded-1");
        }

        if (this.#tsPaginationElmt.totalItems > 0) {
            this.#tsUnlinkSelectedBtnElmt.parentElement.classList.remove("d-none", "invisible");
            this.#tsSelectAllBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#tsUnlinkSelectedBtnElmt.parentElement.classList.add("d-none", "invisible");
            this.#tsSelectAllBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateStructuralElementSaveSelectedBtn(structElmtType) {
        let structElmtSelector = structElmtType != "zone" ? this.#siteSelector : this.#zoneSelector;
        if (structElmtSelector.selectedData != null) {
            this.#locSelectedSaveBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#locSelectedSaveBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateStructuralElementUnlinkTools(structElmtType) {
        let nbSelectedItems = this.#selectedLocations[structElmtType] != null ? Object.keys(this.#selectedLocations[structElmtType]).length : 0;

        this.#locUnlinkSelectedCountElmts[structElmtType].innerText = nbSelectedItems.toString();

        if (nbSelectedItems > 0) {
            this.#locUnlinkSelectedBtnElmts[structElmtType].removeAttribute("disabled");
            this.#locUnselectAllBtnElmts[structElmtType].removeAttribute("disabled");
            this.#locUnselectAllBtnElmts[structElmtType].classList.remove("d-none", "invisible");
            this.#locSelectAllBtnElmts[structElmtType].classList.remove("rounded-end");

            if (nbSelectedItems == Math.min(this.#locPaginationElmts[structElmtType].totalItems, this.#locPageSizeElmts[structElmtType].current)) {
                this.#locSelectAllBtnElmts[structElmtType].setAttribute("disabled", true)
                this.#locSelectAllBtnElmts[structElmtType].classList.add("d-none", "invisible");
            }
            else {
                this.#locSelectAllBtnElmts[structElmtType].removeAttribute("disabled");
                this.#locSelectAllBtnElmts[structElmtType].classList.remove("d-none", "invisible");
            }
        }
        else {
            this.#locUnlinkSelectedBtnElmts[structElmtType].setAttribute("disabled", true);
            this.#locUnselectAllBtnElmts[structElmtType].setAttribute("disabled", true);
            this.#locUnselectAllBtnElmts[structElmtType].classList.add("d-none", "invisible");
            this.#locSelectAllBtnElmts[structElmtType].classList.remove("d-none", "invisible");
            this.#locSelectAllBtnElmts[structElmtType].classList.add("rounded-end");
        }

        if (this.#locPaginationElmts[structElmtType].totalItems > 0) {
            this.#locUnlinkSelectedBtnElmts[structElmtType].parentElement.classList.remove("d-none", "invisible");
            this.#locSelectAllBtnElmts[structElmtType].removeAttribute("disabled");
        }
        else {
            this.#locUnlinkSelectedBtnElmts[structElmtType].parentElement.classList.add("d-none", "invisible");
            this.#locSelectAllBtnElmts[structElmtType].setAttribute("disabled", true);
        }
    }

    #createTimeseriesRowElement(tsLinkData) {
        let tsData = tsLinkData["timeseries"];

        let tsElmt = document.createElement("div");
        tsElmt.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center", "gap-2");

        let tsInnerContainerElmt = document.createElement("div");
        tsElmt.appendChild(tsInnerContainerElmt);

        let tsHeaderElmt = document.createElement("div");
        tsHeaderElmt.classList.add("hstack", "gap-1");
        tsInnerContainerElmt.appendChild(tsHeaderElmt);

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

        let tsDescElmt = document.createElement("small");
        tsDescElmt.classList.add("fst-italic", "text-muted");
        tsDescElmt.innerText = tsData.description;
        tsInnerContainerElmt.appendChild(tsDescElmt);

        let tsSwitchContainerElmt = document.createElement("div");
        tsSwitchContainerElmt.classList.add("form-check", "form-switch");
        tsElmt.appendChild(tsSwitchContainerElmt);

        let tsSwitchInputElmt = document.createElement("input");
        tsSwitchInputElmt.classList.add("form-check-input");
        tsSwitchInputElmt.setAttribute("type", "checkbox");
        tsSwitchInputElmt.setAttribute("role", "switch");
        tsSwitchContainerElmt.appendChild(tsSwitchInputElmt);

        tsSwitchInputElmt.addEventListener("change", (event) => {
            if (event.target.checked) {
                this.#selectedTimeseriesLinks[tsLinkData.id] = tsLinkData;
            }
            else {
                delete this.#selectedTimeseriesLinks[tsLinkData.id];
            }

            this.#updateTimeseriesUnlinkTools();
        });

        return tsElmt;
    }

    #refreshTimeseries() {
        this.#selectedTimeseriesLinks = {};
        this.#updateTimeseriesUnlinkTools();

        this.#tsLinkBtnElmt.classList.add("disabled");
        this.#tsLinkBtnElmt.setAttribute("aria-disabled", true);

        this.#tsBadgeCountElmt.innerHTML = "";
        this.#tsBadgeCountElmt.innerText = "";
        this.#tsBadgeCountElmt.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

        this.#tsContainerElmt.innerHTML = "";
        this.#tsContainerElmt.appendChild(new Spinner());

        if (this.#tsListReqID != null) {
            this.#internalAPIRequester.abort(this.#tsListReqID);
            this.#tsListReqID = null;
        }

        let reqOpts = {
            id: this.#eventData.id,
            page_size: this.#tsPageSizeElmt.current,
            page: this.#tsPaginationElmt.page,
        };

        this.#tsListReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_timeseries_links`, reqOpts),
            (data) => {
                this.#tsContainerElmt.innerHTML = "";

                if (data.pagination.total > 0) {
                    for (let tsLinkData of data.data) {
                        let tsRowElmt = this.#createTimeseriesRowElement(tsLinkData);
                        this.#tsContainerElmt.appendChild(tsRowElmt);
                    }
                }
                else {
                    let noDataElmt = document.createElement("span");
                    noDataElmt.classList.add("fst-italic", "text-muted", "text-center");
                    noDataElmt.innerText = "No data";
                    this.#tsContainerElmt.appendChild(noDataElmt);
                }

                let paginationOpts = {
                    pageSize: this.#tsPageSizeElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#tsPaginationElmt.reload(paginationOpts);
                this.#tsItemsCountElmt.update({totalCount: this.#tsPaginationElmt.totalItems, firstItem: this.#tsPaginationElmt.startItem, lastItem: this.#tsPaginationElmt.endItem});

                this.#tsBadgeCountElmt.innerHTML = "";
                this.#tsBadgeCountElmt.innerText = data.pagination.total.toString();

                this.#tsLinkBtnElmt.classList.remove("disabled");
                this.#tsLinkBtnElmt.removeAttribute("aria-disabled");
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            () => {
                this.#updateTimeseriesUnlinkTools();
            },
        );
    }

    async #linkTimeseriesSelected(doneCallback = null) {
        let linkedTsNames = [];
        let errors = [];

        for (let ts of this.#tsSelector.selectedItems) {
            await this.#internalAPIRequester.post(
                flaskES6.urlFor(`api.events.create_timeseries_link`, {id: this.#eventData.id, ts_id: ts.id}),
                null,
                (data) => {
                    linkedTsNames.push(data.timeseries.name);
                },
                (error) => {
                    errors.push(`<span class="fw-bold fst-italic">${ts.name}</span>: ${error}`);
                },
            );
        }

        if (linkedTsNames.length > 0) {
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${linkedTsNames.length}/${this.#tsSelector.selectedItems.length} timeseries linked to the event: ${linkedTsNames.join(", ")}.`, isDismissible: true});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        if (errors.length > 0) {
            let details = `<ul class="mb-0">`;
            for (let err of errors) {
                details += `<li>${err}</li>`;
            }
            details += "</ul>";

            let errorMsg = `<p class="mb-0">Failed to link ${errors.length} timeseries:</p>${details}`;
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: errorMsg, isDismissible: true, isTimed: false});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        this.#tsPaginationElmt.page = 1;
        this.#refreshTimeseries();

        doneCallback?.();
    }

    async #unlinkTimeseriesSelected(doneCallback = null) {
        let unlinkedTsNames = [];
        let errors = [];

        for (let [tsLinkId, tsLinkData] of Object.entries(this.#selectedTimeseriesLinks)) {
            await this.#internalAPIRequester.delete(
                flaskES6.urlFor(`api.events.delete_timeseries_link`, {link_id: tsLinkId}),
                null,
                () => {
                    unlinkedTsNames.push(tsLinkData.name);
                },
                (error) => {
                    errors.push(`<span class="fw-bold fst-italic">${tsLinkData.name}</span>: ${error}`);
                },
            );
        }

        if (unlinkedTsNames.length > 0) {
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${unlinkedTsNames.length}/${Object.entries(this.#selectedTimeseriesLinks).length} timeseries unlinked: ${unlinkedTsNames.join(", ")}.`, isDismissible: true});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        if (errors.length > 0) {
            let details = `<ul class="mb-0">`;
            for (let err of errors) {
                details += `<li>${err}</li>`;
            }
            details += "</ul>";

            let errorMsg = `<p class="mb-0">Failed to unlink ${errors.length} timeseries:</p>${details}`;
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: errorMsg, isDismissible: true, isTimed: false});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        this.#tsPaginationElmt.page = 1;
        this.#refreshTimeseries();

        doneCallback?.();
    }

    #refreshLocation(structElmtType) {
        this.#selectedLocations[structElmtType] = {};
        this.#updateStructuralElementUnlinkTools(structElmtType);

        this.#locLinkBtnElmts[structElmtType].classList.add("disabled");
        this.#locLinkBtnElmts[structElmtType].setAttribute("aria-disabled", true);

        this.#locBadgeCountElmts[structElmtType].innerHTML = "";
        this.#locBadgeCountElmts[structElmtType].innerText = "";
        this.#locBadgeCountElmts[structElmtType].appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

        this.#locContainerElmts[structElmtType].innerHTML = "";
        this.#locContainerElmts[structElmtType].appendChild(new Spinner());

        if (this.#structElmtListReqIDs[structElmtType] != null) {
            this.#internalAPIRequester.abort(this.#structElmtListReqIDs[structElmtType]);
            this.#structElmtListReqIDs[structElmtType] = null;
        }

        let reqOpts = {
            id: this.#eventData.id,
            type: structElmtType,
            page_size: this.#locPageSizeElmts[structElmtType].current,
            page: this.#locPaginationElmts[structElmtType].page,
        };

        this.#structElmtListReqIDs[structElmtType] = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.events.retrieve_structural_elements_links`, reqOpts),
            (data) => {
                this.#locContainerElmts[structElmtType].innerHTML = "";

                if (data.pagination.total > 0) {
                    for (let structElmtData of data.data) {
                        let locRowElmt = this.#createStructuralElementRowElement(structElmtType, structElmtData);
                        this.#locContainerElmts[structElmtType].appendChild(locRowElmt);
                    }
                }
                else {
                    let noDataElmt = document.createElement("span");
                    noDataElmt.classList.add("fst-italic", "text-muted", "text-center");
                    noDataElmt.innerText = "No data";
                    this.#locContainerElmts[structElmtType].appendChild(noDataElmt);
                }

                let paginationOpts = {
                    pageSize: this.#locPageSizeElmts[structElmtType].current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }
                this.#locPaginationElmts[structElmtType].reload(paginationOpts);
                this.#locItemsCountElmts[structElmtType].update({totalCount: this.#locPaginationElmts[structElmtType].totalItems, firstItem: this.#locPaginationElmts[structElmtType].startItem, lastItem: this.#locPaginationElmts[structElmtType].endItem});

                this.#locBadgeCountElmts[structElmtType].innerHTML = "";
                this.#locBadgeCountElmts[structElmtType].innerText = data.pagination.total.toString();

                this.#locLinkBtnElmts[structElmtType].classList.remove("disabled");
                this.#locLinkBtnElmts[structElmtType].removeAttribute("aria-disabled");
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            () => {
                this.#updateStructuralElementUnlinkTools(structElmtType);
            },
        );
    }

    #createStructuralElementRowElement(structElmtType, structElmtData) {
        let rowElmt = document.createElement("div");
        rowElmt.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center", "gap-2");

        let rowInnerContainerElmt = document.createElement("div");
        rowElmt.appendChild(rowInnerContainerElmt);

        let headerElmt = document.createElement("div");
        headerElmt.classList.add("hstack", "gap-1");
        rowInnerContainerElmt.appendChild(headerElmt);

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", `bi-${structElmtType != "zone" ? "building" : "bullseye"}`, "me-1");
        headerElmt.appendChild(iconElmt);

        let nameElmt = document.createElement("span");
        nameElmt.classList.add("fw-bold", "text-break");
        nameElmt.innerText = structElmtData.name;
        headerElmt.appendChild(nameElmt);

        if (structElmtData.path != null) {
            let pathElmt = document.createElement("small");
            pathElmt.classList.add("text-muted", "ms-3");
            pathElmt.innerText = structElmtData.path;
            headerElmt.appendChild(pathElmt);
        }

        let descElmt = document.createElement("small");
        descElmt.classList.add("fst-italic", "text-muted");
        descElmt.innerText = structElmtData.description;
        rowInnerContainerElmt.appendChild(descElmt);

        let switchContainerElmt = document.createElement("div");
        switchContainerElmt.classList.add("form-check", "form-switch");
        rowElmt.appendChild(switchContainerElmt);

        let switchInputElmt = document.createElement("input");
        switchInputElmt.classList.add("form-check-input");
        switchInputElmt.setAttribute("type", "checkbox");
        switchInputElmt.setAttribute("role", "switch");
        switchContainerElmt.appendChild(switchInputElmt);

        switchInputElmt.addEventListener("change", (event) => {
            if (event.target.checked) {
                this.#selectedLocations[structElmtType][structElmtData.id] = structElmtData;
            }
            else {
                delete this.#selectedLocations[structElmtType][structElmtData.id];
            }

            this.#updateStructuralElementUnlinkTools(structElmtType);
        });

        return rowElmt;
    }

    async #linkStructuralElementsSelected(structElmtType, doneCallback = null) {
        let structElmtSelector = structElmtType != "zone" ? this.#siteSelector : this.#zoneSelector;

        let getLocationLabel = (locationData) => {
            return `${locationData.name}${locationData.path != null && locationData.path != "" ? ` (${locationData.path})` : ""}`;
        };

        this.#internalAPIRequester.post(
            flaskES6.urlFor(`api.events.create_structural_elements_link`, {id: this.#eventData.id, type: structElmtType, structural_element_id: structElmtSelector.selectedData.id}),
            null,
            (data) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${structElmtType} linked to the event: ${getLocationLabel(data)}.`, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            (error) => {
                let details = `<ul class="mb-0"><li><span class="fw-bold fst-italic">${getLocationLabel(structElmtSelector.selectedData)}</span>: ${error}</li></ul>`;
                let errorMsg = `<p class="mb-0">Failed to link ${structElmtType}:</p>${details}`;
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: errorMsg, isDismissible: true, isTimed: false});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
            () => {
                this.#locPaginationElmts[structElmtType].page = 1;
                this.#refreshLocation(structElmtType);

                doneCallback?.();        
            },
        );
    }

    async #unlinkStructuralElementsSelected(structElmtType, doneCallback = null) {
        let selectedItems = Object.values(this.#selectedLocations[structElmtType]).map((itemData) => { return `${itemData.name}${itemData.path != null && itemData.path != "" ? ` (${itemData.path})` : ""}`; });
        let unlinkedItems = [];
        let errors = [];

        for (let [index, locRelId] of Object.keys(this.#selectedLocations[structElmtType]).entries()) {
            await this.#internalAPIRequester.delete(
                flaskES6.urlFor(`api.events.delete_structural_elements_link`, {type: structElmtType, link_id: locRelId}),
                null,
                () => {
                    unlinkedItems.push(selectedItems[index]);
                },
                (error) => {
                    errors.push(`<span class="fw-bold fst-italic">${selectedItems[index]}</span>: ${error}`);
                },
            );
        }

        if (unlinkedItems.length > 0) {
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${unlinkedItems.length}/${selectedItems.length} ${structElmtType}${unlinkedItems.length > 1 ? "s" : ""} unlinked: ${unlinkedItems.join(", ")}.`, isDismissible: true});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        if (errors.length > 0) {
            let details = `<ul class="mb-0">`;
            for (let err of errors) {
                details += `<li>${err}</li>`;
            }
            details += "</ul>";

            let errorMsg = `<p class="mb-0">Failed to unlink ${errors.length} ${structElmtType}${errors.length > 1 ? "s" : ""}:</p>${details}`;
            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: errorMsg, isDismissible: true, isTimed: false});
            this.#messagesElmt.appendChild(flashMsgElmt);
        }

        this.#locPaginationElmts[structElmtType].page = 1;
        this.#refreshLocation(structElmtType);

        doneCallback?.();
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

    mount() {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();

        // Add a modal confirm component for this form, defining an "ok" callback function.
        this.#tsUnlinkSelectedModalConfirm = new ModalConfirm(
            this.#tsUnlinkSelectedBtnElmt.id,
            `Unlink selected timeseries`,
            () => {
                this.#tsUnlinkSelectedBtnElmt.parentElement.classList.add("placeholder-glow");
                this.#tsUnlinkSelectedBtnElmt.classList.add("placeholder");

                this.#unlinkTimeseriesSelected(() => {

                    this.#tsUnlinkSelectedBtnElmt.parentElement.classList.remove("placeholder-glow");
                    this.#tsUnlinkSelectedBtnElmt.classList.remove("placeholder");

                });
            },
        );
        this.#tsTabContentElmt.appendChild(this.#tsUnlinkSelectedModalConfirm);

        this.#refreshTimeseries();

        for (let structElmtType of this.#structuralElementTypes) {
            // Add a modal confirm component for this form, defining an "ok" callback function.
            this.#locUnlinkSelectedModalConfirms[structElmtType] = new ModalConfirm(
                this.#locUnlinkSelectedBtnElmts[structElmtType].id,
                `Unlink selected ${structElmtType}s`,
                () => {
                    this.#locUnlinkSelectedBtnElmts[structElmtType].parentElement.classList.add("placeholder-glow");
                    this.#locUnlinkSelectedBtnElmts[structElmtType].classList.add("placeholder");

                    this.#unlinkStructuralElementsSelected(structElmtType, () => {

                        this.#locUnlinkSelectedBtnElmts[structElmtType].parentElement.classList.remove("placeholder-glow");
                        this.#locUnlinkSelectedBtnElmts[structElmtType].classList.remove("placeholder");

                    });
                },
            );
            this.#locTabContentElmts[structElmtType].appendChild(this.#locUnlinkSelectedModalConfirms[structElmtType]);

            this.#refreshLocation(structElmtType);
        }
    }
}

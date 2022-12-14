import "../../components/itemsCount.js";
import { Pagination, PageSizeSelector } from "../../components/pagination.js";
import { AccordionList } from "../../components/accordionList.js";
import { DropZone } from "../../components/dropZone.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { Parser } from "../../tools/parser.js";
import { flaskES6 } from "../../../app.js";


export class TimeseriesManageStructuralElementsView {

    #internalAPIRequester = null;
    #getTSListReqID = null;

    #messagesElmt = null;
    #searchElmt = null;
    #clearSearchBtnElmt = null;

    #tsPageSizeSelectorContainerElmt = null;
    #tsPageSizeSelectorElmt = null;
    #tsItemsCountElmt = null;
    #tsPaginationContainerElmt = null;
    #tsPaginationElmt = null;
    #tsListContainerElmt = null;
    #tsListElmt = null;

    #treeStructuralElements = null;
    #treeZones = null;

    #draggedElmt = null;

    constructor(options = {}) {
        this.#treeStructuralElements = options.treeStructuralElements;
        this.#treeZones = options.treeZones;

        this.#cacheDOM();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#tsPageSizeSelectorElmt = new PageSizeSelector();
        this.#tsPageSizeSelectorContainerElmt.innerHTML = "";
        this.#tsPageSizeSelectorContainerElmt.appendChild(this.#tsPageSizeSelectorElmt);

        this.#tsListElmt = new AccordionList();
        this.#tsListContainerElmt.innerHTML = "";
        this.#tsListContainerElmt.appendChild(this.#tsListElmt);

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#searchElmt = document.getElementById("search");
        this.#clearSearchBtnElmt = document.getElementById("clear");

        this.#tsPageSizeSelectorContainerElmt = document.getElementById("tsPageSizeSelectorContainer");
        this.#tsItemsCountElmt = document.getElementById("tsItemsCount");
        this.#tsPaginationContainerElmt = document.getElementById("tsPaginationContainer");
        this.#tsListContainerElmt = document.getElementById("tsListContainer");
    }

    #initEventListeners() {
        this.#tsPageSizeSelectorElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#tsItemsCountElmt.setLoading();
                this.#tsListElmt.setLoading();
                this.refresh({page_size: event.detail.newValue});
            }
        });

        this.#tsPaginationContainerElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.refresh({"page": event.detail.page});
        });

        this.#searchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            if (event.target.value != "") {
                this.#clearSearchBtnElmt.classList.remove("d-none", "invisible");
            }
            else {
                this.#clearSearchBtnElmt.classList.add("d-none", "invisible");
            }

            this.refresh({"page_size": this.#tsPageSizeSelectorElmt.value, "search": event.target.value});
        });

        this.#clearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchElmt.value = "";
            this.#clearSearchBtnElmt.classList.add("d-none", "invisible");

            this.refresh({"page_size": this.#tsPageSizeSelectorElmt.value});
        });

        this.#tsListElmt.addEventListener("accordionItemOpen", (event) => {
            event.preventDefault();

            // load current locations of timeseries
            let tsId = event.detail.itemId;
            let tsTitle = event.detail.itemTitle;

            if (!event.target.isLoaded) {
                let dropZoneElmt = new DropZone({ getDraggedElmtCallback: () => {
                    let draggedElmtId = this.#draggedElmt.getAttribute("data-tree-item-id");
                    let draggedElmtType = this.#draggedElmt.getAttribute("data-tree-item-type");
                    return dropZoneElmt.querySelector(`#${draggedElmtType}-${draggedElmtId}`);
                } });
                dropZoneElmt.id = `dropZone-${tsId}`;
                dropZoneElmt.targetId = tsId;
                dropZoneElmt.targetTitle = tsTitle;

                let targetBodyElmt = event.target.querySelector(`div[class="accordion-body"]`);
                targetBodyElmt.appendChild(dropZoneElmt);

                dropZoneElmt.setLoading();

                this.#internalAPIRequester.get(
                    flaskES6.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId}),
                    (data) => {
                        dropZoneElmt.clear();
                        let totalLinks = 0;
                        for (let [structuralElementType, tsStructElmtLinks] of Object.entries(data.data)) {
                            for (let tsStructElmtLink of tsStructElmtLinks) {
                                let tsId = tsStructElmtLink.timeseries_id;
                                let structuralElementId = tsStructElmtLink[`${structuralElementType}_id`];

                                let tsStructElmtLinkId = tsStructElmtLink.id;
                                let tsStructElmtLinkEtag = tsStructElmtLink.etag;

                                // Search item in tree.
                                let searchTree = structuralElementType == "zone" ? this.#treeZones : this.#treeStructuralElements;
                                let itemData = searchTree.getItemData(structuralElementType, structuralElementId);
                                let dropedItemId = itemData.sourceNodeId;
                                let dropedItemIcon = `${itemData.sourceNodeData.type == "zone" ? "bullseye" : "building"}`;
                                let dropedItemTitle = itemData.sourceNodeData.name;
                                let dropedItemText = itemData.sourceNodeData.path;

                                let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, () => {
                                    this.#internalAPIRequester.post(
                                        flaskES6.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}),
                                        {"type": structuralElementType, "rel_id": tsStructElmtLinkId, "etag": tsStructElmtLinkEtag},
                                        () => {
                                            dropZoneElmt.removeElement(dropedItemElmt);
                                        },
                                        (error) => {
                                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                            this.#messagesElmt.appendChild(flashMsgElmt);
                                        },
                                    );
                                });

                                dropZoneElmt.addElement(dropedItemElmt);
                                totalLinks += 1;
                            }
                        }

                        // if (totalLinks <= 0) {
                        //     dropZoneElmt.setHelp();
                        // }
                        event.target.isLoaded = true;
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        });

        this.#treeStructuralElements.treeElmt.addEventListener("itemDragStart", (event) => {
            event.preventDefault();

            this.#draggedElmt = event.detail.target;
        });
        this.#treeStructuralElements.treeElmt.addEventListener("itemDragEnd", (event) => {
            event.preventDefault();

            this.#draggedElmt = null;
        });

        this.#treeZones.treeElmt.addEventListener("itemDragStart", (event) => {
            event.preventDefault();

            this.#draggedElmt = event.detail.target;
        });
        this.#treeZones.treeElmt.addEventListener("itemDragEnd", (event) => {
            event.preventDefault();

            this.#draggedElmt = null;
        });

        this.#tsListElmt.addEventListener("itemDrop", (event) => {
            event.preventDefault();

            let dropZoneElmt = event.detail.target;
            let tsId = dropZoneElmt.targetId;
            let tsTitle = dropZoneElmt.targetTitle;

            let jsonData = JSON.parse(event.detail.dataTransfer.getData("application/json"));
            let dropedItemId = jsonData.sourceNodeId;
            let dropedItemIcon = `${jsonData.sourceNodeData.type == "zone" ? "bullseye" : "building"}`;
            let dropedItemTitle = jsonData.sourceNodeData.name;
            let dropedItemText = jsonData.sourceNodeData.path;

            if (event.detail.isDuplicate) {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.WARNING, text: `${tsTitle} timeseries is already located in ${dropedItemTitle}`, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
            else {
                this.#internalAPIRequester.post(
                    flaskES6.urlFor(`api.timeseries.post_structural_elements`, {id: tsId}),
                    {type: jsonData.sourceNodeData.type, id: jsonData.sourceNodeData.id},
                    (data) => {
                        let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, () => {

                            this.#internalAPIRequester.post(
                                flaskES6.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}),
                                {type: jsonData.sourceNodeData.type, rel_id: data.data.id, etag: data.etag},
                                () => {
                                    dropZoneElmt.removeElement(dropedItemElmt);
                                },
                                (error) => {
                                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                },
                            );
                        });

                        dropZoneElmt.addElement(dropedItemElmt);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        });
    }

    #createDropedItemElement(id, icon, title, text, removeCallback) {
        let dropedItemElmt = document.createElement("div");
        dropedItemElmt.id = id;
        dropedItemElmt.classList.add("btn-group", "btn-group-sm", "rounded", "bg-white");
        dropedItemElmt.style.maxWidth = "350px";

        let dropItemMainContainerElmt = document.createElement("div");
        dropItemMainContainerElmt.classList.add("d-flex", "flex-wrap", "align-items-center", "gap-1", "border", "border-1", "border-secondary", "rounded-start", "py-1", "px-2");
        dropedItemElmt.appendChild(dropItemMainContainerElmt);

        let dropedItemHeaderElmt = document.createElement("div");
        dropedItemHeaderElmt.classList.add("d-flex", "align-items-center", "gap-1");
        dropedItemHeaderElmt.style.maxWidth = "280px";
        dropItemMainContainerElmt.appendChild(dropedItemHeaderElmt);

        let dropedItemIconElmt = document.createElement("i");
        dropedItemIconElmt.classList.add("bi", `bi-${icon}`);
        dropedItemHeaderElmt.appendChild(dropedItemIconElmt);

        let dropedItemTitleElmt = document.createElement("span");
        dropedItemTitleElmt.classList.add("fw-bold", "text-truncate");
        dropedItemTitleElmt.innerText = title;
        dropedItemTitleElmt.title = title;
        dropedItemHeaderElmt.appendChild(dropedItemTitleElmt);

        if (text != null && text.length > 0) {
            let dropedItemTextElmt = document.createElement("small");
            dropedItemTextElmt.classList.add("text-muted", "text-truncate");
            dropedItemTextElmt.style.maxWidth = "280px";
            dropedItemTextElmt.innerText = text;
            dropedItemTextElmt.title = text;
            dropItemMainContainerElmt.appendChild(dropedItemTextElmt);
        }

        let dropedItemRemoveElmt = document.createElement("a");
        dropedItemRemoveElmt.classList.add("btn", "btn-outline-danger", "rounded-end", "d-flex", "align-items-center");
        dropedItemRemoveElmt.setAttribute("role", "button");
        dropedItemRemoveElmt.title = "Remove";
        let dropedItemRemoveIconElmt = document.createElement("i");
        dropedItemRemoveIconElmt.classList.add("bi", "bi-x-lg");
        dropedItemRemoveElmt.appendChild(dropedItemRemoveIconElmt);
        dropedItemElmt.appendChild(dropedItemRemoveElmt);

        // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
        let modalConfirm = new ModalConfirm(dropedItemElmt.id, `Remove <mark>${title}</mark> timeseries location`, removeCallback);
        dropedItemElmt.appendChild(modalConfirm);

        // Add an event listener to display a confirm message on form submit.
        dropedItemRemoveElmt.addEventListener("click", (event) => {
            event.preventDefault();
            // Display modal.
            modalConfirm.show();
        });

        return dropedItemElmt;
    }

    refresh(options = {}) {
        if (this.#getTSListReqID != null) {
            this.#internalAPIRequester.abort(this.#getTSListReqID);
            this.#getTSListReqID = null;
        }

        if (this.#tsPaginationElmt == null) {
            this.#tsPaginationContainerElmt.innerHTML = "";
            this.#tsPaginationContainerElmt.appendChild(new Spinner());
        }
        this.#tsItemsCountElmt.setLoading();
        this.#tsListElmt.setLoading();

        let fetcherOptions = {"page_size": Parser.parseIntOrDefault(options.page_size, this.#tsPageSizeSelectorElmt.current), "page": Parser.parseIntOrDefault(options.page, 1)};
        if ("search" in options) {
            fetcherOptions["search"] = options.search;
        }
        else if (this.#searchElmt.value != "") {
            fetcherOptions["search"] = this.#searchElmt.value;
        }

        this.#getTSListReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries.retrieve_list`, fetcherOptions),
            (data) => {
                for (let row of data.data) {
                    row.icon = "clock-history";
                    if (row.unit_symbol != null && row.unit_symbol != "") {
                        row.subtitle = `[${row.unit_symbol}]`;
                    }
                }
                this.#tsListElmt.render(data.data);

                let tsPaginationOpts = {
                    pageSize: this.#tsPageSizeSelectorElmt.current,
                    totalItems: data.pagination.total,
                    totalPages: data.pagination.total_pages,
                    page: data.pagination.page,
                    firstPage: data.pagination.first_page,
                    lastPage: data.pagination.last_page,
                    previousPage: data.pagination.previous_page,
                    nextPage: data.pagination.next_page,
                }

                if (this.#tsPaginationElmt == null) {
                    this.#tsPaginationElmt = new Pagination(tsPaginationOpts);
                    this.#tsPaginationContainerElmt.innerHTML = "";
                    this.#tsPaginationContainerElmt.appendChild(this.#tsPaginationElmt);
                }
                else {
                    this.#tsPaginationElmt.reload(tsPaginationOpts);
                }

                this.#tsItemsCountElmt.update({totalCount: this.#tsPaginationElmt.totalItems, firstItem: this.#tsPaginationElmt.startItem, lastItem: this.#tsPaginationElmt.endItem});
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}

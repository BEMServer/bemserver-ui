import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Pagination, PageSizeSelector } from "/static/scripts/modules/components/pagination.js";
import { AccordionList } from "/static/scripts/modules/components/accordionList.js";
import { DropZone } from "/static/scripts/modules/components/dropZone.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { ModalConfirm } from "/static/scripts/modules/components/modalConfirm.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import "/static/scripts/modules/components/tree.js";
import "/static/scripts/modules/components/itemsCount.js";


class TimeseriesManageStructuralElementsView {

    #internalAPIRequester = null;
    #getTSListReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #searchElmt = null;
    #clearSearchBtnElmt = null;

    #tsPageSizeSelectorContainerElmt = null;
    #tsPageSizeSelectorElmt = null;
    #tsItemsCountElmt = null;
    #tsPaginationContainerElmt = null;
    #tsPaginationElmt = null;
    #tsListContainerElmt = null;
    #tsListElmt = null;

    #sitesTreeElmt = null;
    #zonesTreeElmt = null;

    #draggedElmt = null;

    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();

        this.#tsPageSizeSelectorElmt = new PageSizeSelector();
        this.#tsPageSizeSelectorContainerElmt.innerHTML = "";
        this.#tsPageSizeSelectorContainerElmt.appendChild(this.#tsPageSizeSelectorElmt);

        this.#tsListElmt = new AccordionList();
        this.#tsListContainerElmt.innerHTML = "";
        this.#tsListContainerElmt.appendChild(this.#tsListElmt);

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#searchElmt = document.getElementById("search");
        this.#clearSearchBtnElmt = document.getElementById("clear");

        this.#tsPageSizeSelectorContainerElmt = document.getElementById("tsPageSizeSelectorContainer");
        this.#tsItemsCountElmt = document.getElementById("tsItemsCount");
        this.#tsPaginationContainerElmt = document.getElementById("tsPaginationContainer");
        this.#tsListContainerElmt = document.getElementById("tsListContainer");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#zonesTreeElmt = document.getElementById("zonesTree");
    }

    #initEventListeners() {
        this.#tsPageSizeSelectorElmt.addEventListener("pageSizeChange", (event) => {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#tsItemsCountElmt.setLoading();
                this.#tsListElmt.setLoading();
                this.#update({page_size: event.detail.newValue});
            }
        });

        this.#tsPaginationContainerElmt.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            this.#update({"page": event.detail.page});
        });

        // "input" event is fired each time the input text is updated (key pressed...)
        // "change" event is only fired when losing focus or hitting enter key
        this.#searchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateSearchState();
            this.#update({"page_size": this.#tsPageSizeSelectorElmt.value, "search": event.target.value});
        });

        this.#clearSearchBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchElmt.value = "";
            this.#updateSearchState();
            this.#update({"page_size": this.#tsPageSizeSelectorElmt.value});
        });

        this.#tsListElmt.addEventListener("accordionItemOpen", (event) => {
            event.preventDefault();

            // load current locations of timeseries
            let tsId = event.detail.itemId;
            let tsTitle = event.detail.itemTitle;

            if (!event.target.isLoaded) {
                let dropZoneElmt = new DropZone({ getDraggedElmtCallback: () => {
                    let draggedElmtId = this.#draggedElmt.getAttribute("data-tree-node-id");
                    let draggedElmtType = this.#draggedElmt.getAttribute("data-tree-node-type");
                    return dropZoneElmt.querySelector(`#${draggedElmtType}-${draggedElmtId}`);
                } });
                dropZoneElmt.id = `dropZone-${tsId}`;
                dropZoneElmt.targetId = tsId;
                dropZoneElmt.targetTitle = tsTitle;

                let targetBodyElmt = event.target.querySelector(`div[class="accordion-body"]`);
                targetBodyElmt.appendChild(dropZoneElmt);

                dropZoneElmt.setLoading();

                this.#internalAPIRequester.get(
                    app.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId}),
                    (data) => {
                        dropZoneElmt.clear();
                        for (let [structuralElementType, tsStructElmtLinks] of Object.entries(data.data)) {
                            for (let tsStructElmtLink of tsStructElmtLinks) {
                                let tsId = tsStructElmtLink.timeseries_id;
                                let structuralElementId = tsStructElmtLink[`${structuralElementType}_id`];

                                let tsStructElmtLinkId = tsStructElmtLink.id;

                                // Search item in tree.
                                let searchTree = structuralElementType == "zone" ? this.#zonesTreeElmt : this.#sitesTreeElmt;
                                let itemData = searchTree.getTreeNodeData(structuralElementType, structuralElementId);
                                let dropedItemId = itemData.sourceNodeId;
                                let dropedItemIcon = `${itemData.sourceNodeData.type == "zone" ? "bullseye" : "building"}`;
                                let dropedItemTitle = itemData.sourceNodeData.name;
                                let dropedItemText = itemData.sourceNodeData.path;

                                let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, () => {
                                    this.#internalAPIRequester.post(
                                        app.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}),
                                        {"type": structuralElementType, "rel_id": tsStructElmtLinkId},
                                        () => {
                                            dropZoneElmt.removeElement(dropedItemElmt);
                                        },
                                        (error) => {
                                            app.flashMessage(error.toString(), "error");
                                        },
                                    );
                                });

                                dropZoneElmt.addElement(dropedItemElmt);
                            }
                        }

                        event.target.isLoaded = true;
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");
                    },
                );
            }
        });

        this.#sitesTreeElmt.addEventListener("itemDragStart", (event) => {
            event.preventDefault();

            this.#draggedElmt = event.detail.target;
        });
        this.#sitesTreeElmt.addEventListener("itemDragEnd", (event) => {
            event.preventDefault();

            this.#draggedElmt = null;
        });

        this.#zonesTreeElmt.addEventListener("itemDragStart", (event) => {
            event.preventDefault();

            this.#draggedElmt = event.detail.target;
        });
        this.#zonesTreeElmt.addEventListener("itemDragEnd", (event) => {
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
                app.flashMessage(`${tsTitle} timeseries is already located in ${dropedItemTitle}`, "warning", 10);
            }
            else {
                this.#internalAPIRequester.post(
                    app.urlFor(`api.timeseries.post_structural_elements`, {id: tsId}),
                    {type: jsonData.sourceNodeData.type, id: jsonData.sourceNodeData.id},
                    (data) => {
                        let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, () => {

                            this.#internalAPIRequester.post(
                                app.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}),
                                {type: jsonData.sourceNodeData.type, rel_id: data.data.id},
                                () => {
                                    dropZoneElmt.removeElement(dropedItemElmt);
                                },
                                (error) => {
                                    app.flashMessage(error.toString(), "error");
                                },
                            );
                        });

                        dropZoneElmt.addElement(dropedItemElmt);
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");
                    },
                );
            }
        });
    }

    #updateSearchState() {
        if (this.#searchElmt.value != "") {
            this.#searchElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            this.#clearSearchBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#searchElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#clearSearchBtnElmt.classList.add("d-none", "invisible");
        }
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

    #loadSitesTreeData() {
        this.#sitesTreeElmt.showLoading();

        if (this.#sitesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#sitesTreeReqID);
            this.#sitesTreeReqID = null;
        }

        this.#sitesTreeReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.structural_elements.retrieve_tree_sites`, {draggable: true}),
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
            app.urlFor(`api.structural_elements.retrieve_tree_zones`, {draggable: true}),
            (data) => {
                this.#zonesTreeElmt.load(data.data);
                this.#zonesTreeElmt.collapseAll();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #update(options = {}) {
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
            app.urlFor(`api.timeseries.retrieve_list`, fetcherOptions),
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
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    refresh(options = {}) {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();
        this.#update(options);
    }

    mount() {
        this.#searchElmt.value = "";
        this.#updateSearchState();
        this.refresh();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeseriesManageStructuralElementsView();
    view.mount();
});

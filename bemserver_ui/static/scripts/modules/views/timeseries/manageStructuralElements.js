import { Pagination, PageSizeSelector } from "../../components/pagination.js";
import { AccordionList } from "../../components/accordionList.js";
import { DropZone } from "../../components/dropZone.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { Fetcher } from "../../tools/fetcher.js";
import { ModalConfirm } from "../../modalConfirm.js";
import { flaskES6 } from "../../../app.js";
import { Parser } from "../../tools/parser.js";


class TimeseriesManageStructuralElementsView {

    #fetcher = null;

    #messagesElmt = null;

    #tsPageSizeSelectorContainerElmt = null;
    #tsPageSizeSelectorElmt = null;
    #tsItemsCountElmt = null;
    #tsPaginationContainerElmt = null;
    #tsPaginationElmt = null;
    #tsListContainerElmt = null;
    #tsListElmt = null;

    #treeStructuralElements = null;
    #treeZones = null;

    constructor(options = {}) {
        this.#treeStructuralElements = options.treeStructuralElements;
        this.#treeZones = options.treeZones;

        this.#cacheDOM();

        this.#fetcher = new Fetcher();

        this.#tsPageSizeSelectorElmt = new PageSizeSelector();
        this.#tsPageSizeSelectorContainerElmt.innerHTML = "";
        this.#tsPageSizeSelectorContainerElmt.appendChild(this.#tsPageSizeSelectorElmt);

        this.#tsListElmt = new AccordionList({isDropable: true});
        this.#tsListContainerElmt.innerHTML = "";
        this.#tsListContainerElmt.appendChild(this.#tsListElmt);

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#tsPageSizeSelectorContainerElmt = document.getElementById("tsPageSizeSelectorContainer");
        this.#tsItemsCountElmt = document.getElementById("tsItemsCount");
        this.#tsPaginationContainerElmt = document.getElementById("tsPaginationContainer");
        this.#tsListContainerElmt = document.getElementById("tsListContainer");
    }

    #initEventListeners() {
        this.#tsPageSizeSelectorElmt.addEventListener("pageSizeChange", function(event) {
            event.preventDefault();

            if (event.detail.newValue != event.detail.oldValue) {
                this.#tsItemsCountElmt.innerHTML = "";
                this.#tsItemsCountElmt.appendChild(new Spinner({isSmallSize: true}));
                this.#tsListElmt.setLoading();
                this.refresh({page_size: event.detail.newValue});
            }
        }.bind(this));

        this.#tsPaginationContainerElmt.addEventListener("pageItemClick", function(event) {
            event.preventDefault();

            this.#tsItemsCountElmt.innerHTML = "";
            this.#tsItemsCountElmt.appendChild(new Spinner({isSmallSize: true}));
            this.#tsListElmt.setLoading();
            this.refresh({"page": event.detail.page});
        }.bind(this));

        this.#tsListElmt.addEventListener("accordionItemOpen", function(event) {
            event.preventDefault();

            // load current locations of timeseries
            let tsId = event.detail.itemId;
            let tsTitle = event.detail.itemTitle;

            if (!event.target.isLoaded) {
                let dropZoneElmt = new DropZone();
                dropZoneElmt.id = `dropZone-${tsId}`;
                dropZoneElmt.targetId = tsId;
                dropZoneElmt.targetTitle = tsTitle;
                event.target.replaceBodyContainerElement(dropZoneElmt);

                dropZoneElmt.setLoading();

                this.#fetcher.get(flaskES6.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId})).then(
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

                                let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, function() {
                                    this.#fetcher.post(flaskES6.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}), {"type": structuralElementType, "rel_id": tsStructElmtLinkId, "etag": tsStructElmtLinkEtag}).then(
                                        () => {
                                            dropZoneElmt.removeElement(dropedItemElmt);
                                        }
                                    ).catch(
                                        (error) => {
                                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                            this.#messagesElmt.appendChild(flashMsgElmt);
                                        }
                                    );
                                }.bind(this));

                                dropZoneElmt.addElement(dropedItemElmt);
                                totalLinks += 1;
                            }
                        }

                        if (totalLinks <= 0) {
                            dropZoneElmt.setHelp();
                        }
                        event.target.isLoaded = true;
                    }
                ).catch(
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    }
                );
            }
        }.bind(this));

        this.#tsListElmt.addEventListener("itemDrop", function(event) {
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
                this.#fetcher.post(flaskES6.urlFor(`api.timeseries.post_structural_elements`, {id: tsId}), {type: jsonData.sourceNodeData.type, id: jsonData.sourceNodeData.id}).then(
                    (data) => {
                        let dropedItemElmt = this.#createDropedItemElement(dropedItemId, dropedItemIcon, dropedItemTitle, dropedItemText, function() {

                            this.#fetcher.post(flaskES6.urlFor(`api.timeseries.remove_structural_elements`, {id: tsId}), {"type": jsonData.sourceNodeData.type, "rel_id": data.data.id, "etag": data.etag}).then(
                                () => {
                                    dropZoneElmt.removeElement(dropedItemElmt);
                                }
                            ).catch(
                                (error) => {
                                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                }
                            );
                        }.bind(this));

                        dropZoneElmt.addElement(dropedItemElmt);
                    }
                ).catch(
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    }
                );
            }
        }.bind(this));
    }

    #createDropedItemElement(id, icon, title, text, removeCallback) {
        let dropedItemElmt = document.createElement("div");
        dropedItemElmt.id = id;
        dropedItemElmt.classList.add("btn-group", "btn-group-sm", "rounded", "bg-white", "text-muted");

        let dropItemMainContainerElmt = document.createElement("div");
        dropItemMainContainerElmt.classList.add("d-flex", "flex-nowrap", "align-items-center", "gap-1", "border", "border-secondary", "rounded-start", "text-nowrap", "py-1", "px-2");
        dropedItemElmt.appendChild(dropItemMainContainerElmt);

        let dropedItemIconElmt = document.createElement("i");
        dropedItemIconElmt.classList.add("bi", `bi-${icon}`);
        dropItemMainContainerElmt.appendChild(dropedItemIconElmt);

        let dropedItemTitleElmt = document.createElement("span");
        dropedItemTitleElmt.classList.add("fw-bold");
        dropedItemTitleElmt.innerText = title;
        dropItemMainContainerElmt.appendChild(dropedItemTitleElmt);

        let dropedItemTextElmt = document.createElement("small");
        dropedItemTextElmt.classList.add("opacity-75");
        dropedItemTextElmt.innerText = text;
        dropItemMainContainerElmt.appendChild(dropedItemTextElmt);

        let dropedItemRemoveElmt = document.createElement("a");
        dropedItemRemoveElmt.classList.add("btn", "btn-outline-danger", "rounded-end");
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
        dropedItemRemoveElmt.addEventListener("click", function(event) {
            event.preventDefault();

            // Display modal.
            this.show();
        }.bind(modalConfirm));

        return dropedItemElmt;
    }

    refresh(options = {}) {
        if (this.#tsPaginationElmt == null) {
            this.#tsPaginationContainerElmt.innerHTML = "";
            this.#tsPaginationContainerElmt.appendChild(new Spinner());
        }
        this.#tsItemsCountElmt.innerHTML = "";
        this.#tsItemsCountElmt.appendChild(new Spinner({isSmallSize: true}));
        this.#tsListElmt.setLoading();

        let fetcherOptions = {"page_size": Parser.parseIntOrDefault(options.page_size, this.#tsPageSizeSelectorElmt.current), "page": Parser.parseIntOrDefault(options.page, 1)};
        this.#fetcher.get(flaskES6.urlFor(`api.timeseries.retrieve_list`, fetcherOptions)).then(
            (data) => {
                for (let row of data.data) {
                    row.icon = "clock-history";
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

                if (this.#tsPaginationElmt.totalItems > 0) {
                    this.#tsItemsCountElmt.innerText = `Items ${this.#tsPaginationElmt.startItem} - ${this.#tsPaginationElmt.endItem} out of ${this.#tsPaginationElmt.totalItems}`;
                }
                else {
                    this.#tsItemsCountElmt.innerText = "No item";
                }
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString()});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        );
    }
}


export { TimeseriesManageStructuralElementsView };

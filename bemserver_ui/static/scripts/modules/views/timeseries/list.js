import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";
import { Parser } from "../../tools/parser.js";
import { TimeDisplay } from "../../tools/time.js";
import { EventLevelBadge } from "../../components/eventLevel.js";
import "../../components/itemsCount.js";
import "../../components/pagination.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { StructuralElementSelector } from "../../components/structuralElements/selector.js";


export class TimeseriesListView {

    #internalAPIRequester = null;
    #getStructElmtsReqID = null;
    #getPropDataReqID = null;
    #getEventsReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #tzName = "UTC";

    #messagesElmt = null;
    #formFiltersElmt = null;
    #campaignScopeElmt = null;
    #pageInputElmt = null;
    #pageSizeElmt = null;
    #pageLinkElmts = null;
    #accordionTimeseriesBtnElmts = null;

    #siteSelector = null;
    #zoneSelector = null;
    #structuralElementIdInputElmt = null;
    #structuralElementRecursiveSwitchElmt = null;
    #zoneIdInputElmt = null;

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.filters = options.filters || {};
        this.#tzName = options.timezone || "UTC";
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#formFiltersElmt = document.getElementById("formFilters");
        this.#campaignScopeElmt = document.getElementById("campaign_scope");
        this.#pageInputElmt = document.getElementById("page");
        this.#pageSizeElmt = document.getElementById("page_size");
        this.#pageLinkElmts = [].slice.call(document.querySelectorAll(".page-item:not(.disabled) .page-link"));
        this.#accordionTimeseriesBtnElmts = [].slice.call(document.querySelectorAll("#accordionTimeseries .accordion-collapse.collapse"));

        this.#structuralElementIdInputElmt = document.getElementById("structural_element_filter");
        this.#structuralElementRecursiveSwitchElmt = document.getElementById("structural_element_recursive");
        this.#zoneIdInputElmt = document.getElementById("zone_filter");

        this.#siteSelector = StructuralElementSelector.getInstance("siteSelector");
        this.#zoneSelector = StructuralElementSelector.getInstance("zoneSelector");
    }

    #initEventListeners() {
        this.#campaignScopeElmt.addEventListener("change", (event) => {
            event.preventDefault();

            if (event.target.options[event.target.selectedIndex].value != this.filters.campaign_scope_id) {
                this.#pageInputElmt.value = 1;
                event.target.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#pageInputElmt.value = this.filters.page;
                event.target.classList.add("border-info", "bg-info", "bg-opacity-10");
            }
        });

        this.#pageSizeElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#pageInputElmt.value = 1;
            this.#formFiltersElmt.submit();
        });

        for (let pageLinkElmt of this.#pageLinkElmts) {
            pageLinkElmt.addEventListener("click", (event) => {
                event.preventDefault();

                this.#pageInputElmt.value = pageLinkElmt.getAttribute("data-page");
                this.#formFiltersElmt.submit();
            });
        }

        for (let accordionTimeseriesBtnElmt of this.#accordionTimeseriesBtnElmts) {
            accordionTimeseriesBtnElmt.addEventListener("show.bs.collapse", (event) => {
                let tsId = event.target.getAttribute("data-ts-id");
                this.#renderProperties(tsId);
                this.#renderStructuralElements(tsId);
                this.#renderEvents(tsId);
            });
        }

        this.#siteSelector.addEventListener("treeNodeSelect", (event) => {
            if (event.detail.type == "space") {
                this.#structuralElementRecursiveSwitchElmt.checked = false;
                this.#structuralElementRecursiveSwitchElmt.setAttribute("disabled", true);
            }
            else {
                this.#structuralElementRecursiveSwitchElmt.removeAttribute("disabled");
            }

            this.#structuralElementIdInputElmt.name = `${this.#structuralElementRecursiveSwitchElmt.checked ? "recurse_" : ""}${event.detail.type}_id`;
            this.#structuralElementIdInputElmt.value = event.detail.id;
        });

        this.#siteSelector.addEventListener("treeNodeUnselect", () => {
            this.#structuralElementRecursiveSwitchElmt.removeAttribute("disabled");

            this.#structuralElementIdInputElmt.name = this.#structuralElementIdInputElmt.id;
            this.#structuralElementIdInputElmt.value = "";
        });

        this.#zoneSelector.addEventListener("treeNodeSelect", (event) => {
            this.#zoneIdInputElmt.value = event.detail.id;
        });

        this.#zoneSelector.addEventListener("treeNodeUnselect", () => {
            this.#zoneIdInputElmt.value = "";
        });

        this.#structuralElementRecursiveSwitchElmt.addEventListener("change", (event) => {
            if (this.#structuralElementIdInputElmt.value != "" && this.#structuralElementIdInputElmt.value != "space_id")
            {
                if (event.target.checked) {
                    this.#structuralElementIdInputElmt.name = `recurse_${this.#structuralElementIdInputElmt.name}`;
                }
                else {
                    this.#structuralElementIdInputElmt.name = this.#structuralElementIdInputElmt.name.replace("recurse_", "");
                }
            }
        });
    }

    #getEditBtnHTML(id, tab=null) {
        if (signedUser.is_admin) {
            let editUrlParams = {id: id};
            let editLabel = ``;
            if (tab != null) {
                editUrlParams["tab"] = tab;
                editLabel = ` ${tab}`;
            }
            try {
                let editUrl = flaskES6.urlFor(`timeseries.edit`, editUrlParams);
                return `<a class="btn btn-sm btn-outline-secondary ms-auto w-auto" href="${editUrl}" role="button" title="Edit${editLabel}"><i class="bi bi-pencil"></i> Edit${editLabel}</a>`;
            }
            catch (error) {
                console.error(error);
            }
        }
        return ``;
    }

    #getPropertyHelpHTML(property) {
        let ret = ``;
        if (property.description?.length > 0) {
            let abbrElmt = document.createElement("abbr");
            abbrElmt.title = property.description != null ? property.description : "";
            let abbrContentElmt = document.createElement("i");
            abbrContentElmt.classList.add("bi", "bi-question-diamond");
            abbrElmt.appendChild(abbrContentElmt);
            ret = `<sup class="ms-1">${abbrElmt.outerHTML}</sup>`;
        }
        return ret;
    }

    #getPropertiesHTML(properties, tsId) {
        let propertyDataHTML = ``;
        if (properties.length > 0) {
            for (let property of properties) {
                let propVal = property.value;
                switch (property.value_type) {
                    case "integer":
                        propVal = Parser.parseIntOrDefault(property.value, "-");
                        break;
                    case "float":
                        propVal = Parser.parseFloatOrDefault(property.value, "-", 1);
                        break;
                    case "boolean":
                        propVal = Parser.parseBoolOrDefault(property.value, "-");
                        break;
                    }

                let unitSymbol = (property.unit_symbol != null && property.unit_symbol.length > 0) ? `<span class="text-muted ms-1">[${property.unit_symbol}]</span>` : ``;
                propertyDataHTML += `<dl>
    <dt>${property.name}${unitSymbol}${this.#getPropertyHelpHTML(property)}</dt>
    <dd>${propVal}</dd>
</dl>`;
            }
        }
        else {
            propertyDataHTML = `<p class="fst-italic">No properties</p>`;
        }

        return `<div class="d-flex justify-content-between align-items-start mb-3">
    <div class="d-flex gap-4">
        ${propertyDataHTML}
    </div>
    ${this.#getEditBtnHTML(tsId, "properties")}
</div>`;
    }

    #getStructuralElementsHTML(data) {
        let contentHTML = ``;

        let totalLinks = 0;
        for (let structuralElementType of data.structural_element_types) {
            let structuralElementContentHTML = ``;
            let nbLinks = 0;
            for (let tsStructElmtLink of data.data[structuralElementType]) {
                structuralElementContentHTML += `<div class="d-flex flex-nowrap align-items-center border rounded bg-white px-2 py-1 gap-1">
<i class="bi bi-${structuralElementType == "zone" ? "bullseye" : "building"}"></i>
<span class="fw-bold">${tsStructElmtLink.structural_element.name}</span>`;
                if (structuralElementType != "zone" && tsStructElmtLink.structural_element.path.length > 0) {
                    structuralElementContentHTML += `<small class="text-muted ms-2">${tsStructElmtLink.structural_element.path}</small>`;
                }
                structuralElementContentHTML += `</div>`;

                totalLinks += 1;
                nbLinks += 1;
            }

            if (nbLinks > 0) {
                contentHTML += `<div class="mb-3">
    <h6 class="fw-bold text-capitalize">${structuralElementType}s (${nbLinks})</h6>
    <div class="d-flex gap-2 mx-2">${structuralElementContentHTML}</div>
</div>`;
            }
        }

        if (totalLinks <= 0) {
            contentHTML = `<p class="fst-italic">No locations</p>`;
        }

        return `<div class="mb-3">
    ${contentHTML}
</div>`;
    }

    #populateEventList(eventsList, eventsContainerElmt) {
        eventsContainerElmt.innerHTML = "";
        if (eventsList.length > 0) {
            for (let eventData of eventsList) {
                let eventElmt = document.createElement("div");
                eventElmt.classList.add("list-group-item");

                let eventHeaderElmt = document.createElement("div");
                eventHeaderElmt.classList.add("d-flex", "align-items-center", "gap-1", "w-100");
                eventElmt.appendChild(eventHeaderElmt);

                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-journal-x", "me-1");
                eventHeaderElmt.appendChild(iconElmt);

                let headerContentElmt = document.createElement("div");
                headerContentElmt.classList.add("d-flex", "justify-content-between", "align-items-center", "gap-2", "w-100");
                eventHeaderElmt.appendChild(headerContentElmt);

                let timestampElmt = document.createElement("h6");
                timestampElmt.classList.add("text-nowrap", "mb-0");
                timestampElmt.innerText = TimeDisplay.toLocaleString(new Date(eventData.timestamp), {timezone: this.#tzName});
                headerContentElmt.appendChild(timestampElmt);

                let levelBadgeElmt = new EventLevelBadge();
                levelBadgeElmt.setAttribute("level", eventData.level.toUpperCase());
                headerContentElmt.appendChild(levelBadgeElmt);

                let bodyContentElmt = document.createElement("div");
                bodyContentElmt.classList.add("d-flex", "justify-content-between", "align-items-start", "gap-2");
                eventElmt.appendChild(bodyContentElmt);

                let eventDescElmt = document.createElement("small");
                eventDescElmt.classList.add("fst-italic", "text-muted");
                eventDescElmt.innerText = eventData.description != null ? eventData.description : "-";
                bodyContentElmt.appendChild(eventDescElmt);

                let sourceElmt = document.createElement("span");
                sourceElmt.classList.add("text-nowrap");
                sourceElmt.innerText = eventData.source;
                bodyContentElmt.appendChild(sourceElmt);

                eventsContainerElmt.appendChild(eventElmt);
            }
        }
        else {
            let nodataSpanElmt = document.createElement("span");
            nodataSpanElmt.classList.add("fst-italic", "text-muted", "text-center");
            nodataSpanElmt.innerText = "No data";
            eventsContainerElmt.appendChild(nodataSpanElmt);
        }
    }

    #getErrorHTML(error) {
        return `<div class="alert alert-danger" role="alert">
    <i class="bi bi-x-octagon me-2"></i>
    ${error}
</div>`;
    }

    #renderProperties(tsId) {
        let timeseriesPropertiesElmt = document.getElementById(`timeseriesProperties-${tsId}`);
        let tsAlreadyLoaded = JSON.parse(timeseriesPropertiesElmt.getAttribute("data-ts-loaded"));
        if (!tsAlreadyLoaded) {
            timeseriesPropertiesElmt.innerHTML = "";
            timeseriesPropertiesElmt.appendChild(new Spinner());

            if (this.#getPropDataReqID != null) {
                this.#internalAPIRequester.abort(this.#getPropDataReqID);
                this.#getPropDataReqID = null;
            }
            this.#getPropDataReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.timeseries.retrieve_property_data`, {id: tsId}),
                (data) => {
                    timeseriesPropertiesElmt.innerHTML = this.#getPropertiesHTML(data, tsId);
                    timeseriesPropertiesElmt.setAttribute("data-ts-loaded", true);
                },
                (error) => {
                    timeseriesPropertiesElmt.innerHTML = this.#getErrorHTML(error.message);
                },
            );
        }
    }

    #renderStructuralElements(tsId) {
        let timeseriesStructuralElementsElmt = document.getElementById(`timeseriesStructuralElements-${tsId}`);
        let tsAlreadyLoaded = JSON.parse(timeseriesStructuralElementsElmt.getAttribute("data-ts-loaded"));
        if (!tsAlreadyLoaded) {
            timeseriesStructuralElementsElmt.innerHTML = "";
            timeseriesStructuralElementsElmt.appendChild(new Spinner());

            if (this.#getStructElmtsReqID != null) {
                this.#internalAPIRequester.abort(this.#getStructElmtsReqID);
                this.#getStructElmtsReqID = null;
            }
            this.#getStructElmtsReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId}),
                (data) => {
                    timeseriesStructuralElementsElmt.innerHTML = this.#getStructuralElementsHTML(data);
                    timeseriesStructuralElementsElmt.setAttribute("data-ts-loaded", true);
                },
                (error) => {
                    timeseriesStructuralElementsElmt.innerHTML = this.#getErrorHTML(error.message);
                },
            );
        }
    }

    #renderEvents(tsId) {
        let tsEventsPageSizeElmt = document.getElementById(`tsEventsPageSize-${tsId}`);
        let tsEventsItemsCountElmt = document.getElementById(`tsEventsItemsCount-${tsId}`);
        let tsEventsPaginationElmt = document.getElementById(`tsEventsPagination-${tsId}`);
        let tsEventsContainerElmt = document.getElementById(`tsEvents-${tsId}`);
        let alreadyLoaded = JSON.parse(tsEventsContainerElmt.getAttribute("data-ts-loaded"));

        if (!alreadyLoaded) {
            tsEventsContainerElmt.innerHTML = "";
            tsEventsContainerElmt.appendChild(new Spinner());

            if (this.#getEventsReqID != null) {
                this.#internalAPIRequester.abort(this.#getEventsReqID);
                this.#getEventsReqID = null;
            }

            tsEventsPageSizeElmt.addEventListener("pageSizeChange", (event) => {
                event.preventDefault();

                if (event.detail.newValue != event.detail.oldValue) {
                    tsEventsPaginationElmt.page = 1;
                    tsEventsContainerElmt.setAttribute("data-ts-loaded", false);
                    this.#renderEvents(tsId);
                }
            });
            tsEventsPaginationElmt.addEventListener("pageItemClick", (event) => {
                event.preventDefault();

                this.#renderEvents(tsId);
            });

            let eventsOptions = {
                "page_size": tsEventsPageSizeElmt.current,
                "page": tsEventsPaginationElmt.page,
                "timeseries_id": tsId,
            };
            this.#getEventsReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.events.retrieve_list`, eventsOptions),
                (data) => {
                    let eventsPaginationOpts = {
                        pageSize: tsEventsPageSizeElmt.current,
                        totalItems: data.pagination.total,
                        totalPages: data.pagination.total_pages,
                        page: data.pagination.page,
                        firstPage: data.pagination.first_page,
                        lastPage: data.pagination.last_page,
                        previousPage: data.pagination.previous_page,
                        nextPage: data.pagination.next_page,
                    }
                    tsEventsPaginationElmt.reload(eventsPaginationOpts);
                    tsEventsItemsCountElmt.update({totalCount: tsEventsPaginationElmt.totalItems, firstItem: tsEventsPaginationElmt.startItem, lastItem: tsEventsPaginationElmt.endItem});
    
                    this.#populateEventList(data.data, tsEventsContainerElmt);
                    tsEventsContainerElmt.setAttribute("data-ts-loaded", true);
                },
                (error) => {
                    tsEventsContainerElmt.innerHTML = this.#getErrorHTML(error.message);
                },
            );
        }
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

                if (this.#structuralElementIdInputElmt.value != "") {
                    let structuralElementType = this.#structuralElementIdInputElmt.name.replace("_id", "");
                    this.#siteSelector.select(`${structuralElementType}-${this.#structuralElementIdInputElmt.value}`);
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

                if (this.#zoneIdInputElmt.value != "") {
                    this.#zoneSelector.select(`zone-${this.#zoneIdInputElmt.value}`);
                }
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
    }
}

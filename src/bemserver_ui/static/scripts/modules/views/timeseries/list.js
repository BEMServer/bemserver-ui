import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { TimeDisplay } from "/static/scripts/modules/tools/time.js";
import { EventLevelBadge } from "/static/scripts/modules/components/eventLevel.js";
import "/static/scripts/modules/components/itemsCount.js";
import "/static/scripts/modules/components/pagination.js";
import { StructuralElementSelector } from "/static/scripts/modules/components/structuralElements/selector.js";
import { getOptionIndexFromSelect } from "/static/scripts/modules/tools/utils.js";


export class TimeseriesListView {

    #internalAPIRequester = null;
    #getStructElmtsReqID = null;
    #getPropDataReqID = null;
    #getStatsReqID = {};
    #getEventsReqID = null;
    #sitesTreeReqID = null;
    #zonesTreeReqID = null;

    #filters = {};
    #tzName = "UTC";

    #formFiltersElmt = null;
    #formFiltersSubmitBtnElmt = null;
    #formFiltersResetBtnElmt = null;
    #searchInputElmt = null;
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

    #definePropertyContainerElmt = null;
    #definePropertySelectElmt = null;
    #addFilterTsPropValueBtnElmt = null;
    #propertiesContainerElmt = null;

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#filters = options.filters || {};
        this.#tzName = options.timezone || "UTC";
    }

    #cacheDOM() {
        this.#formFiltersElmt = document.getElementById("formFilters");
        this.#formFiltersSubmitBtnElmt = document.getElementById("formFiltersSubmitBtn");
        this.#formFiltersResetBtnElmt = document.getElementById("formFiltersResetBtn");
        this.#searchInputElmt = document.getElementById("in_name");
        this.#campaignScopeElmt = document.getElementById("campaign_scope_id");
        this.#pageInputElmt = document.getElementById("page");
        this.#pageSizeElmt = document.getElementById("page_size");
        this.#pageLinkElmts = [].slice.call(document.querySelectorAll(".page-item:not(.disabled) .page-link"));
        this.#accordionTimeseriesBtnElmts = [].slice.call(document.querySelectorAll("#accordionTimeseries .accordion-collapse.collapse"));

        this.#structuralElementIdInputElmt = document.getElementById("structural_element_filter");
        this.#structuralElementRecursiveSwitchElmt = document.getElementById("structural_element_recursive");
        this.#zoneIdInputElmt = document.getElementById("zone_filter");

        this.#siteSelector = StructuralElementSelector.getInstance("siteSelector");
        this.#zoneSelector = StructuralElementSelector.getInstance("zoneSelector");

        this.#definePropertyContainerElmt = document.getElementById("definePropertyContainer");
        this.#definePropertySelectElmt = document.getElementById("definePropertySelect");
        this.#addFilterTsPropValueBtnElmt = document.getElementById("addFilterTsPropValueBtn");
        this.#propertiesContainerElmt = document.getElementById("propsContainer");
    }

    #initEventListeners() {
        this.#formFiltersSubmitBtnElmt.addEventListener("click", () => {
            this.#pageInputElmt.value = 1;
        });

        this.#formFiltersResetBtnElmt.addEventListener("click", () => {
            this.#pageInputElmt.value = 1;
        });

        this.#searchInputElmt.addEventListener("input", () => {
            if (this.#filters.in_name != this.#searchInputElmt.value) {
                this.#searchInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#searchInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            }
        });

        this.#campaignScopeElmt.addEventListener("change", (event) => {
            event.preventDefault();

            let newCampaignScopeId = event.target.options[event.target.selectedIndex].value;

            if (newCampaignScopeId != this.#filters.campaign_scope_id) {
                this.#pageInputElmt.value = 1;
                event.target.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#pageInputElmt.value = this.#filters.page;
                if (newCampaignScopeId != "None") {
                    event.target.classList.add("border-info", "bg-info", "bg-opacity-10");
                }
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
                this.#renderStats(tsId);
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

        this.#addFilterTsPropValueBtnElmt.addEventListener("click", () => {
            this.#addPropertyFilter();

            if (this.#definePropertySelectElmt.selectedIndex != -1) {
                let selectedPropertyOptionElmt = this.#definePropertySelectElmt.options[this.#definePropertySelectElmt.selectedIndex];
                selectedPropertyOptionElmt.setAttribute("disabled", true);

                this.#updateAvailableProperties();
            }
        });
    }

    #addPropertyFilter() {
        if (this.#definePropertySelectElmt.selectedIndex != -1) {
            let selectedPropertyOptionElmt = this.#definePropertySelectElmt.options[this.#definePropertySelectElmt.selectedIndex];
            let propertyId = selectedPropertyOptionElmt.value;
            let propertyType = selectedPropertyOptionElmt.getAttribute("data-type", "string");
            let propertyDescription = selectedPropertyOptionElmt.getAttribute("data-description");

            let propertyContainerElmt = document.createElement("div");
            propertyContainerElmt.classList.add("mb-2");
            propertyContainerElmt.id = `propContainer_${propertyId}`;
            this.#propertiesContainerElmt.appendChild(propertyContainerElmt);

            let propertyInputGroupElmt = document.createElement("div");
            propertyInputGroupElmt.classList.add("input-group", "input-group-sm", "flex-nowrap");
            propertyContainerElmt.appendChild(propertyInputGroupElmt);

            let propertyLabelElmt = document.createElement("span");
            propertyLabelElmt.classList.add("input-group-text");
            propertyLabelElmt.id = `propLabel_${propertyId}`;
            propertyLabelElmt.textContent = selectedPropertyOptionElmt.text;
            propertyInputGroupElmt.appendChild(propertyLabelElmt);

            let propertyValueElmt = document.createElement("input");
            propertyValueElmt.classList.add("form-control", "form-control-sm");
            propertyValueElmt.id = `prop_${propertyId}`;
            propertyValueElmt.name = propertyValueElmt.id;
            propertyValueElmt.setAttribute("form", "formFilters");
            propertyValueElmt.setAttribute("aria-describedby", propertyLabelElmt.id);

            switch (propertyType) {
                case "string":
                    propertyValueElmt.type = "text";
                    propertyValueElmt.setAttribute("maxlength", 100);
                    break;
                case "integer":
                    propertyValueElmt.type = "number";
                    break;
                case "float":
                    propertyValueElmt.type = "number";
                    propertyValueElmt.setAttribute("step", 0.01);
                    break;
                case "boolean":
                    propertyValueElmt.classList.replace("form-control", "form-check-input");
                    propertyValueElmt.classList.remove("form-control-sm");
                    propertyValueElmt.type = "checkbox";
                    propertyValueElmt.setAttribute("role", "switch");
                    break;
            }

            if (propertyValueElmt.type == "checkbox") {
                let propertySwitchInputGroupElmt = document.createElement("div");
                propertySwitchInputGroupElmt.classList.add("input-group-text", "bg-white");
                propertyInputGroupElmt.appendChild(propertySwitchInputGroupElmt);

                let propertySwitchContainerElmt = document.createElement("div");
                propertySwitchContainerElmt.classList.add("form-check", "form-switch");
                propertySwitchInputGroupElmt.appendChild(propertySwitchContainerElmt);

                // Trick that forces the form to send checkbox value, even when unchecked.
                let hiddenPropValElmt = document.createElement("input");
                hiddenPropValElmt.type = "hidden";
                hiddenPropValElmt.name = propertyValueElmt.name;
                hiddenPropValElmt.setAttribute("form", propertyValueElmt.getAttribute("form"));
                hiddenPropValElmt.setAttribute("value", propertyValueElmt.checked ? "on": "off");
                propertySwitchContainerElmt.appendChild(hiddenPropValElmt);

                propertySwitchContainerElmt.appendChild(propertyValueElmt);

                propertyValueElmt.addEventListener("click", () => {
                    hiddenPropValElmt.setAttribute("value", propertyValueElmt.checked ? "on": "off");
                });
            }
            else {
                propertyInputGroupElmt.appendChild(propertyValueElmt);
            }

            let propertyDescriptionElmt = document.createElement("div");
            propertyDescriptionElmt.classList.add("form-text", "fst-italic");
            propertyDescriptionElmt.id = `propDescription_${propertyId}`;
            propertyDescriptionElmt.textContent = [propertyDescription, propertyType].filter(Boolean).join(", ");
            propertyContainerElmt.appendChild(propertyDescriptionElmt);

            let propertyDeleteBtnElmt = document.createElement("button");
            propertyDeleteBtnElmt.classList.add("btn", "btn-sm", "btn-outline-danger");
            propertyDeleteBtnElmt.id = `propDeleteBtn_${propertyId}`;
            propertyDeleteBtnElmt.setAttribute("type", "button");
            propertyDeleteBtnElmt.setAttribute("title", "Remove the attribute filter");
            propertyInputGroupElmt.appendChild(propertyDeleteBtnElmt);

            let propertyDeleteIconElmt = document.createElement("i");
            propertyDeleteIconElmt.classList.add("bi", "bi-trash");
            propertyDeleteBtnElmt.appendChild(propertyDeleteIconElmt);

            propertyDeleteBtnElmt.addEventListener("click", () => {
                propertyContainerElmt.remove();

                selectedPropertyOptionElmt.removeAttribute("disabled");

                this.#updateAvailableProperties();
            });

            propertyValueElmt.focus();
        }
    }

    #updateAvailableProperties() {
        let availableElmts = [].slice.call(this.#definePropertySelectElmt.querySelectorAll(`option:not([disabled])`));
        if (availableElmts.length > 0) {
            let index = getOptionIndexFromSelect(this.#definePropertySelectElmt, availableElmts[0].value);
            this.#definePropertySelectElmt.selectedIndex = index;

            if (this.#definePropertySelectElmt.hasAttribute("disabled")) {
                this.#definePropertySelectElmt.removeAttribute("disabled");
            }
            if (this.#addFilterTsPropValueBtnElmt.hasAttribute("disabled")) {
                this.#addFilterTsPropValueBtnElmt.removeAttribute("disabled");
            }
            if (this.#definePropertyContainerElmt.classList.contains("d-none", "invisible")) {
                this.#definePropertyContainerElmt.classList.remove("d-none", "invisible");
            }
        }
        else {
            this.#definePropertySelectElmt.selectedIndex = -1;

            this.#definePropertySelectElmt.setAttribute("disabled", true);
            this.#addFilterTsPropValueBtnElmt.setAttribute("disabled", true);
            this.#definePropertyContainerElmt.classList.add("d-none", "invisible");
        }
    }

    #createPropertiesElement(properties, tsId) {
        let propContainerElmt = document.createElement("div");
        propContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-start", "gap-3");

        let propDataElmt = document.createElement("div");
        propDataElmt.classList.add("list-group", "w-100");
        propContainerElmt.appendChild(propDataElmt);

        if (app.signedUser.is_admin) {
            let editLinkElmt = document.createElement("a");
            editLinkElmt.classList.add("btn", "btn-sm", "btn-outline-secondary", "ms-auto", "w-auto");
            editLinkElmt.setAttribute("role", "button");
            editLinkElmt.title = `Edit attributes`;
            editLinkElmt.href = app.urlFor(`timeseries.edit`, {id: tsId, tab: "attributes"});
            propContainerElmt.appendChild(editLinkElmt);

            let editIconElmt = document.createElement("i");
            editIconElmt.classList.add("bi", "bi-pencil", "me-1");
            editLinkElmt.appendChild(editIconElmt);

            let editLabelElmt = document.createElement("span");
            editLabelElmt.textContent = editLinkElmt.title;
            editLinkElmt.appendChild(editLabelElmt);
        }

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

                let propGroupItemContainerElmt = document.createElement("div");
                propGroupItemContainerElmt.classList.add("list-group-item");
                propDataElmt.appendChild(propGroupItemContainerElmt);

                let propItemContainerElmt = document.createElement("div");
                propItemContainerElmt.classList.add("d-flex", "justify-content-xl-start", "justify-content-between", "gap-4", "w-100");
                propGroupItemContainerElmt.appendChild(propItemContainerElmt);

                let propItemElmt = document.createElement("div");
                propItemContainerElmt.appendChild(propItemElmt);

                let propItemTitleElmt = document.createElement("div");
                propItemTitleElmt.classList.add("fw-bold");
                propItemTitleElmt.textContent = property.name;
                propItemElmt.appendChild(propItemTitleElmt);

                let propItemValueContainerElmt = document.createElement("div");
                propItemValueContainerElmt.classList.add("d-flex", "gap-1");
                propItemElmt.appendChild(propItemValueContainerElmt);

                let propItemValueElmt = document.createElement("span");
                propItemValueElmt.textContent = propVal;
                propItemValueContainerElmt.appendChild(propItemValueElmt);

                if (property.unit_symbol?.length > 0) {
                    let propItemUnitElmt = document.createElement("span");
                    propItemUnitElmt.classList.add("fw-bold");
                    propItemUnitElmt.textContent = property.unit_symbol;
                    propItemValueContainerElmt.appendChild(propItemUnitElmt);
                }

                let propItemInfoElmt = document.createElement("div");
                propItemContainerElmt.appendChild(propItemInfoElmt);

                if (property.description?.length > 0) {
                    let propItemDescriptionElmt = document.createElement("small");
                    propItemDescriptionElmt.classList.add("fst-italic", "text-muted", "multiline");
                    propItemDescriptionElmt.textContent = property.description != null ? property.description : "";
                    propItemInfoElmt.appendChild(propItemDescriptionElmt);
                }
            }
        }
        else {
            let noDataElmt = document.createElement("p");
            noDataElmt.classList.add("fst-italic");
            noDataElmt.textContent = "No attributes";
            propDataElmt.appendChild(noDataElmt);
        }

        return propContainerElmt;
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
<span class="fw-bold">${tsStructElmtLink[structuralElementType].name}</span>`;
                if (structuralElementType != "zone" && tsStructElmtLink.path.length > 0) {
                    structuralElementContentHTML += `<small class="text-muted ms-2">${tsStructElmtLink.path}</small>`;
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

    #populateStats(tsDataStats, statsContainerElmt) {
        statsContainerElmt.innerHTML = "";

        let createListGroupItemElmt = (title, value) => {
            let listGroupItemElmt = document.createElement("li");
            listGroupItemElmt.classList.add("list-group-item", "d-flex", "align-items-center", "justify-content-between", "gap-2");
            timestampsBoundsListElmt.appendChild(listGroupItemElmt);
            let listGroupItemTitleElmt = document.createElement("h6");
            listGroupItemTitleElmt.classList.add("fw-bold", "text-muted", "mb-0");
            listGroupItemTitleElmt.innerText = title;
            listGroupItemElmt.appendChild(listGroupItemTitleElmt);
            let listGroupItemValueElmt = document.createElement("small");
            listGroupItemValueElmt.classList.add("text-nowrap");
            listGroupItemValueElmt.innerText = value;
            listGroupItemElmt.appendChild(listGroupItemValueElmt);
            return listGroupItemElmt;
        };

        let timestampsCardElmt = document.createElement("div");
        timestampsCardElmt.classList.add("card", "mb-auto");
        statsContainerElmt.appendChild(timestampsCardElmt);
        let timestampsCardHeaderElmt = document.createElement("div");
        timestampsCardHeaderElmt.classList.add("card-header", "fw-bold");
        timestampsCardHeaderElmt.innerText = "Timestamps statistics";
        timestampsCardElmt.appendChild(timestampsCardHeaderElmt);
        let timestampsBoundsListElmt = document.createElement("ul");
        timestampsBoundsListElmt.classList.add("list-group", "list-group-flush");
        timestampsCardElmt.appendChild(timestampsBoundsListElmt);
        timestampsBoundsListElmt.appendChild(createListGroupItemElmt("First", tsDataStats["first_timestamp"] != null ? TimeDisplay.toLocaleString(new Date(tsDataStats["first_timestamp"]), {timezone: this.#tzName}) : "-"));
        timestampsBoundsListElmt.appendChild(createListGroupItemElmt("Last", tsDataStats["last_timestamp"] != null ? TimeDisplay.toLocaleString(new Date(tsDataStats["last_timestamp"]), {timezone: this.#tzName}) : "-"));
        timestampsBoundsListElmt.appendChild(createListGroupItemElmt("Period duration", tsDataStats["period_duration"] || "-"));
        timestampsBoundsListElmt.appendChild(createListGroupItemElmt("Last data since", tsDataStats["last_data_since"] || "-"));

        let statsCardElmt = document.createElement("div");
        statsCardElmt.classList.add("card", "mb-auto");
        statsContainerElmt.appendChild(statsCardElmt);
        let statsCardHeaderElmt = document.createElement("div");
        statsCardHeaderElmt.classList.add("card-header", "fw-bold");
        statsCardHeaderElmt.innerText = "Values statistics";
        statsCardElmt.appendChild(statsCardHeaderElmt);
        let statsListElmt = document.createElement("ul");
        statsListElmt.classList.add("list-group", "list-group-flush");
        statsCardElmt.appendChild(statsListElmt);
        statsListElmt.appendChild(createListGroupItemElmt("Count", Parser.parseIntOrDefault(tsDataStats["count"])));
        statsListElmt.appendChild(createListGroupItemElmt("Minimum", Parser.parseFloatOrDefault(tsDataStats["min"], Number.NaN, 2)));
        statsListElmt.appendChild(createListGroupItemElmt("Maximum", Parser.parseFloatOrDefault(tsDataStats["max"], Number.NaN, 2)));
        statsListElmt.appendChild(createListGroupItemElmt("Average", Parser.parseFloatOrDefault(tsDataStats["avg"], Number.NaN, 2)));
        statsListElmt.appendChild(createListGroupItemElmt("Standard deviation", Parser.parseFloatOrDefault(tsDataStats["stddev"], Number.NaN, 2)));
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

    #createErrorElement(error) {
        let errorContainerElmt = document.createElement("div");
        errorContainerElmt.classList.add("alert", "alert-danger");
        errorContainerElmt.setAttribute("role", "alert");

        let errorIconElmt = document.createElement("i");
        errorIconElmt.classList.add("bi", "bi-x-octagon", "me-2");
        errorContainerElmt.appendChild(errorIconElmt);

        let errorTextElmt = document.createElement("span");
        errorTextElmt.textContent = error;
        errorContainerElmt.appendChild(errorTextElmt);

        return errorContainerElmt;
    }

    #renderProperties(tsId) {
        let timeseriesPropertiesElmt = document.getElementById(`timeseriesAttributes-${tsId}`);
        let tsAlreadyLoaded = JSON.parse(timeseriesPropertiesElmt.getAttribute("data-ts-loaded"));
        if (!tsAlreadyLoaded) {
            timeseriesPropertiesElmt.innerHTML = "";
            timeseriesPropertiesElmt.appendChild(new Spinner());

            if (this.#getPropDataReqID != null) {
                this.#internalAPIRequester.abort(this.#getPropDataReqID);
                this.#getPropDataReqID = null;
            }
            this.#getPropDataReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.timeseries.retrieve_property_data`, {id: tsId}),
                (data) => {
                    timeseriesPropertiesElmt.innerHTML = "";
                    timeseriesPropertiesElmt.appendChild(this.#createPropertiesElement(data, tsId));
                },
                (error) => {
                    timeseriesPropertiesElmt.innerHTML = "";
                    timeseriesPropertiesElmt.appendChild(this.#createErrorElement(error.message));
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
                app.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId}),
                (data) => {
                    timeseriesStructuralElementsElmt.innerHTML = this.#getStructuralElementsHTML(data);
                    timeseriesStructuralElementsElmt.setAttribute("data-ts-loaded", true);
                },
                (error) => {
                    timeseriesStructuralElementsElmt.innerHTML = "";
                    timeseriesStructuralElementsElmt.appendChild(this.#createErrorElement(error.message));
                },
            );
        }
    }

    #renderStats(tsId) {
        let tsDataStatsStatesElmt = document.getElementById(`tsDataStatsStates-${tsId}`);
        let tsDataStatsContainerElmt = document.getElementById(`tsDataStats-${tsId}`);
        let alreadyLoaded = JSON.parse(tsDataStatsContainerElmt.getAttribute("data-ts-loaded"));

        if (!alreadyLoaded) {
            tsDataStatsContainerElmt.innerHTML = "";
                tsDataStatsContainerElmt.appendChild(new Spinner());

                if (this.#getStatsReqID[tsId] != null) {
                    this.#internalAPIRequester.abort(this.#getStatsReqID[tsId]);
                    this.#getStatsReqID[tsId] = null;
                }
                this.#getStatsReqID[tsId] = this.#internalAPIRequester.get(
                    app.urlFor(`api.timeseries.data.retrieve_stats`, {data_state: tsDataStatsStatesElmt.value, timeseries: [tsId]}),
                    (data) => {
                        this.#populateStats(data[tsId.toString()], tsDataStatsContainerElmt);
                        tsDataStatsContainerElmt.setAttribute("data-ts-loaded", true);
                    },
                    (error) => {
                        tsDataStatsContainerElmt.innerHTML = "";
                        tsDataStatsContainerElmt.appendChild(this.#createErrorElement(error.message));
                    },
                );

            tsDataStatsStatesElmt.addEventListener("change", () => {
                tsDataStatsContainerElmt.setAttribute("data-ts-loaded", false);
                this.#renderStats(tsId);
            });
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
                app.urlFor(`api.events.retrieve_list`, eventsOptions),
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
                    tsEventsContainerElmt.innerHTML = "";
                    tsEventsContainerElmt.appendChild(this.#createErrorElement(error.message));
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
            app.urlFor(`api.structural_elements.retrieve_tree_sites`),
            (data) => {
                this.#siteSelector.loadTree(data.data);

                if (this.#structuralElementIdInputElmt.value != "") {
                    let structuralElementType = this.#structuralElementIdInputElmt.name.replace("_id", "");
                    this.#siteSelector.select(`${structuralElementType}-${this.#structuralElementIdInputElmt.value}`);
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
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
            app.urlFor(`api.structural_elements.retrieve_tree_zones`),
            (data) => {
                this.#zoneSelector.loadTree(data.data);

                if (this.#zoneIdInputElmt.value != "") {
                    this.#zoneSelector.select(`zone-${this.#zoneIdInputElmt.value}`);
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    mount() {
        this.#loadSitesTreeData();
        this.#loadZonesTreeData();

        // Store initial filter values.
        this.#filters = {
            in_name: this.#searchInputElmt.value,
            campaign_scope_id: this.#campaignScopeElmt.options[this.#campaignScopeElmt.selectedIndex].value,
            page: this.#pageInputElmt.value,
        }

        // Set event listener on existing attribute filter remove buttons.
        let attributeFilterRemoveBtnElmts = [].slice.call(this.#propertiesContainerElmt.querySelectorAll(`button[id^="propDeleteBtn_"]`));
        for (let attributeFilterRemoveBtnElmt of attributeFilterRemoveBtnElmts) {
            let attrId = attributeFilterRemoveBtnElmt.id.split("_")[1];

            attributeFilterRemoveBtnElmt.addEventListener("click", () => {
                document.getElementById(`propContainer_${attrId}`)?.remove();

                let propOptIndex = getOptionIndexFromSelect(this.#definePropertySelectElmt, attrId);
                this.#definePropertySelectElmt.options[propOptIndex]?.removeAttribute("disabled");

                this.#updateAvailableProperties();
            });
        }

        // Set event listener on existing checkbox attribute filters.
        let attributeFilterCheckboxElmts = [].slice.call(this.#propertiesContainerElmt.querySelectorAll(`input[type="checkbox"]`));
        for (let attributeFilterCheckboxElmt of attributeFilterCheckboxElmts) {
            attributeFilterCheckboxElmt.addEventListener("click", () => {
                let attributeFilterCheckboxHiddenInputElmt = this.#propertiesContainerElmt.querySelector(`input[type="hidden"][name="${attributeFilterCheckboxElmt.id}"]`);
                attributeFilterCheckboxHiddenInputElmt.setAttribute("value", attributeFilterCheckboxElmt.checked ? "on": "off");
            });
        }
    }
}

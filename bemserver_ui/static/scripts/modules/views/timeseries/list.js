import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";


class TimeseriesListView {

    #formFiltersElmt = null;
    #campaignScopeElmt = null;
    #pageInputElmt = null;
    #pageSizeElmt = null;
    #pageLinkElmts = null;
    #accordionTimeseriesBtnElmts = null;

    constructor(filters) {
        this.filters = filters;

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#formFiltersElmt = document.getElementById("formFilters");
        this.#campaignScopeElmt = document.getElementById("campaign_scope");
        this.#pageInputElmt = document.getElementById("page");
        this.#pageSizeElmt = document.getElementById("page_size");
        this.#pageLinkElmts = [].slice.call(document.querySelectorAll(".page-item:not(.disabled) .page-link"));
        this.#accordionTimeseriesBtnElmts = [].slice.call(document.querySelectorAll("#accordionTimeseries .accordion-collapse.collapse"));
    }

    #initEventListeners() {
        this.#campaignScopeElmt.addEventListener("change", function(event) {
            event.preventDefault();

            if (event.target.options[event.target.selectedIndex].value != this.filters.campaign_scope_id) {
                this.#pageInputElmt.value = 1;
                event.target.classList.remove("border-info", "bg-info", "bg-opacity-10");
            }
            else {
                this.#pageInputElmt.value = this.filters.page;
                event.target.classList.add("border-info", "bg-info", "bg-opacity-10");
            }
        }.bind(this));

        this.#pageSizeElmt.addEventListener("change", function(event) {
            event.preventDefault();

            this.#pageInputElmt.value = 1;
            this.#formFiltersElmt.submit();
        }.bind(this));

        for (let pageLinkElmt of this.#pageLinkElmts) {
            pageLinkElmt.addEventListener("click", function(event) {
                event.preventDefault();

                this.#pageInputElmt.value = pageLinkElmt.getAttribute("data-page");
                this.#formFiltersElmt.submit();
            }.bind(this));
        }

        for (let accordionTimeseriesBtnElmt of this.#accordionTimeseriesBtnElmts) {
            accordionTimeseriesBtnElmt.addEventListener("show.bs.collapse", function(event) {
                let tsId = event.target.getAttribute("data-ts-id");
                this.#renderProperties(tsId);
                this.#renderStructuralElements(tsId);
            }.bind(this));
        }
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
            abbrElmt.title = property.description;
            abbrElmt.innerHTML = `<i class="bi bi-question-diamond"></i>`;
            ret = `<sup class="ms-1">${abbrElmt.outerHTML}</sup>`;
        }
        return ret;
    }

    #getPropertiesHTML(properties, tsId) {
        let propertyDataHTML = ``;
        if (properties.length > 0) {
            for (let property of properties) {
                propertyDataHTML += `<dl>
    <dt>${property.name}${this.#getPropertyHelpHTML(property)}</dt>
    <dd>${(property.value !== "" && property.value != null) ? Number.parseFloat(property.value).toFixed(1) : "-"}</dd>
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

    #getStructuralElementsHTML(data, tsId) {
        let contentHTML = ``;

        let totalLinks = 0;
        for (let structuralElementType of data.structural_element_types) {
            let structuralElementContentHTML = ``;
            let nbLinks = 0;
            for (let tsStructElmtLink of data.data[structuralElementType]) {
                structuralElementContentHTML += `<div class="d-flex flex-nowrap align-items-center border rounded bg-white text-muted px-2 py-1 gap-1">
<i class="bi bi-${structuralElementType == "zone" ? "bullseye" : "building"}"></i>
<span class="fw-bold">${tsStructElmtLink.structural_element.name}</span>`;
                if (structuralElementType != "zone") {
                    structuralElementContentHTML += `<small class="opacity-75">${tsStructElmtLink.structural_element.path}</small>`;
                }
                structuralElementContentHTML += `</div>`;

                totalLinks += 1;
                nbLinks += 1;
            }

            contentHTML += `<div class="mb-3">
    <h6 class="fw-bold text-capitalize text-muted">${structuralElementType}s <span class="badge bg-secondary">${nbLinks}</span></h6>
    <div class="d-flex gap-2 mx-2">${structuralElementContentHTML}</div>
</div>`;
        }

        if (totalLinks <= 0) {
            contentHTML = `<p class="fst-italic">No locations</p>`;
        }

        return `<div class="mb-3">
    ${contentHTML}
</div>`;
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

            let retrievePropertiesUrl = flaskES6.urlFor(`api.timeseries.retrieve_property_data`, {id: tsId});
            let fetcher = new Fetcher();
            fetcher.get(retrievePropertiesUrl).then(
                (data) => {
                    timeseriesPropertiesElmt.innerHTML = this.#getPropertiesHTML(data, tsId);
                    timeseriesPropertiesElmt.setAttribute("data-ts-loaded", true);
                }
            ).catch(
                (error) => {
                    timeseriesPropertiesElmt.innerHTML = this.#getErrorHTML(error.message);
                }
            );
        }
    }

    #renderStructuralElements(tsId) {
        let timeseriesStructuralElementsElmt = document.getElementById(`timeseriesStructuralElements-${tsId}`);
        let tsAlreadyLoaded = JSON.parse(timeseriesStructuralElementsElmt.getAttribute("data-ts-loaded"));
        if (!tsAlreadyLoaded) {
            timeseriesStructuralElementsElmt.innerHTML = "";
            timeseriesStructuralElementsElmt.appendChild(new Spinner());

            let retrieveStructuralElementsUrl = flaskES6.urlFor(`api.timeseries.retrieve_structural_elements`, {id: tsId});
            let fetcher = new Fetcher();
            fetcher.get(retrieveStructuralElementsUrl).then(
                (data) => {
                    timeseriesStructuralElementsElmt.innerHTML = this.#getStructuralElementsHTML(data, tsId);
                    timeseriesStructuralElementsElmt.setAttribute("data-ts-loaded", true);
                }
            ).catch(
                (error) => {
                    timeseriesStructuralElementsElmt.innerHTML = this.#getErrorHTML(error.message);
                }
            );
        }
    }
}


export { TimeseriesListView };

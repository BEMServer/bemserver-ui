import { flaskES6 } from "../../../../app.js";
import { InternalAPIRequest } from "../../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../../components/flash.js";
import { Spinner } from "../../../components/spinner.js";
import "../../../components/itemsCount.js";
import { Parser } from "../../../tools/parser.js";


class CheckOutlierDataServiceListView {

    #internalAPIRequester = null;
    #searchReqID = null;

    #messagesElmt = null;

    #campaignNameSearchElmt = null;
    #campaignStateFilterElmt = null;
    #serviceStateFilterElmt = null;
    #removeFiltersBtnElmt = null;

    #itemsCountElmt = null;
    #serviceStatesContainerElmt = null;

    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#campaignNameSearchElmt = document.getElementById("campaignNameSearch");
        this.#campaignStateFilterElmt = document.getElementById("campaign_state");
        this.#serviceStateFilterElmt = document.getElementById("service_state");
        this.#removeFiltersBtnElmt = document.getElementById("removeFiltersBtn");

        this.#itemsCountElmt = document.getElementById("itemsCount");
        this.#serviceStatesContainerElmt = document.getElementById("serviceStatesContainer");
    }

    #initEventListeners() {
        this.#campaignNameSearchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateCampaignNameSearch();
            this.refresh();
        });

        this.#campaignStateFilterElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateSelectFilter(this.#campaignStateFilterElmt);
            this.refresh();
        });

        this.#serviceStateFilterElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateSelectFilter(this.#serviceStateFilterElmt);
            this.refresh();
        });

        this.#removeFiltersBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            if (this.#campaignNameSearchElmt.value != "") {
                this.#campaignNameSearchElmt.value = "";
                this.#updateCampaignNameSearch();
                hasFilterChanged = true;
            }

            let campaignStateFilterDefault = this.#campaignStateFilterElmt.getAttribute("data-default");
            if (this.#campaignStateFilterElmt.value != campaignStateFilterDefault) {
                this.#campaignStateFilterElmt.value = campaignStateFilterDefault;
                this.#updateSelectFilter(this.#campaignStateFilterElmt);
                hasFilterChanged = true;
            }

            let serviceStateFilterDefault = this.#serviceStateFilterElmt.getAttribute("data-default");
            if (this.#serviceStateFilterElmt.value != serviceStateFilterDefault) {
                this.#serviceStateFilterElmt.value = serviceStateFilterDefault;
                this.#updateSelectFilter(this.#serviceStateFilterElmt);
                hasFilterChanged = true;
            }

            if (hasFilterChanged) {
                this.refresh();
            }
        });
    }

    #updateCampaignNameSearch() {
        if (this.#campaignNameSearchElmt.value == "") {
            this.#campaignNameSearchElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else if (!this.#campaignNameSearchElmt.classList.contains("border-info")) {
            this.#campaignNameSearchElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    #updateSelectFilter(selectFilterElmt) {
        if (selectFilterElmt.value == selectFilterElmt.getAttribute("data-default")) {
            selectFilterElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else {
            selectFilterElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    #createEntryElement(entryData) {
        let isSelected = Parser.parseBoolOrDefault(entryData["is_selected"], false);

        let manageUrl = flaskES6.urlFor(`services.outlier_data.campaign_state`, {id: entryData["campaign_id"]});
        if (isSelected) {
            manageUrl = flaskES6.urlFor(`services.outlier_data.campaign_context_state`);
        }
        else if (entryData["id"] != null) {
            manageUrl = flaskES6.urlFor(`services.outlier_data.service_state`, {id: entryData["id"]});
        }

        let entryElmt = document.createElement("a");
        entryElmt.classList.add("list-group-item", "list-group-item-action", "d-flex", "gap-3", "py-3");
        if (isSelected) {
            entryElmt.classList.add("app-campaign-selected");
        }
        entryElmt.href = manageUrl;
        entryElmt.title = "Manage campaign check outlier data service";
        let entryIconElmt = document.createElement("i");
        entryIconElmt.classList.add("bi", "bi-puzzle");
        entryElmt.appendChild(entryIconElmt);

        let entryContainerElmt = document.createElement("div");
        entryContainerElmt.classList.add("d-sm-flex", "d-grid", "justify-content-between", "gap-2", "w-100");
        entryElmt.appendChild(entryContainerElmt);

        let entryInfoContainerElmt = document.createElement("div");
        entryInfoContainerElmt.classList.add("d-grid", "gap-2");
        entryContainerElmt.appendChild(entryInfoContainerElmt);
        let entryInfoCampaignStateContainerElmt = document.createElement("div");
        entryInfoCampaignStateContainerElmt.classList.add("d-flex", "flex-wrap", "gap-1");
        entryInfoContainerElmt.appendChild(entryInfoCampaignStateContainerElmt);
        let entryInfoCampaignStateElmt = document.createElement("small");
        entryInfoCampaignStateElmt.classList.add("fw-bold", "text-opacity-75");
        if (entryData["campaign_state"] == "ongoing") {
            entryInfoCampaignStateElmt.classList.add("text-success");
        }
        else if (entryData["campaign_state"] == "closed") {
            entryInfoCampaignStateElmt.classList.add("text-danger");
        }
        entryInfoCampaignStateElmt.innerText = `[${entryData["campaign_state"].toUpperCase()}]`;
        entryInfoCampaignStateContainerElmt.appendChild(entryInfoCampaignStateElmt);
        let entryInfoCampaignNameElmt = document.createElement("h6");
        entryInfoCampaignNameElmt.classList.add("fw-bold", "text-break", "ms-2", "mb-0");
        entryInfoCampaignNameElmt.innerText = entryData["campaign_name"];
        entryInfoCampaignStateContainerElmt.appendChild(entryInfoCampaignNameElmt);
        if (isSelected) {
            let entryIsSelectedContainerElmt = document.createElement("div");
            entryInfoContainerElmt.appendChild(entryIsSelectedContainerElmt);
            let entryIsSelectedFormatterElmt = document.createElement("small");
            entryIsSelectedFormatterElmt.classList.add("text-opacity-50", "text-primary", "text-nowrap", "fst-italic");
            entryIsSelectedContainerElmt.appendChild(entryIsSelectedFormatterElmt);
            let entryIsSelectedIconElmt = document.createElement("i");
            entryIsSelectedIconElmt.classList.add("bi", "bi-info-square");
            entryIsSelectedFormatterElmt.appendChild(entryIsSelectedIconElmt);
            let entryIsSelectedTextElmt = document.createElement("span");
            entryIsSelectedTextElmt.innerText = "This campaign is currently selected.";
            entryIsSelectedFormatterElmt.appendChild(entryIsSelectedTextElmt);
        }

        let entryStateContainerElmt = document.createElement("div");
        entryStateContainerElmt.classList.add("d-flex", "flex-sm-column", "gap-sm-0", "gap-3");
        entryContainerElmt.appendChild(entryStateContainerElmt);
        let entryStateTitleContainerElmt = document.createElement("span");
        entryStateContainerElmt.appendChild(entryStateTitleContainerElmt);
        let entryStateTitleElmt = document.createElement("small");
        entryStateTitleElmt.classList.add("fw-bold", "text-nowrap");
        entryStateTitleElmt.innerText = "Service state";
        entryStateTitleContainerElmt.appendChild(entryStateTitleElmt);
        let entryStateElmt = document.createElement("span");
        entryStateElmt.classList.add("fw-bold", "text-opacity-75", "text-sm-end");
        if (Parser.parseBoolOrDefault(entryData["is_enabled"], false)) {
            entryStateElmt.classList.add("text-success");
            entryStateElmt.innerText = "ON";
        }
        else {
            entryStateElmt.classList.add("text-danger");
            entryStateElmt.innerText = "OFF";
        }
        entryStateContainerElmt.appendChild(entryStateElmt);

        return entryElmt;
    }

    refresh() {
        this.#itemsCountElmt.setLoading();
        this.#serviceStatesContainerElmt.innerHTML = "";
        let loadingContainerElmt = document.createElement("div");
        loadingContainerElmt.classList.add("text-center", "p-4", "w-100");
        loadingContainerElmt.appendChild(new Spinner());
        this.#serviceStatesContainerElmt.appendChild(loadingContainerElmt);

        let searchOptions = {
            "campaign_state": this.#campaignStateFilterElmt.value,
            "service_state": this.#serviceStateFilterElmt.value,
        };
        if (this.#campaignNameSearchElmt.value != "") {
            searchOptions["in_campaign_name"] = this.#campaignNameSearchElmt.value;
        }

        if (this.#searchReqID != null) {
            this.#internalAPIRequester.abort(this.#searchReqID);
            this.#searchReqID = null;
        }

        this.#searchReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.services.outlier_data.retrieve_list`, searchOptions),
            (data) => {
                this.#serviceStatesContainerElmt.innerHTML = "";
                if (data.data.length > 0) {
                    for (let row of data.data) {
                        this.#serviceStatesContainerElmt.appendChild(this.#createEntryElement(row));
                    }
                }
                else {
                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noItemElmt.innerText = "No search results";
                    this.#serviceStatesContainerElmt.appendChild(noItemElmt);
                }

                this.#itemsCountElmt.update({firstItem: data.data.length > 0 ? 1 : 0, lastItem: data.data.length}, true);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}


document.addEventListener("DOMContentLoaded", () => {

    let view = new CheckOutlierDataServiceListView();
    view.refresh();

});

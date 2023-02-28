import { InternalAPIRequest } from "../../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../../components/flash.js";
import { flaskES6, signedUser } from "../../../../app.js";
import { Spinner } from "../../../components/spinner.js";
import { TimeseriesChartEnergyConsumption } from "../../../components/charts/tsChartEnergyConsumption.js";
import "../../../components/tree.js";


export class EnergyConsumptionExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;

    #messagesElmt = null;
    #setupBtnElmt = null;
    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;
    #sitesTreeElmt = null;

    #tzName = "UTC";
    #yearRef = null;
    #monthRef = null;
    #maxPastYears = 20;

    #structuralElementType = null;
    #structuralElementId = null;
    #chartByEnergySource = {};

    #previousPeriodType = null;
    #previousYearSelected = null;

    #timeFormatPerPeriodType = {
        "Month-Hourly": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Month-Daily": "{dd} {MMMM} {yyyy}",
        "Year-Monthly": "{MMMM} {yyyy}",
        "Yearly": "{yyyy}",
    };

    constructor(tzName = "UTC", year = null, month = null) {
        this.#tzName = tzName || "UTC";

        let date = new Date();
        this.#yearRef = year || date.getUTCFullYear();
        this.#monthRef = month || date.getUTCMonth() + 1;

        this.#cacheDOM();
        this.#initEventListeners();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#updatePeriodSelect();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#setupBtnElmt = document.getElementById("setupBtn");
        this.#mainChartContainerElmt = document.getElementById("chartContainer");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#periodTypeSelectElmt = document.getElementById("periodType");
        this.#periodMonthSelectElmt = document.getElementById("periodMonth");
        this.#periodYearSelectElmt = document.getElementById("periodYear");
    }

    #initEventListeners() {
        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#structuralElementType = event.detail.type;
            this.#structuralElementId = event.detail.id;
    
            this.#updateConfigBtn();
            this.#generateCharts();
        });

        this.#periodTypeSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePeriodSelect();
            this.#generateCharts();
        });

        this.#periodMonthSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#periodYearSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePreviousYearSelected();
            this.#generateCharts();
        });
    }

    #updatePeriodSelect() {
        if (this.#periodTypeSelectElmt.value == "Yearly") {
            if (this.#previousPeriodType != this.#periodTypeSelectElmt.value) {
                this.#periodYearSelectElmt.innerHTML = "";
                let offsetPastYear = 0;
                let offsetStep = 5;
                let isOptSelected = false;
                while (offsetPastYear <= this.#maxPastYears) {
                    let yearMin = this.#yearRef - (offsetPastYear + offsetStep);
                    let optionElmt = document.createElement("option");
                    optionElmt.value = offsetPastYear + offsetStep;
                    optionElmt.innerText = `Last ${offsetPastYear + offsetStep} years [${this.#yearRef} - ${yearMin}]`;
                    if (!isOptSelected) {
                        isOptSelected = (this.#previousYearSelected != null && this.#previousYearSelected >= yearMin);
                        optionElmt.selected = isOptSelected;
                    }
                    this.#periodYearSelectElmt.appendChild(optionElmt);
                    offsetPastYear += offsetStep;
                }
            }

            this.#periodMonthSelectElmt.classList.add("d-none", "invisible");
            this.#periodYearSelectElmt.classList.remove("d-none", "invisible");
        }
        else {
            if (this.#previousPeriodType == null || this.#previousPeriodType == "Yearly") {
                this.#periodYearSelectElmt.innerHTML = "";
                for (let offsetPastYear = 0 ; offsetPastYear < this.#maxPastYears ; offsetPastYear++) {
                    let year = this.#yearRef - offsetPastYear;
                    let optionElmt = document.createElement("option");
                    optionElmt.value = year.toString();
                    optionElmt.innerText = year.toString();
                    optionElmt.selected = ((this.#previousYearSelected != null && year == this.#previousYearSelected) || offsetPastYear == 0);
                    this.#periodYearSelectElmt.appendChild(optionElmt);
                }
            }

            if (this.#periodTypeSelectElmt.value.startsWith("Month-")) {
                if (this.#previousPeriodType == null) {
                    this.#periodMonthSelectElmt.value = this.#monthRef.toString();
                }
                this.#periodMonthSelectElmt.classList.remove("d-none", "invisible");
            }
            else {
                this.#periodMonthSelectElmt.classList.add("d-none", "invisible");
            }
            this.#periodYearSelectElmt.classList.remove("d-none", "invisible");
        }

        this.#previousPeriodType = this.#periodTypeSelectElmt.value;
        this.#updatePreviousYearSelected();
    }

    #updatePreviousYearSelected() {
        if (this.#periodTypeSelectElmt.value != "Yearly") {
            this.#previousYearSelected = this.#periodYearSelectElmt.value;
        }
    }

    #updateConfigBtn() {
        this.#setupBtnElmt.href = flaskES6.urlFor(
            `analysis.energy_consumption.setup`,
            {
                structural_element_type: this.#structuralElementType,
                structural_element_id: this.#structuralElementId,
            }
        );
        this.#setupBtnElmt.classList.remove("d-none", "invisible");
    }

    #generateCharts() {
        if (this.#structuralElementType != null && this.#structuralElementId != null) {
            for (let chart of Object.values(this.#chartByEnergySource)) {
                chart.dispose();
            }
            this.#chartByEnergySource = {};

            this.#mainChartContainerElmt.innerHTML = "";
            this.#mainChartContainerElmt.appendChild(new Spinner());

            if (this.#retrieveDataReqID != null) {
                this.#internalAPIRequester.abort(this.#retrieveDataReqID);
                this.#retrieveDataReqID = null;
            }
            this.#retrieveDataReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(
                    `api.analysis.energy_consumption.breakdowns.retrieve_brkd`,
                    {
                        structural_element_type: this.#structuralElementType,
                        structural_element_id: this.#structuralElementId,
                        period_type: this.#periodTypeSelectElmt.value,
                        period_month: this.#periodMonthSelectElmt.value,
                        period_year: this.#periodYearSelectElmt.value,
                        year_reference: this.#yearRef,
                        timezone: this.#tzName,
                    }
                ),
                (data) => {
                    this.#mainChartContainerElmt.innerHTML = "";

                    if (Object.keys(data["energy"]).length <= 0) {
                        let colElmt = document.createElement("div");
                        colElmt.classList.add("col", "text-start", "text-muted");

                        let pNoDataElmt = document.createElement("p");
                        pNoDataElmt.classList.add("fst-italic");
                        pNoDataElmt.innerText = "No data available";
                        colElmt.appendChild(pNoDataElmt);

                        let pHelpElmt = document.createElement("p");
                        pHelpElmt.innerText = `Maybe the view is not configured for this ${this.#structuralElementType}.`;
                        colElmt.appendChild(pHelpElmt);

                        if (!signedUser.is_admin) {
                            pHelpElmt.classList.add("mb-0");

                            let pHelpNotAdminElmt = document.createElement("p");
                            pHelpNotAdminElmt.innerText = "Please contact your campaign administrator.";
                            colElmt.appendChild(pHelpNotAdminElmt);
                        }

                        this.#mainChartContainerElmt.appendChild(colElmt);
                    }
                    else {
                        for (let [energySource, energyUses] of Object.entries(data["energy"])) {
                            let energySourceChart = new TimeseriesChartEnergyConsumption();
                            this.#chartByEnergySource[energySource] = energySourceChart;

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.appendChild(energySourceChart);

                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            colElmt.appendChild(chartContainerElmt);

                            this.#mainChartContainerElmt.appendChild(colElmt);

                            energySourceChart.showLoading();
                            energySourceChart.load(data["timestamps"], energySource, energyUses, "Wh", this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value]);
                        }
                    }
                },
                (error) => {
                    this.#mainChartContainerElmt.innerHTML = "";

                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }

    #loadSitesTreeData() {
        this.#sitesTreeElmt.showLoading();

        if (this.#sitesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#sitesTreeReqID);
            this.#sitesTreeReqID = null;
        }

        this.#sitesTreeReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(
                `api.structural_elements.retrieve_tree_sites`,
                {
                    types: ["site", "building"],
                }
            ),
            (data) => {
                this.#sitesTreeElmt.load(data.data);
                this.#sitesTreeElmt.collapseAll();
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    mount() {
        this.#loadSitesTreeData();
    }
}

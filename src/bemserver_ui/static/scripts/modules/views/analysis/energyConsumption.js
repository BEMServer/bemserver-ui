import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartEnergyConsumption } from "/static/scripts/modules/components/charts/tsChartEnergyConsumption.js";
import "/static/scripts/modules/components/tree.js";


export class EnergyConsumptionExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;

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
    #chartByEnergy = {};

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

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
        this.#updatePeriodSelect();
    }

    #cacheDOM() {
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

    #generateCharts() {
        if (this.#structuralElementType != null && this.#structuralElementId != null) {
            for (let chart of Object.values(this.#chartByEnergy)) {
                chart.dispose();
            }
            this.#chartByEnergy = {};

            this.#mainChartContainerElmt.innerHTML = "";
            this.#mainChartContainerElmt.appendChild(new Spinner());

            if (this.#retrieveDataReqID != null) {
                this.#internalAPIRequester.abort(this.#retrieveDataReqID);
                this.#retrieveDataReqID = null;
            }
            this.#retrieveDataReqID = this.#internalAPIRequester.get(
                app.urlFor(
                    `api.analysis.energy_consumption.retrieve_breakdown`,
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

                        if (!app.signedUser.is_admin) {
                            pHelpElmt.classList.add("mb-0");

                            let pHelpNotAdminElmt = document.createElement("p");
                            pHelpNotAdminElmt.innerText = "Please contact your campaign administrator.";
                            colElmt.appendChild(pHelpNotAdminElmt);
                        }

                        this.#mainChartContainerElmt.appendChild(colElmt);
                    }
                    else {
                        for (let [energy, energyUses] of Object.entries(data["energy"])) {
                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            this.#mainChartContainerElmt.appendChild(colElmt);

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.style.height = "500px";
                            colElmt.appendChild(chartContainerElmt);

                            let energyChart = new TimeseriesChartEnergyConsumption(chartContainerElmt);
                            this.#chartByEnergy[energy] = energyChart;

                            energyChart.showLoading();
                            energyChart.load(data["timestamps"], energy, energyUses, "Wh", this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value]);
                            energyChart.hideLoading();
                        }
                    }
                },
                (error) => {
                    this.#mainChartContainerElmt.innerHTML = "";
                    app.flashMessage(error.toString(), "error");
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
            app.urlFor(
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
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    mount() {
        this.#loadSitesTreeData();
    }
}

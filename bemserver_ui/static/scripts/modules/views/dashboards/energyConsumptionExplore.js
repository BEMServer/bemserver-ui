import { InternalAPIRequest } from "../../tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { flaskES6, signedUser } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";
import { TimeseriesEnergyConsumptionChart } from "../../components/tsEnerConsChart.js";


export class EnergyConsumptionExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;

    #messagesElmt = null;
    #dashboardSetupBtnElmt = null;
    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;

    #tzName = "UTC";
    #yearRef = null;
    #monthRef = null;
    #maxPastYears = 20;

    #structuralElementType = null;
    #structuralElementId = null;
    #chartByEnergySource = {};

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
        this.#dashboardSetupBtnElmt = document.getElementById("dashboardSetupBtn");
        this.#mainChartContainerElmt = document.getElementById("chartContainer");

        this.#periodTypeSelectElmt = document.getElementById("periodType");
        this.#periodMonthSelectElmt = document.getElementById("periodMonth");
        this.#periodYearSelectElmt = document.getElementById("periodYear");
    }

    #initEventListeners() {
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

            this.#generateCharts();
        });
    }

    #updatePeriodSelect() {
        if (this.#periodTypeSelectElmt.value == "Month-Daily" || this.#periodTypeSelectElmt.value == "Year-Monthly") {
            this.#periodYearSelectElmt.innerHTML = "";
            for (let offsetPastYear = 0 ; offsetPastYear < this.#maxPastYears ; offsetPastYear++) {
                let year = this.#yearRef - offsetPastYear;
                let optionElmt = document.createElement("option");
                optionElmt.value = year.toString();
                optionElmt.innerText = year.toString();
                this.#periodYearSelectElmt.appendChild(optionElmt);
            }

            if (this.#periodTypeSelectElmt.value == "Month-Daily") {
                this.#periodMonthSelectElmt.value = this.#monthRef.toString();
                this.#periodMonthSelectElmt.classList.remove("d-none", "invisible");
            }
            else {
                this.#periodMonthSelectElmt.classList.add("d-none", "invisible");
            }
        }
        else if (this.#periodTypeSelectElmt.value == "Yearly") {
            this.#periodYearSelectElmt.innerHTML = "";
            let offsetPastYear = 0;
            let offsetStep = 5;
            while (offsetPastYear <= this.#maxPastYears) {
                let optionElmt = document.createElement("option");
                optionElmt.value = offsetPastYear + offsetStep;
                optionElmt.innerText = `Last ${offsetPastYear + offsetStep} years [${this.#yearRef} - ${this.#yearRef - (offsetPastYear + offsetStep)}]`;
                this.#periodYearSelectElmt.appendChild(optionElmt);
                offsetPastYear += offsetStep;
            }

            this.#periodMonthSelectElmt.classList.add("d-none", "invisible");
        }
    }

    #updateConfigBtn() {
        this.#dashboardSetupBtnElmt.href = flaskES6.urlFor(
            `dashboards.energy_consumption.config`,
            {
                structural_element_type: this.#structuralElementType,
                structural_element_id: this.#structuralElementId,
            }
        );
        this.#dashboardSetupBtnElmt.classList.remove("d-none", "invisible");
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
                    `api.analysis.retrieve_energy_consumption`,
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
                        pHelpElmt.innerText = `Maybe the dashboard is not configured for this ${this.#structuralElementType}.`;
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
                        let timestamps = data["timestamps"].map((timestamp) => {
                            if (this.#periodTypeSelectElmt.value == "Month-Daily") {
                                return timestamp.substring(0, 10);
                            }
                            else if (this.#periodTypeSelectElmt.value == "Year-Monthly") {
                                return timestamp.substring(0, 7);
                            }
                            else if (this.#periodTypeSelectElmt.value == "Yearly") {
                                return timestamp.substring(0, 4);
                            }
                            return timestamp;
                        });

                        for (let [energySource, energyUses] of Object.entries(data["energy"])) {
                            let energySourceChart = new TimeseriesEnergyConsumptionChart();
                            this.#chartByEnergySource[energySource] = energySourceChart;

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.appendChild(energySourceChart);

                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            colElmt.appendChild(chartContainerElmt);

                            this.#mainChartContainerElmt.appendChild(colElmt);

                            energySourceChart.showLoading();
                            energySourceChart.load(energySource, energyUses, timestamps);
                        }
                    }
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }

    onTreeSelectItem(strucutalElementId, strucutalElementType) {
        this.#structuralElementType = strucutalElementType;
        this.#structuralElementId = strucutalElementId;

        this.#updateConfigBtn();
        this.#generateCharts();
    }
}

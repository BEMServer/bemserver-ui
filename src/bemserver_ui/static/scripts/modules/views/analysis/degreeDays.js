import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartDegreeDays } from "/static/scripts/modules/components/charts/tsChartDegreeDays.js";
import "/static/scripts/modules/components/tree.js";


class DegreeDaysExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;

    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;
    #sitesTreeElmt = null;
    #ddTypeSelectElmt = null;
    #ddBaseInputElmt = null;
    #ddBaseUnitInputElmt = null;
    #compareOptsContainerElmt = null;
    #comparePeriodSwitchElmt = null;
    #comparePeriodSelectElmt = null;

    #yearRef = null;
    #monthRef = null;
    #maxPastYears = 20;
    #compareMaxPastYears = 5;

    #structuralElementType = null;
    #structuralElementId = null;
    #ddChart = null;

    #previousPeriodType = null;
    #previousYearSelected = null;

    #timeFormatPerPeriodType = {
        "Month-Daily": "{dd} {MMMM} {yyyy}",
        "Year-Monthly": "{MMMM} {yyyy}",
        "Yearly": "{yyyy}",
    };

    constructor(year = null, month = null) {
        let date = new Date();
        this.#yearRef = year || date.getUTCFullYear();
        this.#monthRef = month || date.getUTCMonth() + 1;

        this.#cacheDOM();
        this.#initEventListeners();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#updatePeriodSelect();
        this.#updateCompareOpts();
    }

    #cacheDOM() {
        this.#mainChartContainerElmt = document.getElementById("chartContainer");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#periodTypeSelectElmt = document.getElementById("periodType");
        this.#periodMonthSelectElmt = document.getElementById("periodMonth");
        this.#periodYearSelectElmt = document.getElementById("periodYear");
        this.#ddTypeSelectElmt = document.getElementById("ddType");
        this.#ddBaseInputElmt = document.getElementById("ddBase");
        this.#ddBaseUnitInputElmt = document.getElementById("ddBaseUnit");

        this.#compareOptsContainerElmt = document.getElementById("compareOptsContainer");
        this.#comparePeriodSwitchElmt = document.getElementById("comparePeriodSwitch");
        this.#comparePeriodSelectElmt = document.getElementById("comparePeriod");
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
            this.#updateCompareOpts();
            this.#generateCharts();
        });

        this.#periodMonthSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#periodYearSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePreviousYearSelected();
            this.#updateCompareOpts();
            this.#generateCharts();
        });

        this.#ddTypeSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#ddBaseInputElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#ddBaseUnitInputElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#comparePeriodSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            if (this.#comparePeriodSwitchElmt.checked) {
                this.#comparePeriodSelectElmt.removeAttribute("disabled");
            }
            else {
                this.#comparePeriodSelectElmt.setAttribute("disabled", true);
            }
            this.#generateCharts();
        });

        this.#comparePeriodSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

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

    #updateCompareOpts() {
        if (this.#periodTypeSelectElmt.value == "Year-Monthly") {
            let previousSelectedIndex = this.#comparePeriodSelectElmt.selectedIndex;

            this.#comparePeriodSelectElmt.innerHTML = "";
            for (let offsetPastYear = 1 ; offsetPastYear <= this.#compareMaxPastYears ; offsetPastYear++) {
                let optionElmt = document.createElement("option");
                optionElmt.value = offsetPastYear.toString();
                optionElmt.innerText = `${offsetPastYear > 1 ? `last ${offsetPastYear.toString()} years` : "last year"} [${this.#periodYearSelectElmt.value} - ${this.#periodYearSelectElmt.value - offsetPastYear}]`;
                optionElmt.selected = (offsetPastYear - 1 == previousSelectedIndex) || offsetPastYear == 1;
                this.#comparePeriodSelectElmt.appendChild(optionElmt);
            }

            this.#compareOptsContainerElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#comparePeriodSwitchElmt.checked = false;
            this.#compareOptsContainerElmt.classList.add("d-none", "invisible");
        }
    }

    #updatePreviousYearSelected() {
        if (this.#periodTypeSelectElmt.value != "Yearly") {
            this.#previousYearSelected = this.#periodYearSelectElmt.value;
        }
    }

    #showNoDataPanel() {
        let colElmt = document.createElement("div");
        colElmt.classList.add("text-start", "text-muted", "w-50", "mx-auto");

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

        let btnReloadElmt = document.createElement("button");
        btnReloadElmt.classList.add("btn", "btn-sm", "btn-outline-primary");
        btnReloadElmt.setAttribute("type", "button");
        colElmt.appendChild(btnReloadElmt);

        let btnReloadIconElmt = document.createElement("i");
        btnReloadIconElmt.classList.add("bi", "bi-arrow-clockwise", "me-1");
        btnReloadElmt.appendChild(btnReloadIconElmt);

        let btnReloadTextElmt = document.createElement("span");
        btnReloadTextElmt.innerText = "Reload";
        btnReloadElmt.appendChild(btnReloadTextElmt);

        btnReloadElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#mainChartContainerElmt.appendChild(colElmt);
    }

    #generateCharts() {
        if (this.#structuralElementType != null && this.#structuralElementId != null) {
            if (this.#ddChart != null) {
                this.#ddChart.dispose();
                this.#ddChart = null;
            }

            this.#mainChartContainerElmt.innerHTML = "";
            this.#mainChartContainerElmt.appendChild(new Spinner());

            if (this.#retrieveDataReqID != null) {
                this.#internalAPIRequester.abort(this.#retrieveDataReqID);
                this.#retrieveDataReqID = null;
            }
            let compareOpts = {};
            if (this.#comparePeriodSwitchElmt.checked) {
                compareOpts["compare_year_period"] = this.#comparePeriodSelectElmt.value;
            }
            this.#retrieveDataReqID = this.#internalAPIRequester.get(
                app.urlFor(
                    `api.analysis.degree_days.retrieve`,
                    {
                        site_id: this.#structuralElementId,
                        period_type: this.#periodTypeSelectElmt.value,
                        period_month: this.#periodMonthSelectElmt.value,
                        period_year: this.#periodYearSelectElmt.value,
                        year_reference: this.#yearRef,
                        dd_type: this.#ddTypeSelectElmt.value,
                        dd_base: this.#ddBaseInputElmt.value,
                        dd_base_unit: this.#ddBaseUnitInputElmt.value,
                        ...compareOpts,
                    },
                ),
                (data) => {
                    this.#mainChartContainerElmt.innerHTML = "";

                    if (Object.keys(data["degree_days"]).length <= 0) {
                        this.#showNoDataPanel();
                    }
                    else {
                        let chartContainerElmt = document.createElement("div");
                        chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                        chartContainerElmt.style.height = "500px";
                        this.#mainChartContainerElmt.appendChild(chartContainerElmt);

                        this.#ddChart = new TimeseriesChartDegreeDays(chartContainerElmt);
                        this.#ddChart.showLoading();
                        this.#ddChart.load(data["degree_days"], this.#ddTypeSelectElmt.value, this.#ddBaseInputElmt.value, this.#ddBaseUnitInputElmt.value, data["dd_unit"], this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value], this.#comparePeriodSwitchElmt.checked, data["dd_categories"]);
                        this.#ddChart.hideLoading();
                    }
                },
                (error) => {
                    this.#mainChartContainerElmt.innerHTML = "";
                    this.#showNoDataPanel();

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
            app.urlFor(`api.structural_elements.retrieve_tree_sites`, { types: ["site"] }),
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


document.addEventListener("DOMContentLoaded", () => {
    let view = new DegreeDaysExploreView();
    view.mount();
});

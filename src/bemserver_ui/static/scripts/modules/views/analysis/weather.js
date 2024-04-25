import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartWeather} from "/static/scripts/modules/components/charts/tsChartWeather.js";
import "/static/scripts/modules/components/tree.js";
import { TimeCalendar, TimeDisplay } from "/static/scripts/modules/tools/time.js";


export class WeatherExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;

    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodDaySelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;
    #sitesTreeElmt = null;

    #forecastSwitchElmt = null;
    #forecastWrapperElmt = null;

    #tzName = "UTC";
    #yearRef = null;
    #monthRef = null;
    #dayRef = null;
    #maxPastYears = 20;
    #forecastNbDays = 5;

    #structuralElementType = null;
    #structuralElementId = null;
    #chartWeather = {};

    #previousPeriodType = null;
    #previousDaySelected = null;
    #previousYearSelected = null;

    #timeFormatPerPeriodType = {
        "Day-Minute": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Week-Hourly": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Month-Hourly": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Year-Daily": "{dd} {MMMM} {yyyy}",
        "Last-Day": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Last-Week": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Last-Month": "{dd} {MMMM} {yyyy} {HH}:{mm}",
        "Last-Year": "{dd} {MMMM} {yyyy}",
    };

    constructor(tzName = "UTC", forecastNbDays = 5, year = null, month = null) {
        this.#tzName = tzName || "UTC";
        this.#forecastNbDays = forecastNbDays;

        let date = new Date();
        this.#yearRef = year || date.getUTCFullYear();
        this.#monthRef = month || date.getUTCMonth() + 1;
        this.#dayRef = date.getDate();

        this.#cacheDOM();
        this.#initEventListeners();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#updatePeriodSelect();
    }

    #cacheDOM() {
        this.#mainChartContainerElmt = document.getElementById("chartContainer");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#periodTypeSelectElmt = document.getElementById("periodType");
        this.#periodDaySelectElmt = document.getElementById("periodDay");
        this.#periodMonthSelectElmt = document.getElementById("periodMonth");
        this.#periodYearSelectElmt = document.getElementById("periodYear");
        this.#forecastSwitchElmt = document.getElementById("forecastSwitch");
        this.#forecastWrapperElmt = document.getElementById("forecastWrapper");
    }

    #initEventListeners() {
        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#structuralElementType = event.detail.type;
            this.#structuralElementId = event.detail.id;
    
            this.#generateCharts();
        });

        this.#forecastSwitchElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#generateCharts();
        });

        this.#periodTypeSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePeriodSelect();
            this.#generateCharts();
        });

        this.#periodDaySelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#previousDaySelected = this.#periodDaySelectElmt.value;
            this.#generateCharts();
        });
        
        this.#periodMonthSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();
            
            this.#updateDaysInMonth(this.#periodYearSelectElmt.value, this.#periodMonthSelectElmt.value, this.#previousDaySelected);
            this.#previousDaySelected = this.#periodDaySelectElmt.value;
            this.#generateCharts();
        });

        this.#periodYearSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateDaysInMonth(this.#periodYearSelectElmt.value, this.#periodMonthSelectElmt.value, this.#previousDaySelected);
            this.#previousDaySelected = this.#periodDaySelectElmt.value;
            this.#previousYearSelected = this.#periodYearSelectElmt.value;
            this.#generateCharts();
        });
    }

    #updatePeriodSelect() {
        if (this.#previousPeriodType == null) {
            this.#periodYearSelectElmt.innerHTML = "";
            for (let year = this.#yearRef; year >= this.#yearRef - this.#maxPastYears; year--) {
                let option = document.createElement("option");
                option.value = year;
                option.textContent = year;
                option.selected = year == this.#yearRef;
                this.#periodYearSelectElmt.appendChild(option);
            }

            this.#periodMonthSelectElmt.innerHTML = "";
            for (let month = 1; month <= 12; month++) {
                let option = document.createElement("option");
                option.value = month;
                option.textContent = TimeDisplay.getMonthName(month);
                option.selected = month == this.#monthRef;
                this.#periodMonthSelectElmt.appendChild(option);
            }

            this.#updateDaysInMonth(this.#yearRef, this.#monthRef, this.#dayRef);
        }

        if (this.#periodTypeSelectElmt.value.startsWith("Month")) {
            if (this.#previousPeriodType == null) {
                this.#periodMonthSelectElmt.value = this.#monthRef.toString();
            }
            this.#periodMonthSelectElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#periodMonthSelectElmt.classList.add("d-none", "invisible");
        }

        if (this.#periodTypeSelectElmt.value.startsWith("Day") || this.#periodTypeSelectElmt.value.startsWith("Week")) {
            if (this.#previousPeriodType == null) {
                this.#periodDaySelectElmt.value = this.#dayRef.toString();
            }
            this.#periodDaySelectElmt.classList.remove("d-none", "invisible");
            this.#periodMonthSelectElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#periodDaySelectElmt.classList.add("d-none", "invisible");
        }

        if (this.#periodTypeSelectElmt.value.startsWith("Last") ) {
            this.#periodYearSelectElmt.classList.add("d-none", "invisible");
            this.#forecastWrapperElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#periodYearSelectElmt.classList.remove("d-none", "invisible");
            this.#forecastWrapperElmt.classList.add("d-none", "invisible");
            this.#forecastSwitchElmt.checked = false;
        }

        this.#previousPeriodType = this.#periodTypeSelectElmt.value;
        this.#previousDaySelected = this.#periodDaySelectElmt.value;
        this.#previousYearSelected = this.#periodYearSelectElmt.value;
    }

    #updateDaysInMonth(year, month, dayToSelect) {
        this.#periodDaySelectElmt.innerHTML = "";
        let daysInMonth = TimeCalendar.getDaysInMonth(year, month);
        let dayToSelectAdjusted = Math.min(dayToSelect, daysInMonth);
        for (let day = 1; day <= daysInMonth; day++) {
            let option = document.createElement("option");
            option.value = day;
            option.textContent = day;
            option.selected = day == dayToSelectAdjusted;
            this.#periodDaySelectElmt.appendChild(option);
        }
    }

    #updateTsInfoModal(chartName, dataset) {
        let tsInfoModalChartNameElmt = document.getElementById("tsInfoModalChartName");
        tsInfoModalChartNameElmt.textContent = chartName;

        let weatherTypes = ["current", "forecast"];
        for (let weatherType of weatherTypes) {
            let tabElmt = document.getElementById(`${weatherType}-tab`);
            let tabContentElmt = document.getElementById(`${weatherType}-tabcontent`);
            tabContentElmt.innerHTML = "";

            if (weatherType == "current") {
                let bsTab = new bootstrap.Tab(tabElmt);
                bsTab.show();
            }
            else if (weatherType == "forecast") {
                if (this.#forecastSwitchElmt.checked) {
                    tabElmt.classList.remove("disabled");
                }
                else {
                    tabElmt.classList.add("disabled");
                }
            }

            let tabContentContainerElmt = document.createElement("div");
            tabContentContainerElmt.classList.add("vstack", "gap-3");
            tabContentElmt.appendChild(tabContentContainerElmt);

            for (let weatherParam of Object.values(dataset)) { 
                let weatherParamData = weatherParam[weatherType];

                let paramContainerElmt = document.createElement("div");
                tabContentContainerElmt.appendChild(paramContainerElmt);

                let paramName = document.createElement("h6");
                paramName.classList.add("fw-bold");
                paramName.textContent = weatherParamData.name;
                paramContainerElmt.appendChild(paramName);

                let tsDescription = document.createElement("small");
                tsDescription.classList.add("text-muted");
                tsDescription.textContent = weatherParamData.timeseries.description;
                paramContainerElmt.appendChild(tsDescription);

                let row = document.createElement("div");
                row.classList.add("row");
                paramContainerElmt.appendChild(row);

                let col1 = document.createElement("div");
                col1.classList.add("col");
                row.appendChild(col1);

                let tsName = document.createElement("span");
                if (weatherParamData.timeseries.id != null) {
                    tsName.textContent = `${weatherParamData.timeseries.name}${weatherParamData.timeseries.unit_symbol != null ? ` [${weatherParamData.timeseries.unit_symbol}]` : ""}`;
                }
                else {
                    tsName.classList.add("fst-italic", "text-warning");
                    tsName.textContent = "No timeseries linked to this parameter";
                }
                col1.appendChild(tsName);

                if (app.signedUser.is_admin && weatherParamData.timeseries.id != null) {
                    let col2 = document.createElement("div");
                    col2.classList.add("col", "hstack", "gap-2");
                    row.appendChild(col2);

                    let id = document.createElement("span");
                    id.textContent = "ID";
                    id.classList.add("fw-bold");
                    col2.appendChild(id);

                    let idValue = document.createElement("span");
                    idValue.textContent = weatherParamData.timeseries.id;
                    col2.appendChild(idValue);
                }
            }
        }

        let tsInfoModal = new bootstrap.Modal("#tsInfoModal");
        tsInfoModal.show();
    }

    #generateCharts() {
        if (this.#structuralElementType != null && this.#structuralElementId != null) {
            for (let chart of Object.values(this.#chartWeather)) {
                chart.dispose();
            }
            this.#chartWeather = {};

            this.#mainChartContainerElmt.innerHTML = "";
            this.#mainChartContainerElmt.appendChild(new Spinner());

            if (this.#retrieveDataReqID != null) {
                this.#internalAPIRequester.abort(this.#retrieveDataReqID);
                this.#retrieveDataReqID = null;
            }

            this.#retrieveDataReqID = this.#internalAPIRequester.get(
                app.urlFor(
                    `api.analysis.weather.retrieve`,
                    {
                        site_id: this.#structuralElementId,
                        period_type: this.#periodTypeSelectElmt.value,
                        period_day: this.#periodDaySelectElmt.value,
                        period_month: this.#periodMonthSelectElmt.value,
                        period_year: this.#periodYearSelectElmt.value,
                        timezone: this.#tzName,
                        forecast: this.#forecastSwitchElmt.checked ? this.#forecastNbDays : 0,
                    }
                ),
                (data) => {
                    this.#mainChartContainerElmt.innerHTML = "";
                    if (data == null || data.length == 0) {
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
                        for (let [name, dataset] of Object.entries(data)) {
                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            this.#mainChartContainerElmt.appendChild(colElmt);

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.style.height = "500px";
                            colElmt.appendChild(chartContainerElmt);

                            let weatherChart = new TimeseriesChartWeather(chartContainerElmt);
                            this.#chartWeather[name] = weatherChart;

                            weatherChart.showLoading();
                            weatherChart.load(name, dataset, this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value], () => { this.#updateTsInfoModal(name, dataset)});
                            weatherChart.hideLoading();
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
                    types: ["site"],
                }
            ),
            (data) => {
                this.#sitesTreeElmt.load(data.data);
                this.#sitesTreeElmt.collapseAll();

                if (data.data.length > 0) {
                    this.#sitesTreeElmt.select(data.data[0].node_id);
                }
                else {
                    app.flashMessage("No site available in this campaign", "warning", 10);

                    this.#periodTypeSelectElmt.setAttribute("disabled", true);
                    this.#forecastSwitchElmt.setAttribute("disabled", true);
                }
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

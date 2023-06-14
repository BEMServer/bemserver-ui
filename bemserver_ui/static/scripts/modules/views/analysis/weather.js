import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "/static/scripts/modules/components/flash.js";
import { flaskES6, signedUser } from "/static/scripts/app.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartWeather} from "/static/scripts/modules/components/charts/tsChartWeather.js";
import "/static/scripts/modules/components/tree.js";
import { TimeCalendar } from "/static/scripts/modules/tools/time.js";

export class WeatherExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;

    #messagesElmt = null;
    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodDaySelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;
    #sitesTreeElmt = null;

    #forecast = null;
    #forecastWrapper = null;

    #tzName = "UTC";
    #yearRef = null;
    #monthRef = null;
    #dayRef = null;
    #maxPastYears = 20;

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

    constructor(tzName = "UTC", year = null, month = null) {
        this.#tzName = tzName || "UTC";

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
        this.#messagesElmt = document.getElementById("messages");
        this.#mainChartContainerElmt = document.getElementById("chartContainer");

        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#periodTypeSelectElmt = document.getElementById("periodType");
        this.#periodDaySelectElmt = document.getElementById("periodDay");
        this.#periodMonthSelectElmt = document.getElementById("periodMonth");
        this.#periodYearSelectElmt = document.getElementById("periodYear");
        this.#forecast = document.getElementById("forecastSwitch");
        this.#forecastWrapper = document.getElementById("forecastWrapper");
    }

    #initEventListeners() {
        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#structuralElementType = event.detail.type;
            this.#structuralElementId = event.detail.id;
    
            this.#generateCharts();
        });

        this.#forecast.addEventListener("change", (event) => {
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
            
            this.#updateDaysInMonth();
            this.#previousDaySelected = this.#periodDaySelectElmt.value;
            this.#generateCharts();
        });

        this.#periodYearSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateDaysInMonth();
            this.#previousDaySelected = this.#periodDaySelectElmt.value;
            this.#previousYearSelected = this.#periodYearSelectElmt.value;
            this.#generateCharts();
        });
    }

    #getMonthName(month) {
        const date = new Date();
        date.setMonth(month - 1);

        return date.toLocaleString([], { month: "long" });
    }

    #updatePeriodSelect() {
        if (this.#previousPeriodType == null) {
            this.#periodYearSelectElmt.innerHTML = "";
            for (let year = this.#yearRef; year >= this.#yearRef - this.#maxPastYears; year--) {
                let option = document.createElement("option");
                option.value = year;
                option.textContent = year;
                this.#periodYearSelectElmt.appendChild(option);
            }

            this.#periodMonthSelectElmt.innerHTML = "";
            for (let month = 1; month <= 12; month++) {
                let option = document.createElement("option");
                option.value = month;
                option.textContent = this.#getMonthName(month);
                if(month == this.#monthRef){
                    option.selected = true;
                }
                this.#periodMonthSelectElmt.appendChild(option);
            }

            this.#periodDaySelectElmt.innerHTML = "";
            const daysInMonth = TimeCalendar.getDaysInMonth(this.#yearRef, this.#monthRef);
            for (let day = 1; day <= new Date(this.#yearRef, daysInMonth, 0).getDate() ; day++) {
                let option = document.createElement("option");
                option.value = day;
                option.textContent = day;
                if(day == this.#dayRef){
                    option.selected = true;
                }
                this.#periodDaySelectElmt.appendChild(option);
            }
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
            this.#forecastWrapper.classList.remove("d-none", "invisible");
        }
        else {
            this.#periodYearSelectElmt.classList.remove("d-none", "invisible");
            this.#forecastWrapper.classList.add("d-none", "invisible");
            this.#forecast.checked = false;
        }

        this.#previousPeriodType = this.#periodTypeSelectElmt.value;
        this.#previousDaySelected = this.#periodDaySelectElmt.value;
        this.#previousYearSelected = this.#periodYearSelectElmt.value;
    }

    #updateDaysInMonth() {
        const daysInMonth = TimeCalendar.getDaysInMonth(this.#periodYearSelectElmt.value, this.#periodMonthSelectElmt.value);
        this.#periodDaySelectElmt.innerHTML = "";

        for (let day = 1; day <= daysInMonth; day++) {
            let option = document.createElement("option");
            option.value = day;
            option.textContent = day;
            if(day == this.#previousDaySelected){
                option.selected = true;
            }
            this.#periodDaySelectElmt.appendChild(option);
        }
    }

    #updateTsInfoModal(dataset, forecast, is_admin) {
        let tsInfoModal = new bootstrap.Modal(document.getElementById("tsInfoModal"));
        tsInfoModal.show();

        let types = ["current", "forecast"];

        if (!forecast) {
            if (document.getElementById('forecast-tab').classList.contains('active')) {
                document.getElementById('current-tab').classList.add('active');
                document.getElementById('current').classList.add('show', 'active');
                document.getElementById('forecast-tab').classList.remove('active');
                document.getElementById('forecast').classList.remove('show', 'active');
            }
            document.getElementById('forecast-tab').classList.add('disabled');
        }
        else {
            document.getElementById('forecast-tab').classList.remove('disabled');
        }

        for (let type of types) {
            let tabContent = document.getElementById(type);
            tabContent.innerHTML = "";

            for (let [_key, value] of Object.entries(dataset)) { 
                let tsName = document.createElement("h5");
                tsName.classList.add("fw-bold", "mt-3");
                tsName.textContent = value[type].name;
                tabContent.appendChild(tsName);

                let tsDescription = document.createElement("p");
                tsDescription.classList.add("fw-small");
                tsDescription.textContent = value[type].timeseries.description;
                tabContent.appendChild(tsDescription);

                let row = document.createElement("div");
                row.classList.add("row");

                let col1 = document.createElement("div");
                col1.classList.add("col");

                let periodValue = document.createElement("span");
                periodValue.classList.add("fw-normal");
                periodValue.textContent = value[type].timeseries.name? value[type].timeseries.name + " [" + value[type].timeseries.unit_symbol + "]" : "No link for this parameter";
                col1.appendChild(periodValue);
                row.appendChild(col1);

                if (is_admin) {
                    let col2 = document.createElement("div");
                    col2.classList.add("col");

                    let id = document.createElement("p");
                    id.textContent = "ID: ";
                    id.classList.add("fw-bold");

                    let idValue = document.createElement("span");
                    idValue.classList.add("fw-normal");
                    idValue.textContent = value[type].timeseries.id;
                    id.appendChild(idValue);
                    col2.appendChild(id);
                    row.appendChild(col2);
                }
                tabContent.appendChild(row);
            }
        }
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
                flaskES6.urlFor(
                    `api.analysis.weather.retrieve`,
                    {
                        site_id: this.#structuralElementId,
                        period_type: this.#periodTypeSelectElmt.value,
                        period_day: this.#periodDaySelectElmt.value,
                        period_month: this.#periodMonthSelectElmt.value,
                        period_year: this.#periodYearSelectElmt.value,
                        timezone: this.#tzName,
                        forecast: this.#forecast.checked,
                    }
                ),
                (data) => {
                    this.#mainChartContainerElmt.innerHTML = "";
                    if ( data == null || data.length == 0) {
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
                        for (let [name, dataset] of Object.entries(data)) {
                            let weatherChart = new TimeseriesChartWeather();

                            this.#chartWeather[name] = weatherChart;

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.appendChild(weatherChart);

                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            colElmt.appendChild(chartContainerElmt);

                            this.#mainChartContainerElmt.appendChild(colElmt);

                            weatherChart.showLoading();
                            weatherChart.load(name, dataset, this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value], () => { this.#updateTsInfoModal(dataset, this.#forecast.checked, signedUser.is_admin)});
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
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.WARNING, text: "No site available in this campaign", isDismissible: false, isTimed: false});
                    this.#messagesElmt.appendChild(flashMsgElmt);

                    document.querySelector("#periodType").disabled = true;
                    document.querySelector("#forecastSwitch").disabled = true;
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
    }
}
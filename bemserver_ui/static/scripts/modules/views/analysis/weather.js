import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { FlashMessageTypes, FlashMessage } from "/static/scripts/modules/components/flash.js";
import { flaskES6, signedUser } from "/static/scripts/app.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartWeather} from "/static/scripts/modules/components/charts/tsChartWeather.js";
import "/static/scripts/modules/components/tree.js";


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
    #chartByEnergy = {};

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

    #monthNames = [
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "Octobre", "November", "December"
    ]

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
                option.textContent = this.#monthNames[month - 1];
                if(month == this.#monthRef){
                    option.selected = true;
                }
                this.#periodMonthSelectElmt.appendChild(option);
            }

            this.#periodDaySelectElmt.innerHTML = "";
            let monthRef = this.#monthRef;
            if (this.#monthRef == 2 && this.#yearRef % 4 == 0) {
                monthRef = 29;
            }
            else if (this.#monthRef == 2) {
                monthRef = 28;
            }
            for (let day = 1; day <= new Date(this.#yearRef, monthRef, 0).getDate() ; day++) {
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
        }

        this.#previousPeriodType = this.#periodTypeSelectElmt.value;
        this.#previousDaySelected = this.#periodDaySelectElmt.value;
        this.#previousYearSelected = this.#periodYearSelectElmt.value;
    }

    #updateDaysInMonth() {
        let daysInMonth = new Date(this.#periodYearSelectElmt.value, this.#periodMonthSelectElmt.value, 0).getDate();
        this.#periodDaySelectElmt.innerHTML = "";
        if(this.#periodMonthSelectElmt.value == 2 && this.#periodYearSelectElmt.value % 4 == 0){
            daysInMonth = 29;
        }

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
                flaskES6.urlFor(
                    `api.analysis.weather.retrieve`,
                    {
                        structural_element_type: this.#structuralElementType,
                        site_id: this.#structuralElementId,
                        period_type: this.#periodTypeSelectElmt.value,
                        period_day: this.#periodDaySelectElmt.value,
                        period_month: this.#periodMonthSelectElmt.value,
                        period_year: this.#periodYearSelectElmt.value,
                        year_reference: this.#yearRef,
                        timezone: this.#tzName,
                        forecast: this.#forecast.checked,
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
                        for (let [energy, energyUses] of Object.entries(data["energy"])) {
                            let weatherChart = new TimeseriesChartWeather();
                            this.#chartByEnergy[energy] = weatherChart;

                            let chartContainerElmt = document.createElement("div");
                            chartContainerElmt.classList.add("border", "border-1", "rounded", "justify-content-center", "bg-white", "p-2");
                            chartContainerElmt.appendChild(weatherChart);

                            let colElmt = document.createElement("div");
                            colElmt.classList.add("col");
                            colElmt.appendChild(chartContainerElmt);

                            this.#mainChartContainerElmt.appendChild(colElmt);

                            let parameters = {
                                title : "Weather data",
                                type : "line",
                                unit : [],
                            }

                            if (energy == "Solar radiation") {
                                parameters["unit"] = ["W/m²"];
                            }
                            else if (energy == "Outdoor conditions") {
                                for (let [key, value] of Object.entries(data["energy"]["Outdoor conditions"])) {
                                    if (key.includes("temperature")) {
                                        parameters["unit"].push("°C");
                                    }
                                    else if (key.includes("humidity")) {
                                        parameters["unit"].push("%");
                                    }
                                }
                            }
                            weatherChart.showLoading();
                            weatherChart.load(data["timestamps"], energy, energyUses, this.#timeFormatPerPeriodType[this.#periodTypeSelectElmt.value], parameters);
                            
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

                this.#sitesTreeElmt.select("site-1");
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

import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesChartWeather} from "/static/scripts/modules/components/charts/tsChartWeather.js";
import "/static/scripts/modules/components/tree.js";
import { DateTime, TimeInfo } from "/static/scripts/modules/tools/time.js";
import "/static/scripts/modules/components/time/datetimePicker.js";


export class WeatherExploreView {

    #internalAPIRequester = null;
    #retrieveDataReqID = null;
    #sitesTreeReqID = null;
    #hasSiteCoordReqId = null;
    #getWeatherDataSemanticsReqId = null;

    #mainChartContainerElmt = null;
    #periodTypeSelectElmt = null;
    #periodDaySelectElmt = null;
    #periodMonthSelectElmt = null;
    #periodYearSelectElmt = null;
    #sitesTreeElmt = null;

    #forecastSwitchElmt = null;
    #forecastWrapperElmt = null;

    #fetchWeatherDataShowModalBtnElmt = null;
    #fetchWeatherDataModalElmt = null;
    #fetchWeatherDataModal = null;
    #fetchWeatherDataModalBodyElmt = null;
    #fetchWeatherDataSiteElmt = null;
    #fetchWeatherDataSiteCoordWarnContainerElmt = null;
    #fetchWeatherDataEditSiteLnkElmt = null;
    #fetchWeatherDataForecastSwitchElmt = null;
    #fetchWeatherDataDatetimeStartElmt = null;
    #fetchWeatherDataDatetimeEndElmt = null;
    #fetchWeatherDataModalParamsContainerElmt = null;
    #fetchWeatherDataBtnElmt = null;

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

    #timeDisplayModePerPeriodType = {
        "Day-Minute": "iso",
        "Week-Hourly": "iso",
        "Month-Hourly": "iso",
        "Year-Daily": "date",
        "Last-Day": "iso",
        "Last-Week": "iso",
        "Last-Month": "iso",
        "Last-Year": "date",
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

        this.#fetchWeatherDataShowModalBtnElmt = document.getElementById("fetchWeatherDataShowModalBtn");
        this.#fetchWeatherDataModalElmt = document.getElementById("fetchWeatherDataModal");
        this.#fetchWeatherDataModal = new bootstrap.Modal(this.#fetchWeatherDataModalElmt);
        this.#fetchWeatherDataModalBodyElmt = document.getElementById("fetchWeatherDataModalBody");
        this.#fetchWeatherDataSiteElmt = document.getElementById("fetchWeatherDataSite");
        this.#fetchWeatherDataSiteCoordWarnContainerElmt = document.getElementById("fetchWeatherDataSiteCoordWarnContainer");
        this.#fetchWeatherDataEditSiteLnkElmt = document.getElementById("fetchWeatherDataEditSiteLnk");
        this.#fetchWeatherDataForecastSwitchElmt = document.getElementById("fetchWeatherDataForecastSwitch");
        this.#fetchWeatherDataDatetimeStartElmt = document.getElementById("fetchWeatherDataDatetimeStart");
        this.#fetchWeatherDataDatetimeEndElmt = document.getElementById("fetchWeatherDataDatetimeEnd");
        this.#fetchWeatherDataModalParamsContainerElmt = document.getElementById("fetchWeatherDataModalParamsContainer");
        this.#fetchWeatherDataBtnElmt = document.getElementById("fetchWeatherDataBtn");
    }

    #initEventListeners() {
        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#structuralElementType = event.detail.type;
            this.#structuralElementId = event.detail.id;

            if (this.#structuralElementType == "site") {
                this.#fetchWeatherDataShowModalBtnElmt?.classList.remove("disabled");
                this.#fetchWeatherDataShowModalBtnElmt?.removeAttribute("aria-disabled");
            }
            else {
                this.#fetchWeatherDataShowModalBtnElmt?.classList.add("disabled");
                this.#fetchWeatherDataShowModalBtnElmt?.setAttribute("aria-disabled", true);
            }

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

        this.#fetchWeatherDataForecastSwitchElmt?.addEventListener("change", () => {
            this.#updateFetchWeatherDataMapping(this.#fetchWeatherDataForecastSwitchElmt.checked);
        });

        this.#fetchWeatherDataDatetimeStartElmt?.addEventListener("datetimeChange", () => {
            this.#fetchWeatherDataDatetimeEndElmt.dateMin = this.#fetchWeatherDataDatetimeStartElmt.date;
            this.#updateFetchWeatherDataBtn();
        });

        this.#fetchWeatherDataDatetimeEndElmt?.addEventListener("datetimeChange", () => {
            this.#fetchWeatherDataDatetimeStartElmt.dateMax = this.#fetchWeatherDataDatetimeEndElmt.date;
            this.#updateFetchWeatherDataBtn();
        });

        this.#fetchWeatherDataModalElmt?.addEventListener("show.bs.modal", () => {
            this.#fetchWeatherDataForecastSwitchElmt.checked = false;
            this.#fetchWeatherDataDatetimeStartElmt.reset();
            this.#fetchWeatherDataDatetimeStartElmt.focus();
            this.#fetchWeatherDataDatetimeEndElmt.reset();
            this.#updateFetchWeatherDataMapping(this.#fetchWeatherDataForecastSwitchElmt.checked);

            this.#checkSiteHasCoordinates(this.#structuralElementId, () => {
                this.#updateFetchWeatherDataBtn();
            });
        });

        this.#fetchWeatherDataBtnElmt?.addEventListener("click", () => {
            if (this.#structuralElementType != "site" || !this.#fetchWeatherDataDatetimeStartElmt.isValid || !this.#fetchWeatherDataDatetimeEndElmt.isValid) return;

            this.#fetchWeatherDataBtnElmt.classList.add("placeholder");
            this.#fetchWeatherDataModalBodyElmt.classList.add("placeholder");

            this.#internalAPIRequester.put(
                app.urlFor(`api.structural_elements.fetch_weather_data`, {id: this.#structuralElementId}),
                {
                    "start_date": this.#fetchWeatherDataDatetimeStartElmt.date,
                    "start_time": this.#fetchWeatherDataDatetimeStartElmt.time,
                    "end_date": this.#fetchWeatherDataDatetimeEndElmt.date,
                    "end_time": this.#fetchWeatherDataDatetimeEndElmt.time,
                },
                null,
                () => {
                    app.flashMessage(`Weather data successfully fetched.`, "success", 5);

                    this.#fetchWeatherDataBtnElmt.classList.remove("placeholder");
                    this.#fetchWeatherDataModalBodyElmt.classList.remove("placeholder");
                    this.#fetchWeatherDataModal.hide();
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");

                    this.#fetchWeatherDataBtnElmt.classList.remove("placeholder");
                    this.#fetchWeatherDataModalBodyElmt.classList.remove("placeholder");
                    this.#fetchWeatherDataModal.hide();
                },
            );
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
            for (let [index, monthName] of Object.entries(TimeInfo.months())) {
                let monthNumber = +index + 1;
                let option = document.createElement("option");
                option.value = monthNumber;
                option.textContent = monthName;
                option.selected = monthNumber == this.#monthRef;
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
        let daysInMonth = DateTime.local(+year, +month).daysInMonth;
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
                tsDescription.classList.add("text-muted", "multiline");
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

    #updateFetchWeatherDataBtn() {
        if (!this.#fetchWeatherDataSiteCoordWarnContainerElmt.classList.contains("d-none") || !this.#fetchWeatherDataDatetimeStartElmt.isValid || !this.#fetchWeatherDataDatetimeEndElmt.isValid) {
            this.#fetchWeatherDataBtnElmt.setAttribute("disabled", true);
        }
        else {
            this.#fetchWeatherDataBtnElmt.removeAttribute("disabled");
        }
    }

    #updateFetchWeatherDataMapping(forecast = false) {
        this.#fetchWeatherDataModalParamsContainerElmt.innerHTML = "";
        this.#fetchWeatherDataModalParamsContainerElmt.appendChild(new Spinner());

        if (this.#getWeatherDataSemanticsReqId != null) {
            this.#internalAPIRequester.abort(this.#getWeatherDataSemanticsReqId);
            this.#getWeatherDataSemanticsReqId = null;
        }

        this.#getWeatherDataSemanticsReqId = this.#internalAPIRequester.get(
            app.urlFor(`api.semantics.weather.list`, {site: this.#structuralElementId, forecast: forecast}),
            (data) => {
                this.#fetchWeatherDataModalParamsContainerElmt.innerHTML = "";

                if (data.data.length > 0) {
                    let weatherParamsTitleElmt = document.createElement("span");
                    weatherParamsTitleElmt.classList.add("fw-bold");
                    weatherParamsTitleElmt.textContent = `${data.data.length} weather parameter${data.data.length > 1 ? "s" : ""} will be fetched:`;
                    this.#fetchWeatherDataModalParamsContainerElmt.appendChild(weatherParamsTitleElmt);

                    let weatherParamsListElmt = document.createElement("dl");
                    weatherParamsListElmt.classList.add("d-flex", "flex-wrap", "gap-3");
                    this.#fetchWeatherDataModalParamsContainerElmt.appendChild(weatherParamsListElmt);
                    for (let weatherParam of data.data) {
                        let weatherParamsListItemElmt = document.createElement("div");
                        weatherParamsListElmt.appendChild(weatherParamsListItemElmt);

                        let weatherParamsListItemTitleElmt = document.createElement("dt");
                        weatherParamsListItemTitleElmt.textContent = `${weatherParam["parameter_label"]}`;
                        weatherParamsListItemElmt.appendChild(weatherParamsListItemTitleElmt);

                        let weatherParamsListItemTextElmt = document.createElement("dd");
                        weatherParamsListItemTextElmt.textContent = `${weatherParam["timeseries"]["name"]}${weatherParam["timeseries"]["unit_symbol"] != null ? ` [${weatherParam["timeseries"]["unit_symbol"]}]` : ""}`;
                        weatherParamsListItemElmt.appendChild(weatherParamsListItemTextElmt);
                    }
                }
                else {
                    let warnElmt = document.createElement("div");
                    warnElmt.classList.add("alert", "alert-warning", "border", "border-warning", "mb-0", "py-1");
                    warnElmt.setAttribute("role", "alert");

                    let warnContainerElmt = document.createElement("div");
                    warnContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-end", "gap-3");
                    warnElmt.appendChild(warnContainerElmt);

                    let warnItemElmt = document.createElement("div");
                    warnContainerElmt.appendChild(warnItemElmt);

                    let warnIconElmt = document.createElement("i");
                    warnIconElmt.classList.add("bi", "bi-exclamation-triangle", "me-1");
                    warnItemElmt.appendChild(warnIconElmt);

                    let warnTextElmt = document.createElement("span");
                    warnTextElmt.classList.add("fst-italic");
                    warnTextElmt.textContent = "No weather parameter to fetch. You should set this site's timeseries semantics for weather parameters.";
                    warnItemElmt.appendChild(warnTextElmt);

                    let editMappingContainerElmt = document.createElement("small");
                    warnContainerElmt.appendChild(editMappingContainerElmt);

                    let editMappingLinkElmt = document.createElement("a");
                    editMappingLinkElmt.classList.add("link-secondary", "text-nowrap");
                    editMappingLinkElmt.setAttribute("role", "button");
                    editMappingLinkElmt.title = "Setup timeseries semantics";
                    editMappingLinkElmt.setAttribute("target", "_blank");
                    editMappingLinkElmt.href = app.urlFor(`timeseries.semantic_setup`, { "structural_element_type": this.#structuralElementType, "structural_element_id": this.#structuralElementId });
                    editMappingLinkElmt.textContent = "Edit semantics";
                    editMappingContainerElmt.appendChild(editMappingLinkElmt);

                    this.#fetchWeatherDataModalParamsContainerElmt.appendChild(warnElmt);
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
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
                            weatherChart.load(name, dataset, this.#tzName, this.#timeDisplayModePerPeriodType[this.#periodTypeSelectElmt.value], () => { this.#updateTsInfoModal(name, dataset)});
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

    #checkSiteHasCoordinates(siteId, successCallback = null) {
        if (this.#hasSiteCoordReqId != null) {
            this.#internalAPIRequester.abort(this.#hasSiteCoordReqId);
            this.#hasSiteCoordReqId = null;
        }

        // Verify that the site has long/lat coordinates.
        this.#hasSiteCoordReqId = this.#internalAPIRequester.get(
            app.urlFor(`api.structural_elements.retrieve_data`, {type: "site", id: siteId}),
            (data) => {
                this.#fetchWeatherDataSiteElmt.textContent = data.structural_element.name;

                let siteHasCoord = data.structural_element.latitude != null && data.structural_element.longitude != null;
                if (siteHasCoord) {
                    this.#fetchWeatherDataSiteCoordWarnContainerElmt.classList.add("d-none", "invisible");
                }
                else {
                    this.#fetchWeatherDataEditSiteLnkElmt.href = app.urlFor(`structural_elements.edit`, {type:this.#structuralElementType, id: this.#structuralElementId});

                    this.#fetchWeatherDataSiteCoordWarnContainerElmt.classList.remove("d-none", "invisible");
                }

                successCallback?.();
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

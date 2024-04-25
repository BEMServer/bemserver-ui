import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { FilterSelect } from "/static/scripts/modules/components/filterSelect.js";
import "/static/scripts/modules/components/itemsCount.js";
import "/static/scripts/modules/components/time/datetimePicker.js";


class WeatherDataServiceManageView {

    #internalAPIRequester = null;
    #weatherListReqID = null;
    #forecastWeatherListReqID = null;
    #updateStateReqID = null;
    #getSvcEtagReqID = null;
    #getSemanticsReqID = null;

    #filtersContainerElmt = null;
    #siteNameSearchElmt = null;
    #serviceStateFilterElmt = null;
    #removeFiltersBtnElmt = null;

    #weatherItemsCountElmt = null;
    #weatherServiceStatesContainerElmt = null;

    #forecastWeatherItemsCountElmt = null;
    #forecastWeatherServiceStatesContainerElmt = null;

    #fetchDataModalElmt = null;
    #fetchDataModal = null;
    #fetchDataModalBodyElmt = null;
    #fetchDataSiteIdElmt = null;
    #fetchDataDatetimeStartElmt = null;
    #fetchDataDatetimeEndElmt = null;
    #fetchDataBtnElmt = null;
    #fetchDataModalParamsContainerElmt = null;

    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initFilters();
        this.#initEventListeners();
    }
    
    #cacheDOM() {
        this.#filtersContainerElmt = document.getElementById("filtersContainer");
        this.#siteNameSearchElmt = document.getElementById("siteNameSearch");
        this.#removeFiltersBtnElmt = document.getElementById("removeFiltersBtn");

        this.#weatherItemsCountElmt = document.getElementById("weatherItemsCount");
        this.#weatherServiceStatesContainerElmt = document.getElementById("weatherServiceStatesContainer");

        this.#forecastWeatherItemsCountElmt = document.getElementById("weatherForecastItemsCount");
        this.#forecastWeatherServiceStatesContainerElmt = document.getElementById("weatherForecastServiceStatesContainer");

        if (app.signedUser.is_admin) {
            this.#fetchDataModalElmt = document.getElementById("fetchDataModal");
            this.#fetchDataModal = new bootstrap.Modal(this.#fetchDataModalElmt);
            this.#fetchDataModalBodyElmt = document.getElementById("fetchDataModalBody");
            this.#fetchDataSiteIdElmt = document.getElementById("fetchDataSiteId");
            this.#fetchDataDatetimeStartElmt = document.getElementById("fetchDataDatetimeStart");
            this.#fetchDataDatetimeEndElmt = document.getElementById("fetchDataDatetimeEnd");
            this.#fetchDataBtnElmt = document.getElementById("fetchDataBtn");
            this.#fetchDataModalParamsContainerElmt = document.getElementById("fetchDataModalParamsContainer");
        }
    }

    #initFilters() {
        this.#serviceStateFilterElmt = new FilterSelect();
        this.#filtersContainerElmt.insertBefore(this.#serviceStateFilterElmt, this.#removeFiltersBtnElmt);
        this.#serviceStateFilterElmt.load([
            {value: "all", text: "All"},
            {value: "on", text: "ON"},
            {value: "off", text: "OFF"},
        ]);
        this.#serviceStateFilterElmt.setAttribute("data-default", "all");
    }

    #initEventListeners() {
        this.#siteNameSearchElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#updateSiteNameSearch();
            this.#refreshWeatherList();
            this.#refreshForecastWeatherList();
        });

        this.#serviceStateFilterElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#refreshWeatherList();
            this.#refreshForecastWeatherList();
        });

        this.#removeFiltersBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            let hasFilterChanged = false;
            if (this.#siteNameSearchElmt.value != "") {
                this.#siteNameSearchElmt.value = "";
                this.#updateSiteNameSearch();
                hasFilterChanged = true;
            }

            let serviceStateFilterDefault = this.#serviceStateFilterElmt.getAttribute("data-default");
            if (this.#serviceStateFilterElmt.value != serviceStateFilterDefault) {
                this.#serviceStateFilterElmt.reset();
                hasFilterChanged = true;
            }

            if (hasFilterChanged) {
                this.#refreshWeatherList();
                this.#refreshForecastWeatherList();
            }
        });

        if (app.signedUser.is_admin) {
            this.#fetchDataDatetimeStartElmt.addEventListener("datetimeChange", (event) => {
                event.preventDefault();

                this.#fetchDataDatetimeEndElmt.dateMin = this.#fetchDataDatetimeStartElmt.date;
                this.#updateFetchDataBtn();
            });

            this.#fetchDataDatetimeEndElmt.addEventListener("datetimeChange", (event) => {
                event.preventDefault();

                this.#fetchDataDatetimeStartElmt.dateMax = this.#fetchDataDatetimeEndElmt.date;
                this.#updateFetchDataBtn();
            });

            this.#fetchDataModalElmt.addEventListener("shown.bs.modal", () => {
                this.#fetchDataDatetimeStartElmt.focus();
            });

            this.#fetchDataBtnElmt.addEventListener("click", () => {
                this.#fetchDataBtnElmt.classList.add("placeholder");
                this.#fetchDataModalBodyElmt.classList.add("placeholder");

                this.#internalAPIRequester.put(
                    app.urlFor(`api.structural_elements.fetch_weather_data`, {id: this.#fetchDataSiteIdElmt.value}),
                    {
                        "start_date": this.#fetchDataDatetimeStartElmt.date,
                        "start_time": this.#fetchDataDatetimeStartElmt.time,
                        "end_date": this.#fetchDataDatetimeEndElmt.date,
                        "end_time": this.#fetchDataDatetimeEndElmt.time,
                    },
                    null,
                    () => {
                        app.flashMessage(`Weather data successfully fetched.`, "success", 5);

                        this.#fetchDataModal.hide();
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");

                        this.#fetchDataModal.hide();
                    },
                );
            });
        }
    }

    #updateSiteNameSearch() {
        if (this.#siteNameSearchElmt.value == "") {
            this.#siteNameSearchElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else if (!this.#siteNameSearchElmt.classList.contains("border-info")) {
            this.#siteNameSearchElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    #updateFetchDataBtn() {
        if (this.#fetchDataBtnElmt.classList.contains("placeholder")) {
            this.#fetchDataBtnElmt.classList.remove("placeholder");
        }
        if (this.#fetchDataModalBodyElmt.classList.contains("placeholder")) {
            this.#fetchDataModalBodyElmt.classList.remove("placeholder");
        }

        if (this.#fetchDataDatetimeStartElmt.date != null && this.#fetchDataDatetimeStartElmt.time != null && this.#fetchDataDatetimeEndElmt.date != null && this.#fetchDataDatetimeEndElmt.time != null) {
            this.#fetchDataBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#fetchDataBtnElmt.setAttribute("disabled", true);
        }
    }

    #createEntryElement(serviceStateData, forecast=false) {
        let suffixId = `${forecast ? "forecast-" : ""}${serviceStateData.site_id}`;

        let trElmt = document.createElement("tr");
        trElmt.classList.add("align-middle");

        let thElmt = document.createElement("th");
        thElmt.classList.add("text-break");
        thElmt.setAttribute("scope", "row");
        thElmt.innerText = serviceStateData.site_name;
        trElmt.appendChild(thElmt);

        let svcCtrlElmt = document.createElement("div");
        svcCtrlElmt.classList.add("d-flex", "gap-1", "my-auto", "placeholder-glow");

        if (app.signedUser.is_admin) {
            let svcEtagInputElmt = document.createElement("input");
            svcEtagInputElmt.setAttribute("type", "hidden");
            svcCtrlElmt.appendChild(svcEtagInputElmt);

            let svcOnInputElmt = document.createElement("input");
            svcOnInputElmt.id = `radio-svc-state-${suffixId}-on`;
            svcOnInputElmt.name = `radio-svc-state-${suffixId}`;
            svcOnInputElmt.classList.add("btn-check");
            svcOnInputElmt.setAttribute("type", "radio");
            svcOnInputElmt.setAttribute("autocomplete", "off");
            svcCtrlElmt.appendChild(svcOnInputElmt);

            let svcOnLabelElmt = document.createElement("label");
            svcOnLabelElmt.classList.add("btn", "btn-sm", "btn-outline-success");
            svcOnLabelElmt.setAttribute("for", svcOnInputElmt.id);
            svcOnLabelElmt.setAttribute("title", "Enable service");
            svcOnLabelElmt.innerText = "ON";
            svcCtrlElmt.appendChild(svcOnLabelElmt);

            let svcOffInputElmt = document.createElement("input");
            svcOffInputElmt.id = `radio-svc-state-${suffixId}-off`;
            svcOffInputElmt.name = `radio-svc-state-${suffixId}`;
            svcOffInputElmt.classList.add("btn-check");
            svcOffInputElmt.setAttribute("type", "radio");
            svcOffInputElmt.setAttribute("autocomplete", "off");
            svcCtrlElmt.appendChild(svcOffInputElmt);

            let svcOffLabelElmt = document.createElement("label");
            svcOffLabelElmt.classList.add("btn", "btn-sm", "btn-outline-danger");
            svcOffLabelElmt.setAttribute("for", svcOffInputElmt.id);
            svcOffLabelElmt.setAttribute("title", "Disable service");
            svcOffLabelElmt.innerText = "OFF";
            svcCtrlElmt.appendChild(svcOffLabelElmt);

            let updateSvcInputState = () => {
                if (serviceStateData.is_enabled) {
                    svcOffInputElmt.removeAttribute("checked");
                    svcOnInputElmt.setAttribute("checked", "true");
                }
                else {
                    svcOnInputElmt.removeAttribute("checked");
                    svcOffInputElmt.setAttribute("checked", "true");
                }

                svcOnLabelElmt.classList.remove("placeholder");
                svcOffLabelElmt.classList.remove("placeholder");
            }


            updateSvcInputState();


            let updateServiceState = (isEnabled) => {
                svcOnLabelElmt.classList.add("placeholder");
                svcOffLabelElmt.classList.add("placeholder");

                if (this.#updateStateReqID != null) {
                    this.#internalAPIRequester.abort(this.#updateStateReqID);
                    this.#updateStateReqID = null;
                }

                if (serviceStateData.id == null) {
                    if (isEnabled) {
                        // Enable weather data service for site.
                        this.#updateStateReqID = this.#internalAPIRequester.post(
                            app.urlFor(`api.services.weather_data.${forecast ? "forecast_": ""}enable`),
                            { site_id: serviceStateData.site_id, is_enabled: isEnabled },
                            (data) => {
                                serviceStateData = data.data;
                                svcEtagInputElmt.value = data.etag;
                                updateSvcInputState();

                                app.flashMessage(`${forecast ? "Forecast w": "W"}eather data service enabled!`, "info", 5);
                            },
                            (error) => {
                                app.flashMessage(error.toString(), "error");

                                svcOnLabelElmt.classList.remove("placeholder");
                                svcOffLabelElmt.classList.remove("placeholder");
                            },
                        );
                    }
                }
                else {
                    let _updateSvcState = (_isEnabled) => {
                        // Update weather data service state for site.
                        this.#updateStateReqID = this.#internalAPIRequester.put(
                            app.urlFor(`api.services.weather_data.${forecast ? "forecast_": ""}update_state`, {id: serviceStateData.id}),
                            { is_enabled: _isEnabled },
                            svcEtagInputElmt.value,
                            (data) => {
                                serviceStateData = data.data;
                                svcEtagInputElmt.value = data.etag;
                                updateSvcInputState();

                                app.flashMessage(`${forecast ? "Forecast w": "W"}eather data service ${isEnabled ? "en": "dis"}abled!`, "info", 5);
                            },
                            (error) => {
                                app.flashMessage(error.toString(), "error");

                                updateSvcInputState();
                            },
                        );
                    }

                    if (svcEtagInputElmt.value == "") {
                        if (this.#getSvcEtagReqID != null) {
                            this.#internalAPIRequester.abort(this.#getSvcEtagReqID);
                            this.#getSvcEtagReqID = null;
                        }

                        this.#getSvcEtagReqID = this.#internalAPIRequester.get(
                            app.urlFor(`api.services.weather_data.retrieve_${forecast ? "forecast_": ""}one`, {id: serviceStateData.id}),
                            (data) => {
                                svcEtagInputElmt.value = data.etag;
                                _updateSvcState(isEnabled);
                            },
                            (error) => {
                                app.flashMessage(error.toString(), "error");

                                updateSvcInputState();
                            },
                        );
                    }
                    else {
                        _updateSvcState(isEnabled);
                    }
                }
            };


            svcOnInputElmt.addEventListener("change", () => {
                if (svcOnInputElmt.checked) {
                    updateServiceState(true);
                }
            });

            svcOffInputElmt.addEventListener("change", () => {
                if (svcOffInputElmt.checked) {
                    updateServiceState(false);
                }
            });
        }
        else {
            let spanStateElmt = document.createElement("span");
            spanStateElmt.classList.add("fw-bold", "text-opacity-75");
            if (serviceStateData.is_enabled) {
                spanStateElmt.classList.add("text-success");
                spanStateElmt.innerText = "ON";
            }
            else {
                spanStateElmt.classList.add("text-danger");
                spanStateElmt.innerText = "OFF";
            }
            svcCtrlElmt.appendChild(spanStateElmt);
        }

        let tdStateElmt = document.createElement("td");
        tdStateElmt.classList.add("d-flex", "gap-4");
        tdStateElmt.appendChild(svcCtrlElmt);
        trElmt.appendChild(tdStateElmt);

        if (app.signedUser.is_admin) {
            if (serviceStateData.id == null) {
                let warnAlertElmt = this.#createWarnAlertElement("Never launched yet");
                tdStateElmt.appendChild(warnAlertElmt);
            }

            // Verify that the site has long/lat coordinates.
            let siteHasCoord = true;
            this.#internalAPIRequester.get(
                app.urlFor(`api.structural_elements.retrieve_data`, {type: "site", id: serviceStateData.site_id}),
                (data) => {
                    if (data.structural_element.latitude == null || data.structural_element.longitude == null) {
                        siteHasCoord = false;
                        let warnSiteCoordElmt = this.#createWarnAlertElement("Site latitude/longitude coordinates are not defined!");
                        tdStateElmt.appendChild(warnSiteCoordElmt);
                    }
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");
                },
            );

            if (!forecast) {
                let tdFetchElmt = document.createElement("td");
                trElmt.appendChild(tdFetchElmt);

                let fetchLinkElmt = document.createElement("a");
                fetchLinkElmt.classList.add("btn", "btn-sm", "btn-outline-primary");
                fetchLinkElmt.setAttribute("role", "button");
                fetchLinkElmt.setAttribute("title", "Fetch weather data from external service");
                fetchLinkElmt.setAttribute("data-bs-toggle", "modal");
                fetchLinkElmt.setAttribute("data-bs-target", `#${this.#fetchDataModalElmt.id}`);
                tdFetchElmt.appendChild(fetchLinkElmt);

                let fetchIconElmt = document.createElement("i");
                fetchIconElmt.classList.add("bi", "bi-cloud-download");
                fetchLinkElmt.appendChild(fetchIconElmt);

                fetchLinkElmt.addEventListener("click", () => {
                    this.#fetchDataSiteIdElmt.value = serviceStateData.site_id.toString();
                    this.#fetchDataDatetimeStartElmt.reset({ ignoreTime: true });
                    this.#fetchDataDatetimeEndElmt.reset({ ignoreTime: true });
                    this.#updateFetchDataBtn();

                    this.#fetchDataModalParamsContainerElmt.innerHTML = "";
                    this.#fetchDataModalParamsContainerElmt.appendChild(new Spinner());

                    if (this.#getSemanticsReqID != null) {
                        this.#internalAPIRequester.abort(this.#getSemanticsReqID);
                        this.#getSemanticsReqID = null;
                    }

                    this.#getSemanticsReqID = this.#internalAPIRequester.get(
                        app.urlFor(`api.semantics.weather.list`, {site: serviceStateData.site_id, forecast: false}),
                        (data) => {
                            this.#fetchDataModalParamsContainerElmt.innerHTML = "";

                            if (data.data.length > 0) {
                                let weatherParamsTitleElmt = document.createElement("h6");
                                weatherParamsTitleElmt.innerText = `${data.data.length} weather parameter${data.data.length > 1 ? "s" : ""} will be fetched:`;
                                this.#fetchDataModalParamsContainerElmt.appendChild(weatherParamsTitleElmt);

                                let weatherParamsListElmt = document.createElement("dl");
                                weatherParamsListElmt.classList.add("d-flex", "flex-wrap", "gap-3");
                                this.#fetchDataModalParamsContainerElmt.appendChild(weatherParamsListElmt);
                                for (let weatherParam of data.data) {
                                    let weatherParamsListItemElmt = document.createElement("div");
                                    weatherParamsListElmt.appendChild(weatherParamsListItemElmt);

                                    let weatherParamsListItemTitleElmt = document.createElement("dt");
                                    weatherParamsListItemTitleElmt.innerText = `${weatherParam["parameter_label"]}`;
                                    weatherParamsListItemElmt.appendChild(weatherParamsListItemTitleElmt);

                                    let weatherParamsListItemTextElmt = document.createElement("dd");
                                    weatherParamsListItemTextElmt.innerText = `${weatherParam["timeseries"]["name"]}${weatherParam["timeseries"]["unit_symbol"] != null ? ` [${weatherParam["timeseries"]["unit_symbol"]}]` : ""}`;
                                    weatherParamsListItemElmt.appendChild(weatherParamsListItemTextElmt);
                                }
                            }
                            else {
                                let warnAlertElmt = this.#createWarnAlertElement("No weather parameter to fetch. You should set timeseries semantics for weather parameters.");
                                this.#fetchDataModalParamsContainerElmt.appendChild(warnAlertElmt);
                            }

                            if (!siteHasCoord) {
                                let warnSiteCoordElmt = this.#createWarnAlertElement("Site latitude/longitude coordinates are not defined!");
                                this.#fetchDataModalParamsContainerElmt.appendChild(warnSiteCoordElmt);
                            }
                        },
                        (error) => {
                            app.flashMessage(error.toString(), "error");
                        },
                    );
                });
            }
        }

        return trElmt;
    }

    #createWarnAlertElement(text) {
        let warnContainerElmt = document.createElement("div");
        warnContainerElmt.classList.add("alert", "alert-warning", "border", "border-warning", "mb-0", "py-1");
        warnContainerElmt.setAttribute("role", "alert");

        let warnIconElmt = document.createElement("i");
        warnIconElmt.classList.add("bi", "bi-exclamation-triangle", "me-1");
        warnContainerElmt.appendChild(warnIconElmt);

        let warnTextElmt = document.createElement("span");
        warnTextElmt.classList.add("fst-italic");
        warnTextElmt.innerText = text;
        warnContainerElmt.appendChild(warnTextElmt);

        return warnContainerElmt;
    }

    #getListLoadingElement() {
        let loadingContainerElmt = document.createElement("td");
        loadingContainerElmt.setAttribute("colspan", "3");
        loadingContainerElmt.classList.add("text-center", "p-4", "w-100");
        loadingContainerElmt.appendChild(new Spinner());
        return loadingContainerElmt;
    }

    #refreshWeatherList() {
        this.#weatherItemsCountElmt.setLoading();
        this.#weatherServiceStatesContainerElmt.innerHTML = "";
        this.#weatherServiceStatesContainerElmt.appendChild(this.#getListLoadingElement());

        if (this.#weatherListReqID != null) {
            this.#internalAPIRequester.abort(this.#weatherListReqID);
            this.#weatherListReqID = null;
        }

        let filters = {};
        if (this.#siteNameSearchElmt.value != "") {
            filters["in_site_name"] = this.#siteNameSearchElmt.value;
        }
        if (this.#serviceStateFilterElmt.value == "on") {
            filters["is_enabled"] = true;
        }
        else if (this.#serviceStateFilterElmt.value == "off") {
            filters["is_enabled"] = false;
        }

        this.#weatherListReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.services.weather_data.retrieve_list`, filters),
            (data) => {
                this.#weatherServiceStatesContainerElmt.innerHTML = "";
                if (data.length > 0) {
                    for (let row of data) {
                        row.is_enabled = row.is_enabled == null ? false : row.is_enabled;
                        this.#weatherServiceStatesContainerElmt.appendChild(this.#createEntryElement(row));
                    }
                }
                else {
                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noItemElmt.innerText = "No download weather data service states for sites";
                    this.#weatherServiceStatesContainerElmt.appendChild(noItemElmt);
                }

                this.#weatherItemsCountElmt.update({firstItem: data.length > 0 ? 1 : 0, lastItem: data.length, totalCount: data.length});
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #refreshForecastWeatherList() {
        this.#forecastWeatherItemsCountElmt.setLoading();
        this.#forecastWeatherServiceStatesContainerElmt.innerHTML = "";
        this.#forecastWeatherServiceStatesContainerElmt.appendChild(this.#getListLoadingElement());

        if (this.#forecastWeatherListReqID != null) {
            this.#internalAPIRequester.abort(this.#forecastWeatherListReqID);
            this.#forecastWeatherListReqID = null;
        }

        let filters = {};
        if (this.#siteNameSearchElmt.value != "") {
            filters["in_site_name"] = this.#siteNameSearchElmt.value;
        }
        if (this.#serviceStateFilterElmt.value == "on") {
            filters["is_enabled"] = true;
        }
        else if (this.#serviceStateFilterElmt.value == "off") {
            filters["is_enabled"] = false;
        }

        this.#forecastWeatherListReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.services.weather_data.retrieve_forecast_list`, filters),
            (data) => {
                this.#forecastWeatherServiceStatesContainerElmt.innerHTML = "";
                if (data.length > 0) {
                    for (let row of data) {
                        row.is_enabled = row.is_enabled == null ? false : row.is_enabled;
                        this.#forecastWeatherServiceStatesContainerElmt.appendChild(this.#createEntryElement(row, true));
                    }
                }
                else {
                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "w-100");
                    noItemElmt.innerText = "No download weather data service states for sites";
                    this.#forecastWeatherServiceStatesContainerElmt.appendChild(noItemElmt);
                }

                this.#forecastWeatherItemsCountElmt.update({firstItem: data.length > 0 ? 1 : 0, lastItem: data.length, totalCount: data.length});
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    mount() {
        this.#refreshWeatherList();
        this.#refreshForecastWeatherList();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new WeatherDataServiceManageView();
    view.mount();
});

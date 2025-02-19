import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/timeseries/bucketWidth.js";
import "/static/scripts/modules/components/spinner.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import { TimeseriesChartExplore, TimeseriesChartSeriesOptions, SeriesYAxisPositions, SeriesTypes, SeriesLineStyles, SeriesLineSymbols, SeriesBarDecals, defaultSeriesYAxisPosition, defaultSeriesType, defaultSeriesLineStyle, defaultSeriesLineSymbol, defaultSeriesBarDecal } from "/static/scripts/modules/components/charts/tsChartExplore.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "/static/scripts/modules/tools/compress.js";


class TimeseriesDataExploreView {

    #internalAPIRequester = null;
    #tsDataGetReqID = null;

    #chartContainerElmt = null;
    #chartExplore = null;

    #timeseriesElmt = null;
    #periodTypeElmt = null;
    #periodCustomElmt = null;
    #periodStartDatetimeElmt = null;
    #periodEndDatetimeElmt = null;
    #aggInputElmt = null;
    #bucketElmt = null;

    #chartSettingsCanvas = null;
    #chartSeriesContainerElmt = null;
    #chartSeriesContainerBodyElmt = null;
    #tsSeriesChartOptsRowElmts = {};
    #seriesCountElmt = null;
    #removeAllSeriesBtnElmt = null;
    #tsDataStatesSelectElmt = null;
    #timezonePickerElmt = null;

    #selectTimeseriesModalElmt = null;
    #selectTimeseriesModal = null;
    #tsSelector = null;
    #selectTimeseriesYAxisPositionContainerElmt = null;
    #selectTimeseriesSeriesTypeContainerElmt = null;
    #selectedTimeseriesSaveBtnElmt = null;

    #endDateDefault = null;
    #endTimeDefault = null;
    #endDateCustomBackup = null;
    #endTimeCustomBackup = null;

    #tsSeriesOptions = {};
    #periodTypeLoaded = null;


    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#chartContainerElmt = document.getElementById("chartContainer");

        this.#timeseriesElmt = document.getElementById("timeseries");
        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodCustomElmt = document.getElementById("periodCustom");
        this.#periodStartDatetimeElmt = document.getElementById("start_datetime");
        this.#periodEndDatetimeElmt = document.getElementById("end_datetime");
        this.#aggInputElmt = document.getElementById("agg");
        this.#bucketElmt = document.getElementById("bucket");

        this.#chartSettingsCanvas = new bootstrap.Offcanvas("#chartSettingsPanel");
        this.#chartSeriesContainerElmt = document.getElementById("chartSeriesContainer");
        this.#chartSeriesContainerBodyElmt = this.#chartSeriesContainerElmt.querySelector("tbody");
        this.#seriesCountElmt = document.getElementById("seriesCount");
        this.#removeAllSeriesBtnElmt = document.getElementById("removeAllSeriesBtn");
        this.#tsDataStatesSelectElmt = document.getElementById("data_states");
        this.#timezonePickerElmt = document.getElementById("timezonePicker");

        this.#selectTimeseriesModalElmt = document.getElementById("selectTimeseries");
        this.#selectTimeseriesModal = new bootstrap.Modal(this.#selectTimeseriesModalElmt);
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorExplore");
        this.#selectTimeseriesYAxisPositionContainerElmt = document.getElementById("selectTimeseriesYAxisPositionContainer");
        this.#selectTimeseriesSeriesTypeContainerElmt = document.getElementById("selectTimeseriesSeriesTypeContainer");
        this.#selectedTimeseriesSaveBtnElmt = document.getElementById("selectedTimeseriesSaveBtn");
    }

    #initEventListeners() {
        this.#periodTypeElmt.addEventListener("change", () => {
            this.#updatePeriodCustomState();
            if (this.#periodTypeElmt.value != this.#periodTypeLoaded) {
                this.#loadChartSeries();
            }
        });

        this.#periodStartDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodEndDatetimeElmt.dateMin = this.#periodStartDatetimeElmt.date;
            this.#loadChartSeries();
        }, 1000));

        this.#periodEndDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodStartDatetimeElmt.dateMax = this.#periodEndDatetimeElmt.date;
            this.#loadChartSeries();
        }, 1000));

        this.#aggInputElmt.addEventListener("change", () => {
            this.#updateAggregationBucketState();
            this.#loadChartSeries();
        });

        this.#bucketElmt.addEventListener("change", () => {
            this.#loadChartSeries();
        });

        this.#tsDataStatesSelectElmt.addEventListener("change", () => {
            let tsDataState = {
                id: this.#tsDataStatesSelectElmt.value,
                name: this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text,
            };

            for (let tsSeriesOption of Object.values(this.#tsSeriesOptions)) {
                this.#chartExplore.removeSeries(tsSeriesOption.seriesID);

                tsSeriesOption.tsDataState = tsDataState;
                let chartSeriesParams = tsSeriesOption.toChartSeries();
                this.#chartExplore.addSeries(chartSeriesParams);
            }

            this.#loadChartSeries();
        });

        this.#timezonePickerElmt.addEventListener("tzChange", () => {
            this.#periodStartDatetimeElmt.tzName = this.#timezonePickerElmt.tzName;
            this.#periodEndDatetimeElmt.tzName = this.#timezonePickerElmt.tzName;
            this.#loadChartSeries();
        });

        this.#tsSelector.addEventListener("toggleItem", () => {
            this.#updateAddTimeseriesButtonState();
        });

        this.#tsSelector.addEventListener("removeItem", () => {
            this.#updateAddTimeseriesButtonState();
        });

        this.#tsSelector.addEventListener("selectionChanged", () => {
            this.#updateAddTimeseriesButtonState();
        });

        this.#tsSelector.addEventListener("clearSelection", () => {
            this.#updateAddTimeseriesButtonState();
        });

        this.#selectedTimeseriesSaveBtnElmt.addEventListener("click", () => {
            let seriesYAxisPosition = this.#selectTimeseriesYAxisPositionContainerElmt.querySelector(`input[type="radio"][name="selectTimeseriesYAxisPositionRadioOptions"]:checked`).value;
            let seriesType = this.#selectTimeseriesSeriesTypeContainerElmt.querySelector(`input[type="radio"][name="selectTimeseriesSeriesTypeRadioOptions"]:checked`).value;
            this.#addTimeseries(this.#tsSelector.selectedItems, seriesYAxisPosition, seriesType);
            this.#selectTimeseriesModal.hide();
        });

        this.#selectTimeseriesModalElmt?.addEventListener("shown.bs.modal", () => {
            this.#selectTimeseriesYAxisPositionContainerElmt.innerHTML = "";
            for (let [optValue, optText] of Object.entries(SeriesYAxisPositions)) {
                let radioOptContainerElmt = document.createElement("div");
                radioOptContainerElmt.classList.add("form-check", "form-check-inline");
                this.#selectTimeseriesYAxisPositionContainerElmt.appendChild(radioOptContainerElmt);

                let radioOptElmt = document.createElement("input");
                radioOptElmt.classList.add("form-check-input");
                radioOptElmt.type = "radio";
                radioOptElmt.name = "selectTimeseriesYAxisPositionRadioOptions";
                radioOptElmt.id = `selectTimeseriesYAxisPosition-${optValue}`;
                radioOptElmt.value = optValue;
                if (optValue == defaultSeriesYAxisPosition) {
                    radioOptElmt.setAttribute("checked", true);
                }
                radioOptContainerElmt.appendChild(radioOptElmt);

                let radioOptLabelElmt = document.createElement("label");
                radioOptLabelElmt.classList.add("form-check-label");
                radioOptLabelElmt.setAttribute("for", radioOptElmt.id);
                radioOptLabelElmt.innerText = optText;
                radioOptContainerElmt.appendChild(radioOptLabelElmt);
            }

            this.#selectTimeseriesSeriesTypeContainerElmt.innerHTML = "";
            for (let [optValue, optText] of Object.entries(SeriesTypes)) {
                let radioOptContainerElmt = document.createElement("div");
                radioOptContainerElmt.classList.add("form-check", "form-check-inline");
                this.#selectTimeseriesSeriesTypeContainerElmt.appendChild(radioOptContainerElmt);

                let radioOptElmt = document.createElement("input");
                radioOptElmt.classList.add("form-check-input");
                radioOptElmt.type = "radio";
                radioOptElmt.name = "selectTimeseriesSeriesTypeRadioOptions";
                radioOptElmt.id = `selectTimeseriesSeriesType-${optValue}`;
                radioOptElmt.value = optValue;
                if (optValue == defaultSeriesType) {
                    radioOptElmt.setAttribute("checked", true);
                }
                radioOptContainerElmt.appendChild(radioOptElmt);

                let radioOptLabelElmt = document.createElement("label");
                radioOptLabelElmt.classList.add("form-check-label");
                radioOptLabelElmt.setAttribute("for", radioOptElmt.id);
                radioOptLabelElmt.innerText = optText;
                radioOptContainerElmt.appendChild(radioOptLabelElmt);
            }
        });

        this.#selectTimeseriesModalElmt?.addEventListener("hide.bs.modal", () => {
            this.#tsSelector.clearAllSelection();
        });

        this.#removeAllSeriesBtnElmt.addEventListener("click", () => {
            this.#chartExplore.clearAll();
            this.#tsSeriesOptions = {};
            this.#chartSeriesContainerBodyElmt.innerHTML = "";
            this.#updateSelectedTimeseriesInfo();
            this.#updateUrlParams();
        });

        // Chart explore event listener.
        document.addEventListener("seriesVisibilityChanged", (event) => {
            let tsID = event.detail.timeseriesID;
            let isVisible = event.detail.visibility;
            this.#tsSeriesOptions[tsID].show = isVisible;
            this.#updateChartSeriesOptionsVisibility(tsID);
            this.#updateUrlParams();
        });

        window.addEventListener("popstate", () => {
            let url = new URL(window.location);

            this.#tsDataStatesSelectElmt.value = url.searchParams.get("data_state");

            this.#periodTypeElmt.value = url.searchParams.get("period_type");
            let tzName = url.searchParams.get("tz");
            this.#timezonePickerElmt.tzName = tzName;
            this.#periodStartDatetimeElmt.tzName = tzName;
            this.#periodEndDatetimeElmt.tzName = tzName;
            if (this.#isPeriodCustom()) {
                this.#periodStartDatetimeElmt.date = url.searchParams.get("period_start_date");
                this.#periodStartDatetimeElmt.time = url.searchParams.get("period_start_time");
                this.#periodEndDatetimeElmt.date = url.searchParams.get("period_end_date");
                this.#periodEndDatetimeElmt.time = url.searchParams.get("period_end_time");
            }
            this.#updatePeriodCustomState();

            let agg = url.searchParams.get("agg");
            this.#aggInputElmt.value = agg == "" ? "none" : agg;
            this.#bucketElmt.bucketWidthValue = url.searchParams.get("bucket_width_value");
            this.#bucketElmt.bucketWidthUnit = url.searchParams.get("bucket_width_unit");
            this.#updateAggregationBucketState();

            // Update timeseries selector component with (un)selected timeseries and refresh chart.
            this.#tsSelector.clearAllSelection();
            this.#tsSeriesOptions = {};
            this.#loadChartSettingsFromUrlParam(url.searchParams.get("chart"));
            this.#chartExplore.clearAll();
            this.#timeseriesElmt.value = url.searchParams.get("timeseries");
            let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
            this.#tsSelector.select(
                tsIDs,
                () => {
                    this.#addTimeseries(this.#tsSelector.selectedItems);
                    this.#tsSelector.clearAllSelection();

                    if (Object.keys(this.#tsSeriesOptions).length <= 0) {
                        this.#chartSettingsCanvas.show();
                    }
                },
            );
        });
    }

    #updateAddTimeseriesButtonState() {
        if (this.#tsSelector.selectedItems.length > 0) {
            this.#selectedTimeseriesSaveBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#selectedTimeseriesSaveBtnElmt.setAttribute("disabled", true);
        }
    }

    #addTimeseries(timeseriesInfoList, seriesYAxisPosition = "left", seriesType = "line") {
        let addedTsIDs = [];
        for (let tsInfo of timeseriesInfoList) {
            let tsChartSeriesOpts = this.#tsSeriesOptions[tsInfo.id];
            if (tsChartSeriesOpts == null) {
                let seriesColor = this.#chartExplore.getNextColor();

                let tsDataState = {
                    id: this.#tsDataStatesSelectElmt.value,
                    name: this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text,
                };

                tsChartSeriesOpts = new TimeseriesChartSeriesOptions(tsInfo, tsDataState, seriesColor, seriesYAxisPosition, seriesType);
                this.#tsSeriesOptions[tsInfo.id] = tsChartSeriesOpts;
            }

            if (!Object.keys(this.#tsSeriesChartOptsRowElmts).includes(tsInfo.id.toString())) {
                let tsSeriesChartOptsRowElmt = this.#createTimeseriesChartOptionsRowElment(tsChartSeriesOpts);
                this.#chartSeriesContainerBodyElmt.appendChild(tsSeriesChartOptsRowElmt);
                this.#tsSeriesChartOptsRowElmts[tsInfo.id.toString()] = tsSeriesChartOptsRowElmt;
                this.#updateChartSeriesOptionsVisibility(tsInfo.id);
            }

            let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
            if (!this.#chartExplore.hasSeries(chartSeriesParams.id)) {
                this.#chartExplore.addSeries(chartSeriesParams);
                addedTsIDs.push(tsInfo.id);
            }
        }

        this.#updateSelectedTimeseriesInfo();

        if (addedTsIDs.length > 0) {
            // Get timeseries data and draw chart.
            this.#loadChartSeries(addedTsIDs);
        }
    }

    #updateChartSeriesOptionsVisibility(tsID) {
        let seriesVisibilitySwitchElmt = this.#chartSeriesContainerBodyElmt.querySelector(`input[type="checkbox"][role="switch"][id="seriesVisibilitySwitch-${tsID.toString()}"`);
        let seriesColorPickerElmt = this.#chartSeriesContainerBodyElmt.querySelector(`input[type="color"][id="seriesColorPicker-${tsID.toString()}"]`);
        let seriesTypeSelectElmt = this.#chartSeriesContainerBodyElmt.querySelector(`select[id="seriesTypeSelect-${tsID.toString()}"]`);
        let seriesStyleSelectElmt = this.#chartSeriesContainerBodyElmt.querySelector(`select[id="seriesStyleSelect-${tsID.toString()}"]`);
        let seriesSymbolSelectElmt = this.#chartSeriesContainerBodyElmt.querySelector(`select[id="seriesSymbolSelect-${tsID.toString()}"]`);
        let seriesDecalSelectElmt = this.#chartSeriesContainerBodyElmt.querySelector(`select[id="seriesDecalSelect-${tsID.toString()}"]`);
        let seriesYAxisPositionSelectElmt = this.#chartSeriesContainerBodyElmt.querySelector(`select[id="seriesYAxisPositionSelect-${tsID.toString()}"]`);

        seriesVisibilitySwitchElmt.checked = this.#tsSeriesOptions[tsID].show;

        if (this.#tsSeriesOptions[tsID].show) {
            seriesColorPickerElmt.removeAttribute("disabled");
            seriesTypeSelectElmt.removeAttribute("disabled");
            seriesStyleSelectElmt.removeAttribute("disabled");
            seriesSymbolSelectElmt.removeAttribute("disabled");
            seriesDecalSelectElmt.removeAttribute("disabled");
            seriesYAxisPositionSelectElmt.removeAttribute("disabled");
        }
        else {
            seriesColorPickerElmt.setAttribute("disabled", true);
            seriesTypeSelectElmt.setAttribute("disabled", true);
            seriesStyleSelectElmt.setAttribute("disabled", true);
            seriesSymbolSelectElmt.setAttribute("disabled", true);
            seriesDecalSelectElmt.setAttribute("disabled", true);
            seriesYAxisPositionSelectElmt.setAttribute("disabled", true);
        }
    }

    #hasPeriodSelected() {
        return !this.#isPeriodCustom() || (this.#periodStartDatetimeElmt.hasDatetime && this.#periodStartDatetimeElmt.isValid && this.#periodEndDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.isValid);
    }

    #createTimeseriesChartOptionsRowElment(tsChartSeriesOpts) {
        let tsID = tsChartSeriesOpts.tsInfo.id;
        let seriesYAxisPosition = tsChartSeriesOpts.yAxisPosition || defaultSeriesYAxisPosition;
        let seriesType = tsChartSeriesOpts.type || defaultSeriesType;
        let seriesLineStyle = tsChartSeriesOpts.style || defaultSeriesLineStyle;
        let seriesLineSymbol = tsChartSeriesOpts.symbol || defaultSeriesLineSymbol;
        let seriesBarDecal = tsChartSeriesOpts.decalName || defaultSeriesBarDecal;

        let rowElmt = document.createElement("tr");
        rowElmt.classList.add("align-middle");

        let visibilityCellElmt = document.createElement("td");
        rowElmt.appendChild(visibilityCellElmt);
        let colorCellElmt = document.createElement("td");
        rowElmt.appendChild(colorCellElmt);
        let nameCellElmt = document.createElement("td");
        nameCellElmt.classList.add("text-break");
        rowElmt.appendChild(nameCellElmt);
        let yAxisPositionCellElmt = document.createElement("td");
        rowElmt.appendChild(yAxisPositionCellElmt);
        let typeCellElmt = document.createElement("td");
        rowElmt.appendChild(typeCellElmt);
        let styleCellElmt = document.createElement("td");
        styleCellElmt.classList.add("hstack", "gap-1");
        rowElmt.appendChild(styleCellElmt);
        let removeCellElmt = document.createElement("td");
        rowElmt.appendChild(removeCellElmt);

        let visibilitySwitchContainerElmt = document.createElement("div");
        visibilitySwitchContainerElmt.classList.add("form-check", "form-switch");
        visibilityCellElmt.appendChild(visibilitySwitchContainerElmt);
        let visibilitySwitchElmt = document.createElement("input");
        visibilitySwitchElmt.id = `seriesVisibilitySwitch-${tsID.toString()}`;
        visibilitySwitchElmt.classList.add("form-check-input");
        visibilitySwitchElmt.type = "checkbox";
        visibilitySwitchElmt.setAttribute("role", "switch");
        visibilitySwitchElmt.checked = tsChartSeriesOpts.show;
        visibilitySwitchContainerElmt.appendChild(visibilitySwitchElmt);

        let colorInputElmt = document.createElement("input");
        colorInputElmt.id = `seriesColorPicker-${tsID.toString()}`;
        colorInputElmt.type = "color";
        colorInputElmt.classList.add("form-control", "form-control-sm");
        colorInputElmt.value = tsChartSeriesOpts.color;
        colorInputElmt.setAttribute("aria-label", "Select a color");
        colorInputElmt.style.width = "40px";
        colorCellElmt.appendChild(colorInputElmt);

        let seriesNameElmt = document.createElement("small");
        seriesNameElmt.innerText = tsChartSeriesOpts.tsInfo.name;
        nameCellElmt.appendChild(seriesNameElmt);

        let yAxisPositionInputElmt = document.createElement("select");
        yAxisPositionInputElmt.id = `seriesYAxisPositionSelect-${tsID.toString()}`;
        yAxisPositionInputElmt.classList.add("form-select", "form-select-sm");
        yAxisPositionInputElmt.setAttribute("aria-label", "Select a position");
        for (let [optValue, optText] of Object.entries(SeriesYAxisPositions)) {
            let optElmt = document.createElement("option");
            optElmt.value = optValue;
            optElmt.textContent = optText;
            optElmt.selected = optValue == seriesYAxisPosition;
            yAxisPositionInputElmt.appendChild(optElmt);
        }
        yAxisPositionCellElmt.appendChild(yAxisPositionInputElmt);

        let typeInputElmt = document.createElement("select");
        typeInputElmt.id = `seriesTypeSelect-${tsID.toString()}`;
        typeInputElmt.classList.add("form-select", "form-select-sm");
        typeInputElmt.setAttribute("aria-label", "Select a type of series");
        for (let [optValue, optText] of Object.entries(SeriesTypes)) {
            let optElmt = document.createElement("option");
            optElmt.value = optValue;
            optElmt.textContent = optText;
            optElmt.selected = optValue == seriesType;
            typeInputElmt.appendChild(optElmt);
        }
        typeCellElmt.appendChild(typeInputElmt);

        let styleInputElmt = document.createElement("select");
        styleInputElmt.id = `seriesStyleSelect-${tsID.toString()}`;
        styleInputElmt.classList.add("form-select", "form-select-sm");
        styleInputElmt.setAttribute("aria-label", "Select a style of series");
        for (let [optValue, optText] of Object.entries(SeriesLineStyles)) {
            let optElmt = document.createElement("option");
            optElmt.value = optValue;
            optElmt.textContent = optText;
            optElmt.selected = optValue == seriesLineStyle;
            styleInputElmt.appendChild(optElmt);
        }
        styleCellElmt.appendChild(styleInputElmt);

        let symbolInputElmt = document.createElement("select");
        symbolInputElmt.id = `seriesSymbolSelect-${tsID.toString()}`;
        symbolInputElmt.classList.add("form-select", "form-select-sm");
        symbolInputElmt.setAttribute("aria-label", "Select a symbol of series");
        for (let [optValue, optText] of Object.entries(SeriesLineSymbols)) {
            let optElmt = document.createElement("option");
            optElmt.value = optValue;
            optElmt.textContent = optText;
            optElmt.selected = optValue == seriesLineSymbol;
            symbolInputElmt.appendChild(optElmt);
        }
        styleCellElmt.appendChild(symbolInputElmt);

        let decalInputElmt = document.createElement("select");
        decalInputElmt.id = `seriesDecalSelect-${tsID.toString()}`;
        decalInputElmt.classList.add("form-select", "form-select-sm");
        decalInputElmt.setAttribute("aria-label", "Select a decal of series");
        for (let [optValue, optData] of Object.entries(SeriesBarDecals)) {
            let optElmt = document.createElement("option");
            optElmt.value = optValue;
            optElmt.textContent = optData.label;
            optElmt.selected = optValue == seriesBarDecal;
            decalInputElmt.appendChild(optElmt);
        }
        styleCellElmt.appendChild(decalInputElmt);

        let removeBtnElmt = document.createElement("button");
        removeBtnElmt.classList.add("btn", "btn-sm", "btn-outline-danger");
        removeBtnElmt.title = `Remove ${tsChartSeriesOpts.tsInfo.name} series`;
        removeCellElmt.appendChild(removeBtnElmt);
        let removeIconElmt = document.createElement("i");
        removeIconElmt.classList.add("bi", "bi-trash");
        removeBtnElmt.appendChild(removeIconElmt);

        let updateSeriesStyleOptionsFunc = () => {
            if (typeInputElmt.value == "line") {
                styleInputElmt.classList.remove("d-none", "invisible");
                styleInputElmt.removeAttribute("disabled");
                symbolInputElmt.classList.remove("d-none", "invisible");
                symbolInputElmt.removeAttribute("disabled");
                decalInputElmt.classList.add("d-none", "invisible");
                decalInputElmt.setAttribute("disabled", true);
            }
            else {
                styleInputElmt.classList.add("d-none", "invisible");
                styleInputElmt.setAttribute("disabled", true);
                symbolInputElmt.classList.add("d-none", "invisible");
                symbolInputElmt.setAttribute("disabled", true);
                decalInputElmt.classList.remove("d-none", "invisible");
                decalInputElmt.removeAttribute("disabled");
            }
        };

        updateSeriesStyleOptionsFunc();

        // Event listeners.
        visibilitySwitchElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].show = visibilitySwitchElmt.checked;
            this.#updateChartSeriesOptionsVisibility(tsID);
            this.#chartExplore.toggleSeriesVisibility(this.#tsSeriesOptions[tsID].seriesID);
            this.#updateUrlParams();
        });

        colorInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].color = colorInputElmt.value;
            this.#refreshChart(tsID);
            this.#updateUrlParams();
        });

        typeInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].type = typeInputElmt.value;
            updateSeriesStyleOptionsFunc();
            this.#refreshChart(tsID);
            this.#updateUrlParams();
        });

        styleInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].style = styleInputElmt.value;
            this.#refreshChart(tsID);
            this.#updateUrlParams();
        });

        symbolInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].symbol = symbolInputElmt.value;
            this.#refreshChart(tsID);
            this.#updateUrlParams();
        });

        decalInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].decalName = decalInputElmt.value;
            this.#refreshChart(tsID);
            this.#updateUrlParams();
        });

        yAxisPositionInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsID].yAxisPosition = yAxisPositionInputElmt.value;
            this.#refreshChart(tsID, true);
            this.#updateUrlParams();
        });

        removeBtnElmt.addEventListener("click", () => {
            rowElmt.remove();
            this.#chartExplore.removeSeries(this.#tsSeriesOptions[tsID].seriesID);
            delete this.#tsSeriesOptions[tsID];
            delete this.#tsSeriesChartOptsRowElmts[tsID];
            this.#updateSelectedTimeseriesInfo();
            this.#updateUrlParams();
        });

        return rowElmt;
    }

    #updatePeriodCustomState() {
        if (this.#isPeriodCustom()) {
            this.#periodEndDatetimeElmt.date = this.#endDateCustomBackup;
            this.#periodEndDatetimeElmt.time = this.#endTimeCustomBackup;

            this.#periodCustomElmt.classList.remove("d-none", "invisible");
            this.#periodStartDatetimeElmt.setAttribute("required", true);
            this.#periodEndDatetimeElmt.setAttribute("required", true);

            this.#periodStartDatetimeElmt.focus();
        }
        else {
            this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
            this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;
            this.#periodEndDatetimeElmt.date = this.#endDateDefault;
            this.#periodEndDatetimeElmt.time = this.#endTimeDefault;

            this.#periodCustomElmt.classList.add("d-none", "invisible");
            this.#periodStartDatetimeElmt.removeAttribute("required");
            this.#periodEndDatetimeElmt.removeAttribute("required");
        }
    }

    #updateAggregationBucketState() {
        if (this.#aggInputElmt.value == "none") {
            this.#bucketElmt.setAttribute("disabled", true);
            this.#bucketElmt.classList.add("d-none", "invisible");
        }
        else {
            this.#bucketElmt.removeAttribute("disabled");
            this.#bucketElmt.classList.remove("d-none", "invisible");
        }
    }

    #updateSelectedTimeseriesInfo() {
        this.#timeseriesElmt.value = Object.keys(this.#tsSeriesOptions).join();

        let nbSeries = Object.keys(this.#tsSeriesOptions).length;
        if (nbSeries > 0) {
            this.#chartSeriesContainerElmt.parentElement.classList.remove("d-none", "invisible");
            this.#seriesCountElmt.textContent = `(${nbSeries.toString()})`;
        }
        else {
            this.#chartSeriesContainerElmt.parentElement.classList.add("d-none", "invisible");
            this.#seriesCountElmt.textContent = ``;
        }

        if (nbSeries > 1) {
            this.#removeAllSeriesBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#removeAllSeriesBtnElmt.classList.add("d-none", "invisible");
        }
    }

    #updateUrlParams() {
        let url = new URL(window.location);

        url.searchParams.set("timeseries", this.#timeseriesElmt.value);
        url.searchParams.set("data_state", this.#tsDataStatesSelectElmt.value);
        url.searchParams.set("period_type", this.#periodTypeElmt.value);
        url.searchParams.set("tz", this.#timezonePickerElmt.tzName);

        let doUpdateUrl = true;
        if (this.#isPeriodCustom()) {
            if (this.#periodStartDatetimeElmt.hasDatetime && this.#periodStartDatetimeElmt.isValid) {
                url.searchParams.set("period_start_date", this.#periodStartDatetimeElmt.date);
                url.searchParams.set("period_start_time", this.#periodStartDatetimeElmt.time);
            }
            else {
                // Do not update page URL because period start date is invalid.
                doUpdateUrl = false;
                url.searchParams.delete("period_start_date");
                url.searchParams.delete("period_start_time");
            }
            if (this.#periodEndDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.isValid) {
                url.searchParams.set("period_end_date", this.#periodEndDatetimeElmt.date);
                url.searchParams.set("period_end_time", this.#periodEndDatetimeElmt.time);
            }
            else {
                // Do not update page URL because period end date is invalid.
                doUpdateUrl = false;
                url.searchParams.delete("period_end_date");
                url.searchParams.delete("period_end_time");
            }
        }
        else {
            url.searchParams.delete("period_start_date");
            url.searchParams.delete("period_start_time");
            url.searchParams.delete("period_end_date");
            url.searchParams.delete("period_end_time");
        }

        let doReplaceUrl = false;
        if (this.#aggInputElmt.value != "none") {
            // Just replace page URL when aggregation has not changed while bucket is not defined.
            doReplaceUrl = url.searchParams.has("agg", this.#aggInputElmt.value) && (!url.searchParams.has("bucket_width_value") || !url.searchParams.has("bucket_width_unit"));

            url.searchParams.set("agg", this.#aggInputElmt.value);
            url.searchParams.set("bucket_width_value", this.#bucketElmt.bucketWidthValue);
            url.searchParams.set("bucket_width_unit", this.#bucketElmt.bucketWidthUnit);
        }
        else {
            // Just replace page URL when aggregation is "none" or empty (equals "none").
            doReplaceUrl = url.searchParams.has("agg", "none") || url.searchParams.has("agg", "");

            url.searchParams.delete("agg");
            url.searchParams.delete("bucket_width_value");
            url.searchParams.delete("bucket_width_unit");
        }

        // Set chart settings.
        let compressedChartSettings = compressToEncodedURIComponent(this.#tsSeriesOptions);
        url.searchParams.set("chart", compressedChartSettings);

        // Update current page URL only when different than current one.
        if (doReplaceUrl) {
            window.history.replaceState(null, document.title, url);
        }
        else if (doUpdateUrl && url.toString() != window.location) {
            window.history.pushState(null, document.title, url);
        }

        return Object.fromEntries(url.searchParams);
    }

    #isPeriodCustom() {
        return this.#periodTypeElmt.value == "custom";
    }

    #loadChartSeries(tsIDs) {
        this.#chartExplore.showLoading();

        if (this.#tsDataGetReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataGetReqID);
            this.#tsDataGetReqID = null;
        }

        if (tsIDs == null) {
            tsIDs = Object.keys(this.#tsSeriesOptions);
        }
        if (tsIDs.length > 0 && this.#hasPeriodSelected()) {
            this.#updateUrlParams();

            let urlParams = {
                timeseries: tsIDs,
                data_state: this.#tsDataStatesSelectElmt.value,
                timezone: this.#timezonePickerElmt.tzName,
                period: this.#periodTypeElmt.value,
            };
            urlParams.end_date = this.#periodEndDatetimeElmt.date;
            urlParams.end_time = this.#periodEndDatetimeElmt.time;
            if (this.#isPeriodCustom()) {
                urlParams.start_date = this.#periodStartDatetimeElmt.date;
                urlParams.start_time = this.#periodStartDatetimeElmt.time;
            }
            let aggregation = null;
            if (this.#aggInputElmt.value != "none") {
                urlParams.agg = this.#aggInputElmt.value;
                urlParams.bucket_width_value = this.#bucketElmt.bucketWidthValue;
                urlParams.bucket_width_unit = this.#bucketElmt.bucketWidthUnit;

                aggregation = this.#aggInputElmt.value;
            }

            this.#tsDataGetReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.timeseries.data.retrieve_multiple_data`, urlParams),
                (data) => {
                    // Iterate over each requested timeseries ID (instead of data from internal API response).
                    // The main reason is that, in some cases (and especially with no aggregation requested), data can be empty and therefore chart series are not updated.
                    for (let tsID of tsIDs) {
                        // Get timeseries data or empty structure if not in data from internal API response.
                        let tsData = data[tsID.toString()] || {};
                        // Update timeseries chart series.
                        let seriesID = this.#tsSeriesOptions[tsID].seriesID;
                        this.#chartExplore.updateSeriesData(seriesID, tsData, { aggregation: aggregation });
                        this.#chartExplore.updateSeries(seriesID, this.#tsSeriesOptions[tsID].toChartSeries());
                    }
                    this.#periodTypeLoaded = this.#periodTypeElmt.value;

                    this.#chartExplore.hideLoading();
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");

                    this.#chartExplore.hideLoading();
                },
            );
        }
        else {
            this.#chartExplore.hideLoading();
        }
    }

    #refreshChart(tsID = null, yAxisIndexChanged = false) {
        this.#chartExplore.showLoading();

        // Update chart series (style...).
        if (tsID != null) {
            this.#chartExplore.updateSeries(this.#tsSeriesOptions[tsID].seriesID, this.#tsSeriesOptions[tsID].toChartSeries(), yAxisIndexChanged);
        }
        else {
            // TODO: update all?
        }

        this.#chartExplore.hideLoading();
    }

    #loadChartSettingsFromUrlParam(urlParamValue) {
        if (this.#tsSeriesOptions == null) {
            this.#tsSeriesOptions = {};
        }

        if (urlParamValue != null) {
            let chartSettings = decompressFromEncodedURIComponent(urlParamValue);
            for (let [tsID, tsChartsSeriesOpts] of Object.entries(chartSettings)) {
                let opts = {};
                if (tsChartsSeriesOpts.type == SeriesTypes.line) {
                    opts.style = tsChartsSeriesOpts.style;
                    opts.symbol = tsChartsSeriesOpts.symbol;
                }
                opts.decalName = tsChartsSeriesOpts.decalName;
                this.#tsSeriesOptions[tsID] = new TimeseriesChartSeriesOptions(tsChartsSeriesOpts.tsInfo, tsChartsSeriesOpts.tsDataState, tsChartsSeriesOpts.color, tsChartsSeriesOpts.yAxisPosition, tsChartsSeriesOpts.type, opts);
                this.#tsSeriesOptions[tsID].show = tsChartsSeriesOpts.show;
            }
        }
    }

    mount() {
        // Load chart settings from url paramter.
        let url = new URL(window.location);
        this.#loadChartSettingsFromUrlParam(url.searchParams.get("chart"));

        this.#endDateDefault = this.#periodEndDatetimeElmt.date;
        this.#endTimeDefault = this.#periodEndDatetimeElmt.time;
        this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
        this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;

        this.#updatePeriodCustomState();
        this.#updateAggregationBucketState();

        this.#chartExplore = new TimeseriesChartExplore(this.#chartContainerElmt);

        // Update timeseries selector component with selected timeseries and update chart.
        let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
        this.#tsSelector.select(
            tsIDs,
            () => {
                this.#addTimeseries(this.#tsSelector.selectedItems);
                this.#tsSelector.clearAllSelection();

                if (Object.keys(this.#tsSeriesOptions).length <= 0) {
                    this.#chartSettingsCanvas.show();
                }
            },
        );
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeseriesDataExploreView();
    view.mount();
});

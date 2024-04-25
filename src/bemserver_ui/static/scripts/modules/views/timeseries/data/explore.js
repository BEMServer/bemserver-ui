import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/timeseries/bucketWidth.js";
import "/static/scripts/modules/components/spinner.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import { TimeseriesChartExplore } from "/static/scripts/modules/components/charts/tsChartExplore.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";


// TODO: Maybe those const values could be structures as enums? and general app consts?

const SeriesYAxisPositions = Object.freeze({
    "left": "left",
    "right": "right",
});

const SeriesTypes = Object.freeze({
    "line": "line",
    "bar": "bar",
});

const SeriesLineStyles = Object.freeze({
    "solid": "solid",
    "dashed": "dashed",
    "dotted": "dotted",
});

const SeriesLineSymbols = Object.freeze({
    "emptyCircle": "empty circle",
    "circle": "circle",
    "rect": "rectangle",
    "roundRect": "rounded rectangle",
    "triangle": "triangle",
    "diamond": "diamond",
    "pin": "pin",
    "arrow": "arrow",
    "path://": "none",
});

const SeriesBarDecals = Object.freeze({
    "none": {
        "label": "none",
        "decal": {
            symbol: "path://",
            symbolSize: 1,
            dashArrayX: 5,
            dashArrayY: 5,
            rotation: 0,
        },
    },
    "hash1": {
        "label": "hash type 1",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: [2, 5],
            rotation: Math.PI / 6,
        },
    },
    "dots": {
        "label": "dots",
        "decal": {
            symbol: "circle",
            symbolSize: 0.8,
            dashArrayX: [
                [8, 8],
                [0, 8, 8, 0],
            ],
            dashArrayY: [6, 0],
            rotation: 0,
        },
    },
    "hash2": {
        "label": "hash type 2",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: [4, 3],
            rotation: -Math.PI / 4,
            rotation: 0,
        },
    },
    "hash3": {
        "label": "hash type 3",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [
                [6, 6],
                [0, 6, 6, 0],
            ],
            dashArrayY: [6, 0],
            rotation: 0,
        },
    },
    "hash4": {
        "label": "hash type 4",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [
                [1, 0],
                [1, 6],
            ],
            dashArrayY: [1, 0, 6, 0],
            rotation: Math.PI / 4,
        },
    },
    "lines_horiz": {
        "label": "horizontal lines",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: 10,
            rotation: 0,
        },
    },
});


const defaultSeriesYAxisPosition = "left";
const defaultSeriesType = "line";
const defaultSeriesLineStyle = "solid";
const defaultSeriesLineSymbol = "emptyCircle";
const defaultSeriesBarDecal = "none";


class TimeseriesDataExploreView {

    #internalAPIRequester = null;
    #tsDataStatesReqID = null;
    #tsDataGetReqID = null;

    #chartContainerElmt = null;
    #chartExplore = null;

    #periodTypeElmt = null;
    #periodCustomElmt = null;
    #periodStartDatetimeElmt = null;
    #periodEndDatetimeElmt = null;
    #aggInputElmt = null;
    #bucketElmt = null;

    #chartSettingsCanvas = null;
    #chartSeriesContainerElmt = null;
    #chartSeriesContainerBodyElmt = null;
    #seriesCount = null;
    #removeAllSeriesBtnElmt = null;
    #tsDataStatesSelectElmt = null;
    #timezonePickerElmt = null;

    #selectTimeseriesModalElmt = null;
    #selectTimeseriesModal = null;
    #tsSelector = null;
    #selectTimeseriesYAxisPositionContainerElmt = null;
    #selectTimeseriesSeriesTypeContainerElmt = null;
    #selectedTimeseriesSaveBtnElmt = null;

    #defaultEndDate = null;
    #defaultEndTime = null;
    #defaultTsDataState = "Clean";
    #defaultPeriodType = "last-24-hours";
    #defaultAggregationOperator = "avg";
    #defaultAggregationBucketWidth = {
        "unit": "hour",
        "value": 1,
    }

    #tsSeriesOptions = {};
    #periodTypeLoaded = null;


    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
        this.#initDefaults();
    }

    #cacheDOM() {
        this.#chartContainerElmt = document.getElementById("chartContainer");

        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodCustomElmt = document.getElementById("periodCustom");
        this.#periodStartDatetimeElmt = document.getElementById("start_datetime");
        this.#periodEndDatetimeElmt = document.getElementById("end_datetime");
        this.#aggInputElmt = document.getElementById("agg");
        this.#bucketElmt = document.getElementById("bucket");

        this.#chartSettingsCanvas = new bootstrap.Offcanvas("#chartSettingsPanel");
        this.#chartSeriesContainerElmt = document.getElementById("chartSeriesContainer");
        this.#chartSeriesContainerBodyElmt = this.#chartSeriesContainerElmt.querySelector("tbody");
        this.#seriesCount = document.getElementById("seriesCount");
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

    #initDefaults() {
        this.#periodTypeElmt.value = this.#defaultPeriodType;
        this.#aggInputElmt.value = this.#defaultAggregationOperator;
        this.#bucketElmt.bucketWidthValue = this.#defaultAggregationBucketWidth["unit"];
        this.#bucketElmt.bucketWidthValue = this.#defaultAggregationBucketWidth["value"];
    }

    #initEventListeners() {
        this.#periodTypeElmt.addEventListener("change", () => {
            if (this.#periodTypeElmt.value == "custom") {
                this.#periodCustomElmt.classList.remove("d-none", "invisible");
                this.#periodStartDatetimeElmt.setAttribute("required", true);
                this.#periodEndDatetimeElmt.setAttribute("required", true);

                this.#periodStartDatetimeElmt.focus();
            }
            else {
                this.#periodCustomElmt.classList.add("d-none", "invisible");
                this.#periodStartDatetimeElmt.removeAttribute("required");
                this.#periodEndDatetimeElmt.removeAttribute("required");

                this.#periodEndDatetimeElmt.date = this.#defaultEndDate;
                this.#periodEndDatetimeElmt.time = this.#defaultEndTime;

                if (this.#periodTypeElmt.value != this.#periodTypeLoaded) {
                    this.#loadChartSeries();
                }
            }
        });

        this.#periodStartDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodEndDatetimeElmt.dateMin = this.#periodStartDatetimeElmt.date;
            this.#loadChartSeries();
        }), 1000);

        this.#periodEndDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodStartDatetimeElmt.dateMax = this.#periodEndDatetimeElmt.date;
            this.#loadChartSeries();
        }), 1000);

        this.#aggInputElmt.addEventListener("change", () => {
            this.#updateAggregationBucketState();
            this.#loadChartSeries();
        });

        this.#bucketElmt.addEventListener("change", () => {
            this.#loadChartSeries();
        });

        this.#tsDataStatesSelectElmt.addEventListener("change", () => {
            this.#loadChartSeries();
        });

        this.#timezonePickerElmt.addEventListener("tzChange", () => {
            this.#periodStartDatetimeElmt.tzName = this.#timezonePickerElmt.tzName;
            this.#periodEndDatetimeElmt.tzName = this.#timezonePickerElmt.tzName;
            this.#loadChartSeries();
        });

        this.#tsSelector.addEventListener("toggleItem", () => {
            if (this.#tsSelector.selectedItems.length > 0) {
                this.#selectedTimeseriesSaveBtnElmt.removeAttribute("disabled");
            }
            else {
                this.#selectedTimeseriesSaveBtnElmt.setAttribute("disabled", true);
            }
        });

        this.#selectedTimeseriesSaveBtnElmt.addEventListener("click", () => {
            let seriesYAxisPosition = this.#selectTimeseriesYAxisPositionContainerElmt.querySelector(`input[type="radio"][name="selectTimeseriesYAxisPositionRadioOptions"]:checked`).value;
            let seriesType = this.#selectTimeseriesSeriesTypeContainerElmt.querySelector(`input[type="radio"][name="selectTimeseriesSeriesTypeRadioOptions"]:checked`).value;

            let addedTsIDs = [];
            for (let selectedTimeseries of this.#tsSelector.selectedItems) {
                if (!Object.keys(this.#tsSeriesOptions).includes(selectedTimeseries.id.toString())) {
                    let seriesColor = this.#chartExplore.getNextColor();

                    let tsChartSeriesOpts = new TimeseriesChartSeriesOptions(selectedTimeseries, seriesColor, seriesYAxisPosition, seriesType);
                    let tsSeriesChartOptsRowElmt = this.#createTimeseriesChartOptionsRowElment(tsChartSeriesOpts);
                    this.#chartSeriesContainerBodyElmt.appendChild(tsSeriesChartOptsRowElmt);

                    let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
                    this.#chartExplore.addSeries(chartSeriesParams);

                    this.#tsSeriesOptions[selectedTimeseries.id] = tsChartSeriesOpts;

                    addedTsIDs.push(selectedTimeseries.id);
                }
            }

            this.#selectTimeseriesModal.hide();

            this.#updateSeriesCount();

            if (addedTsIDs.length > 0) {
                // Get timeseries data and draw chart.
                this.#loadChartSeries(addedTsIDs);
            }
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
            this.#updateSeriesCount();
        });

        // Chart explore event listener.
        document.addEventListener("seriesVisibilityChanged", (event) => {
            this.#tsSeriesOptions[event.detail.id].show = event.detail.visibility;
            this.#updateChartSeriesOptionsVisibility(event.detail.id);
        });
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
        return this.#periodTypeElmt.value != "custom" || (this.#periodStartDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.hasDatetime);
    }

    #loadDataStates() {
        this.#tsDataStatesSelectElmt.innerHTML = "";
        let loadingOptionElmt = document.createElement("option");
        loadingOptionElmt.value = "None";
        loadingOptionElmt.innerText = "loading...";
        this.#tsDataStatesSelectElmt.appendChild(loadingOptionElmt);

        if (this.#tsDataStatesReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataStatesReqID);
            this.#tsDataStatesReqID = null;
        }
        this.#tsDataStatesReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.timeseries.datastates.retrieve_list`),
            (data) => {
                this.#tsDataStatesSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    if (option.name == this.#defaultTsDataState) {
                        optionElmt.selected = true;
                    }
                    this.#tsDataStatesSelectElmt.appendChild(optionElmt);
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #createTimeseriesChartOptionsRowElment(tsChartSeriesOpts) {
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
        visibilitySwitchElmt.id = `seriesVisibilitySwitch-${tsChartSeriesOpts.id.toString()}`;
        visibilitySwitchElmt.classList.add("form-check-input");
        visibilitySwitchElmt.type = "checkbox";
        visibilitySwitchElmt.setAttribute("role", "switch");
        visibilitySwitchElmt.checked = true;
        visibilitySwitchContainerElmt.appendChild(visibilitySwitchElmt);

        let colorInputElmt = document.createElement("input");
        colorInputElmt.id = `seriesColorPicker-${tsChartSeriesOpts.id.toString()}`;
        colorInputElmt.type = "color";
        colorInputElmt.classList.add("form-control", "form-control-sm");
        colorInputElmt.value = tsChartSeriesOpts.color;
        colorInputElmt.setAttribute("aria-label", "Select a color");
        colorInputElmt.style.width = "40px";
        colorCellElmt.appendChild(colorInputElmt);

        let seriesNameElmt = document.createElement("small");
        seriesNameElmt.innerText = tsChartSeriesOpts.name;
        nameCellElmt.appendChild(seriesNameElmt);

        let yAxisPositionInputElmt = document.createElement("select");
        yAxisPositionInputElmt.id = `seriesYAxisPositionSelect-${tsChartSeriesOpts.id.toString()}`;
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
        typeInputElmt.id = `seriesTypeSelect-${tsChartSeriesOpts.id.toString()}`;
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
        styleInputElmt.id = `seriesStyleSelect-${tsChartSeriesOpts.id.toString()}`;
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
        symbolInputElmt.id = `seriesSymbolSelect-${tsChartSeriesOpts.id.toString()}`;
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
        decalInputElmt.id = `seriesDecalSelect-${tsChartSeriesOpts.id.toString()}`;
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
        removeBtnElmt.title = `Remove ${tsChartSeriesOpts.name} series`;
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
            this.#tsSeriesOptions[tsChartSeriesOpts.id].show = visibilitySwitchElmt.checked;
            this.#updateChartSeriesOptionsVisibility(tsChartSeriesOpts.id);
            this.#chartExplore.toggleSeriesVisibility(tsChartSeriesOpts.id);
        });

        colorInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].color = colorInputElmt.value;
            this.#refreshChart(tsChartSeriesOpts.id);
        });

        typeInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].type = typeInputElmt.value;
            updateSeriesStyleOptionsFunc();
            this.#refreshChart(tsChartSeriesOpts.id);
        });

        styleInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].style = styleInputElmt.value;
            this.#refreshChart(tsChartSeriesOpts.id);
        });

        symbolInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].symbol = symbolInputElmt.value;
            this.#refreshChart(tsChartSeriesOpts.id);
        });

        decalInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].decalName = decalInputElmt.value;
            this.#refreshChart(tsChartSeriesOpts.id);
        });

        yAxisPositionInputElmt.addEventListener("change", () => {
            this.#tsSeriesOptions[tsChartSeriesOpts.id].yAxisPosition = yAxisPositionInputElmt.value;
            this.#refreshChart(tsChartSeriesOpts.id, true);
        });

        removeBtnElmt.addEventListener("click", () => {
            rowElmt.remove();
            this.#chartExplore.removeSeries(tsChartSeriesOpts.id);
            delete this.#tsSeriesOptions[tsChartSeriesOpts.id];
            this.#updateSeriesCount();
        });

        return rowElmt;
    }

    #updateAggregationBucketState() {
        if (this.#aggInputElmt.value == "none") {
            this.#bucketElmt.setAttribute("disabled", true);
            this.#bucketElmt.parentElement.classList.add("d-none", "invisible");
        }
        else {
            this.#bucketElmt.removeAttribute("disabled");
            this.#bucketElmt.parentElement.classList.remove("d-none", "invisible");
        }
    }

    #updateSeriesCount() {
        let nbSeries = Object.keys(this.#tsSeriesOptions).length;
        if (nbSeries > 0) {
            this.#chartSeriesContainerElmt.parentElement.classList.remove("d-none", "invisible");
            this.#seriesCount.innerText = ` (${nbSeries.toString()})`;
        }
        else {
            this.#chartSeriesContainerElmt.parentElement.classList.add("d-none", "invisible");
            this.#seriesCount.innerText = ``;
        }

        if (nbSeries > 1) {
            this.#removeAllSeriesBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#removeAllSeriesBtnElmt.classList.add("d-none", "invisible");
        }
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
            let urlParams = {
                timeseries: tsIDs,
                data_state: this.#tsDataStatesSelectElmt.value,
                timezone: this.#timezonePickerElmt.tzName,
                period: this.#periodTypeElmt.value,
                end_date: this.#periodEndDatetimeElmt.date,
                end_time: this.#periodEndDatetimeElmt.time,
            };
            if (this.#periodTypeElmt.value == "custom") {
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
                app.urlFor(`api.timeseries.data.retrieve_multiple_data_json`, urlParams),
                (data) => {
                    // Iterate over each requested timeseries ID (instead of data from internal API response).
                    // The main reason is that, in some cases (and especially with no aggregation requested), data can be empty and therefore chart series are not updated.
                    for (let tsID of tsIDs) {
                        // Get timeseries data or empty structure if not in data from internal API response.
                        let tsData = data[tsID.toString()] || {};
                        // Update timeseries chart series.
                        this.#chartExplore.updateSeriesData(tsID, tsData, { aggregation: aggregation });
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
            this.#chartExplore.updateSeries(this.#tsSeriesOptions[tsID].toChartSeries(), yAxisIndexChanged);
        }
        else {
            // TODO: update all?
        }

        this.#chartExplore.hideLoading();
    }

    mount() {
        this.#defaultEndDate = this.#periodEndDatetimeElmt.date;
        this.#defaultEndTime = this.#periodEndDatetimeElmt.time;

        this.#loadDataStates();

        this.#chartExplore = new TimeseriesChartExplore(this.#chartContainerElmt);

        if (Object.keys(this.#tsSeriesOptions).length <= 0) {
            this.#chartSettingsCanvas.show();
        }
    }
}


class TimeseriesChartSeriesOptions {

    #tsData = null;
    #type = defaultSeriesType;
    #style = defaultSeriesLineStyle;
    #symbol = defaultSeriesLineSymbol;
    #yAxisPosition = defaultSeriesYAxisPosition;

    get id() {
        return this.#tsData?.id;
    }

    get name() {
        return this.#tsData?.name;
    }

    get label() {
        return this.#tsData?.label;
    }

    get unitSymbol() {
        return this.#tsData?.unit_symbol;
    }

    get type() {
        return this.#type;
    }
    set type(value) {
        if (Object.keys(SeriesTypes).includes(value)) {
            this.#type = value;
        }
    }

    get style() {
        return this.#style;
    }
    set style(value) {
        if (Object.keys(SeriesLineStyles).includes(value)) {
            this.#style = value;
        }
    }

    get symbol() {
        return this.#symbol;
    }
    set symbol(value) {
        if (Object.keys(SeriesLineSymbols).includes(value)) {
            this.#symbol = value;
        }
    }

    get yAxisPosition() {
        return this.#yAxisPosition;
    }
    set yAxisPosition(value) {
        if (Object.keys(SeriesYAxisPositions).includes(value)) {
            this.#yAxisPosition = value;
        }
    }

    get yAxisIndex() {
        return this.#yAxisPosition == SeriesYAxisPositions.left ? 0 : 1;
    }

    constructor(tsData, color = null, yAxisPosition = defaultSeriesYAxisPosition, type = defaultSeriesType, options = {}) {
        // options:
        //  if type == "line", may contain "style" and "symbol" definition
        //  if type == "bar", may contain "decalName" definition

        this.#tsData = tsData;
        this.color = color;
        this.type = type;
        this.yAxisPosition = yAxisPosition;
        this.show = true;

        if (this.#type == "line") {
            this.style = options.style || defaultSeriesLineStyle;
            this.symbol = options.symbol || defaultSeriesLineSymbol;
        }
        this.decalName = options.decalName || defaultSeriesBarDecal;
    }

    toChartSeries(ignoreColor = false) {
        let series = {
            id: this.id,
            name: this.label,
            type: this.type,
            yAxisIndex: this.yAxisIndex,
            data: [],
            visible: this.show,
            unitSymbol: this.unitSymbol,
        };
        if (!ignoreColor) {
            series.color = this.color;
        }
        if (this.#type == "line") {
            series.lineStyle = {
                type: this.#style,
            };
            series.symbol = this.#symbol;
            series.showSymbol = this.#symbol != "path://";
        }
        else if (this.#type == "bar") {
            series.itemStyle = {
                decal: SeriesBarDecals[this.decalName].decal,
            };
        }

        return series;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeseriesDataExploreView();
    view.mount();
});

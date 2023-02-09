import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { TimeseriesChart } from "../../components/tsChart.js";
import { Spinner } from "../../components/spinner.js";
import { TimeseriesSelector } from "../../components/timeseries/selector.js";


export class TimeseriesDataExploreView {

    #internalAPIRequester = null;
    #tsDataStatesReqID = null;
    #tsDataCSVReqID = null;

    #messagesElmt = null;
    #chartContainerElmt = null;
    #loadBtnElmt = null;
    #timezonePickerElmt = null;
    #startDatetimePickerElmt = null;
    #endDatetimePickerElmt = null;

    #tsDataStatesSelectElmt = null;

    #aggInputElmt = null;
    #bucketElmt = null;

    #chart = null;
    #tsSelector = null;

    #tsParamsContainerElmt = null;

    #tsChartParams = {};

    constructor(options = { height: 400 }) {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorExplore");

        this.#cacheDOM();
        this.#initElements();

        this.#chart = new TimeseriesChart(options);
        this.#chartContainerElmt.innerHTML = "";
        this.#chartContainerElmt.appendChild(this.#chart);

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#chartContainerElmt = document.getElementById("chartContainer");
        this.#loadBtnElmt = document.getElementById("loadBtn");

        this.#tsDataStatesSelectElmt = document.getElementById("data_states");

        this.#timezonePickerElmt = document.getElementById("timezonePicker");
        this.#startDatetimePickerElmt = document.getElementById("start_datetime");
        this.#endDatetimePickerElmt = document.getElementById("end_datetime");

        this.#aggInputElmt = document.getElementById("agg");
        this.#bucketElmt = document.getElementById("bucket");

        this.#tsParamsContainerElmt = document.getElementById("tsParam");
    }

    #initElements() {
        this.#updateLoadBtnState();
        this.#updateAggregationBucketState();

        this.#startDatetimePickerElmt.dateMax = this.#endDatetimePickerElmt.date;
        this.#endDatetimePickerElmt.dateMin = this.#startDatetimePickerElmt.date;
    }

    #addTsParamInputs(tsData) {
        this.#tsChartParams[tsData.itemName] = {
            position : "left",
            type: "line",
            style: "solid",
            color: this.#chart.colors[(this.#tsSelector.selectedItemNames.length - 1) % this.#chart.colors.length],
        };

        let tsParam = document.createElement("div");
        tsParam.id = "tsParam-" + tsData.itemId;

        let row = document.createElement("div");
        row.className = "row d-xl-flex d-grid m-2 mb-3";
        
        let h6 = document.createElement("h6");
        h6.textContent = tsData.itemName;
        
        row.appendChild(h6);

        let col1 = document.createElement("div");
        col1.className = "col pb-2 pb-xl-0";

        let positionSelect = document.createElement("select");
        positionSelect.className = "form-select form-select-sm border border-info";
        positionSelect.name = "position";
        positionSelect.setAttribute("aria-label", "Select a position");

        let positionLeftOption = document.createElement("option");
        positionLeftOption.value = "left";
        positionLeftOption.textContent = "Left";
        positionLeftOption.selected = this.#tsChartParams[tsData.itemName].position == "left";

        let positionRightOption = document.createElement("option");
        positionRightOption.value = "right";
        positionRightOption.textContent = "Right";
        positionRightOption.selected = this.#tsChartParams[tsData.itemName].position == "right";

        positionSelect.appendChild(positionLeftOption);
        positionSelect.appendChild(positionRightOption);

        col1.appendChild(positionSelect);

        let col2 = document.createElement("div");
        col2.className = "col pb-2 pb-xl-0";

        let typeSelect = document.createElement("select");
        typeSelect.className = "form-select form-select-sm border border-info";
        typeSelect.name = "type";
        typeSelect.setAttribute("aria-label", "Select a type of graph");

        let typeLineOption = document.createElement("option");
        typeLineOption.value = "line";
        typeLineOption.textContent = "Line";
        typeLineOption.selected = this.#tsChartParams[tsData.itemName].position == "line";

        let typeBarOption = document.createElement("option");
        typeBarOption.value = "bar";
        typeBarOption.textContent = "Bar";
        typeBarOption.selected = this.#tsChartParams[tsData.itemName].position == "bar";

        typeSelect.appendChild(typeLineOption);
        typeSelect.appendChild(typeBarOption);

        col2.appendChild(typeSelect);

        let col3 = document.createElement("div");
        col3.className = "col pb-2 pb-xl-0";

        let styleSelect = document.createElement("select");
        styleSelect.className = "form-select form-select-sm border border-info";
        styleSelect.name = "style";
        styleSelect.setAttribute("aria-label", "Select a style of line");

        let styleSolidOption = document.createElement("option");
        styleSolidOption.value = "solid";
        styleSolidOption.textContent = "Solid";
        styleSolidOption.selected = this.#tsChartParams[tsData.itemName].position == "solid";

        let styleDashedOption = document.createElement("option");
        styleDashedOption.value = "dashed";
        styleDashedOption.textContent = "Dashed";
        styleDashedOption.selected = this.#tsChartParams[tsData.itemName].position == "dashed";

        let styleDottedOption = document.createElement("option");
        styleDottedOption.value = "dotted";
        styleDottedOption.textContent = "Dotted";
        styleDottedOption.selected = this.#tsChartParams[tsData.itemName].position == "dotted";

        styleSelect.appendChild(styleSolidOption);
        styleSelect.appendChild(styleDashedOption);
        styleSelect.appendChild(styleDottedOption);

        col3.appendChild(styleSelect);

        let col4 = document.createElement("div");
        col4.className = "col pb-2 pb-xl-0";

        let colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.className = "form-control form-control-sm border border-info";
        colorInput.name = "color";
        colorInput.value = this.#chart.colors[(this.#tsSelector.selectedItemNames.length - 1) % this.#chart.colors.length];
        colorInput.setAttribute("aria-label", "Select a color");

        col4.appendChild(colorInput);

        row.appendChild(col1);
        row.appendChild(col2);
        row.appendChild(col3);
        row.appendChild(col4);

        tsParam.appendChild(row);
        this.#tsParamsContainerElmt.appendChild(tsParam);

        positionSelect.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tsChartParams[tsData.itemName].position = positionSelect.value;
        });

        typeSelect.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tsChartParams[tsData.itemName].type = typeSelect.value;
        });

        styleSelect.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tsChartParams[tsData.itemName].style = styleSelect.value;
        });
        
        colorInput.addEventListener("change", (event) => {
            event.preventDefault();

            this.#tsChartParams[tsData.itemName].color = colorInput.value;
        });
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateLoadBtnState();

            if (event.detail.itemIsActive) {
                this.#addTsParamInputs(event.detail);
            }
            else {
                delete this.#tsChartParams[event.detail.itemName];
                
                document.getElementById("tsParam-" + event.detail.itemId)?.remove();      
            }
        });

        this.#timezonePickerElmt.addEventListener("tzChange", (event) => {
            event.preventDefault();

            this.#startDatetimePickerElmt.tzName = this.#timezonePickerElmt.tzName;
            this.#endDatetimePickerElmt.tzName = this.#timezonePickerElmt.tzName;
        });

        this.#startDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();
    
            this.#endDatetimePickerElmt.dateMin = this.#startDatetimePickerElmt.date;
            this.#updateLoadBtnState();
        });

        this.#endDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();
    
            this.#startDatetimePickerElmt.dateMax = this.#endDatetimePickerElmt.date;
            this.#updateLoadBtnState();
        });

        this.#loadBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#refreshChart();
        });

        this.#aggInputElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateAggregationBucketState();
        });
    }

    #updateLoadBtnState() {
        if (this.#tsSelector.selectedItemNames.length > 0 && this.#startDatetimePickerElmt.hasDatetime && this.#endDatetimePickerElmt.hasDatetime) {
            this.#loadBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#loadBtnElmt.setAttribute("disabled", true);
        }
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

    #refreshChart() {
        this.#chart.showLoading();

        let loadBtnInnerBackup = this.#loadBtnElmt.innerHTML;
        this.#loadBtnElmt.innerHTML = "";
        this.#loadBtnElmt.appendChild(new Spinner({ useSmallSize: true, useSecondaryColor: true }));
        this.#loadBtnElmt.setAttribute("disabled", true);

        let urlParams = {
            timeseries: this.#tsSelector.selectedItemNames,
            data_state: this.#tsDataStatesSelectElmt.value,
            start_date: this.#startDatetimePickerElmt.date,
            start_time: this.#startDatetimePickerElmt.time,
            end_date: this.#endDatetimePickerElmt.date,
            end_time: this.#endDatetimePickerElmt.time,
            timezone: this.#timezonePickerElmt.tzName,
        };
        if (this.#aggInputElmt.value != "none") {
            urlParams.agg = this.#aggInputElmt.value;
            urlParams.bucket_width_value = this.#bucketElmt.bucketWidthValue;
            urlParams.bucket_width_unit = this.#bucketElmt.bucketWidthUnit;
        }

        if (this.#tsDataCSVReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataCSVReqID);
            this.#tsDataCSVReqID = null;
        }
        this.#tsDataCSVReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries_data.retrieve_multiple_data`, urlParams),
            (data) => {
                this.#chart.setDownloadCSVLink(flaskES6.urlFor(`timeseries_data.download_multiple`, urlParams));

                let options = {
                    subtitle: this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text,
                    timezone: this.#timezonePickerElmt.tzName,
                    series: this.#tsChartParams,
                };
                
                for(let [tsName, tsParams] of Object.entries(options.series)) {
                    tsParams.symbol = this.#tsSelector.selectedItemSymbols[this.#tsSelector.selectedItemNames.indexOf(tsName)];
                }

                this.#chart.load(data, options);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);

                this.#chart.removeDownloadCSVLink();
            },
            () => {
                this.#loadBtnElmt.innerHTML = loadBtnInnerBackup;
                this.#loadBtnElmt.removeAttribute("disabled");
            },
        );
    }

    refresh() {
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
            flaskES6.urlFor(`api.timeseries_datastates.retrieve_list`),
            (data) => {
                this.#tsDataStatesSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    this.#tsDataStatesSelectElmt.appendChild(optionElmt);
                }
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}

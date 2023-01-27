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
    }

    #initElements() {
        this.#updateLoadBtnState();
        this.#updateAggregationBucketState();

        this.#startDatetimePickerElmt.dateMax = this.#endDatetimePickerElmt.date;
        this.#endDatetimePickerElmt.dateMin = this.#startDatetimePickerElmt.date;
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateLoadBtnState();
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
                this.#chart.load(data, this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text, this.#timezonePickerElmt.tzName);
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

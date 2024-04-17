import { InternalAPIRequest } from "../../../tools/fetcher.js";
import { flaskES6 } from "../../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../../components/flash.js";
import { TimeseriesChartCompleteness } from "../../../components/charts/tsChartCompleteness.js";
import { Spinner } from "../../../components/spinner.js";
import { TimeseriesSelector } from "../../../components/timeseries/selector.js";


export class TimeSeriesDataCompletenessView {

    #internalAPIRequester = null;
    #tsDataStatesReqID = null;
    #tsDataCompletenessReqID = null;

    #messagesElmt = null;
    #chartContainerElmt = null;
    #loadBtnElmt = null;

    #timezonePickerElmt = null;
    #endDatetimePickerElmt = null;
    #tsDataStatesSelectElmt = null;
    #periodElmt = null;

    #chartCompleteness = null;

    #bucketWidthValue = null;
    #bucketWidthUnit = null;
    #shouldDisplayTime = false;

    #tsSelector = null;

    constructor(options = { height: 400 }) {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorCompleteness");

        this.#cacheDOM();
        this.#initElements();

        this.#chartCompleteness = new TimeseriesChartCompleteness(options);
        this.#chartContainerElmt.innerHTML = "";
        this.#chartContainerElmt.appendChild(this.#chartCompleteness);

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#chartContainerElmt = document.getElementById("chartContainer");
        this.#loadBtnElmt = document.getElementById("loadBtn");

        this.#tsDataStatesSelectElmt = document.getElementById("data_states");
        this.#timezonePickerElmt = document.getElementById("timezonePicker");
        this.#endDatetimePickerElmt = document.getElementById("end_datetime");
        this.#periodElmt = document.getElementById("period");
    }

    #initElements() {
        this.#updateLoadBtnState();
        this.#updateBucketWidth();
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateLoadBtnState();
        });

        this.#timezonePickerElmt.addEventListener("tzChange", (event) => {
            event.preventDefault();

            this.#endDatetimePickerElmt.tzName = this.#timezonePickerElmt.tzName;
        });

        this.#endDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();
    
            this.#updateLoadBtnState();
        });

        this.#periodElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateBucketWidth();
        });
    
        this.#loadBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.refreshChart();
        });
    }

    #updateLoadBtnState() {
        if (this.#tsSelector.selectedItems.length > 0 && this.#endDatetimePickerElmt.hasDatetime) {
            this.#loadBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#loadBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateBucketWidth() {
        this.#bucketWidthValue = 1;
        this.#bucketWidthUnit = null;
        this.#shouldDisplayTime = false;
        if (this.#periodElmt.value.endsWith("-Hourly")) {
            this.#bucketWidthUnit = "hour";
            this.#shouldDisplayTime = true;
        }
        else if (this.#periodElmt.value.endsWith("-Daily")) {
            this.#bucketWidthUnit = "day";
        }
        else if (this.#periodElmt.value.endsWith("-Monthly")) {
            this.#bucketWidthUnit = "month";
        }
    }

    refreshChart() {
        this.#chartCompleteness.showLoading();

        let loadBtnInnerBackup = this.#loadBtnElmt.innerHTML;
        this.#loadBtnElmt.innerHTML = "";
        this.#loadBtnElmt.appendChild(new Spinner({ useSmallSize: true, useSecondaryColor: true }));
        this.#loadBtnElmt.setAttribute("disabled", "true");

        let urlParams = {
            timeseries: this.#tsSelector.selectedItems.map(ts => ts.id),
            data_state: this.#tsDataStatesSelectElmt.value,
            bucket_width_value: this.#bucketWidthValue,
            bucket_width_unit: this.#bucketWidthUnit,
            end_date: this.#endDatetimePickerElmt.date,
            end_time: this.#endDatetimePickerElmt.time,
            timezone: this.#timezonePickerElmt.tzName,
            period: this.#periodElmt.value,
        };

        if (this.#tsDataCompletenessReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataCompletenessReqID);
            this.#tsDataCompletenessReqID = null;
        }

        this.#tsDataCompletenessReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.analysis.completeness.retrieve_completeness`, urlParams),
            (data) => {
                this.#chartCompleteness.load(data, this.#shouldDisplayTime, this.#timezonePickerElmt.tzName);
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true });
                this.#messagesElmt.appendChild(flashMsgElmt);

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
            flaskES6.urlFor(`api.timeseries.datastates.retrieve_list`),
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
                let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true });
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}

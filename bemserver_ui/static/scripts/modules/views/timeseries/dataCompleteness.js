import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { TimeseriesCompletenessChart } from "../../components/tsCompChart.js";
import { Spinner } from "../../components/spinner.js";

function days_year(year) {
    if (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) {
        return 366;
    }
    return 365;
}

function days_month(year, month) {
    if (month == 2) {
        return days_year(year);
    }
    if (month == 4 || month == 6 || month == 9 || month == 11) {
        return 30;
    }
    return 31;
}
class TimeSeriesDataCompletenessView {

    #internalAPIRequester = null;
    #tsDataStatesReqID = null;
    #tsDataCompletenessReqID = null;

    #messagesElmt = null;
    #chartContainerElmt = null;
    #loadBtnElmt = null;
    #endDateElmt = null;
    #endTimeElmt = null;
    #tsDataStatesSelectElmt = null;
    #periodElmt = null;

    #chart = null;

    #startDateTime = null;
    #endTime = null;
    #bucketWidthValue = null;
    #bucketWidthUnit = null;

    #tsSelectorView = null;

    constructor(tsSelectorView, options = { height: 400 }) {
        this.#tsSelectorView = tsSelectorView;

        this.#cacheDOM();
        this.#initElements();

        this.#chart = new TimeseriesCompletenessChart();
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

        this.#periodElmt = document.getElementById("period");
        this.#endDateElmt = document.getElementById("end_date");
        this.#endTimeElmt = document.getElementById("end_time");
    }

    #initApiParams() {
        if (this.#endDateElmt.value != this.#endTime.toISOString().split("T")[0] || this.#endTimeElmt.value != this.#endTime.toISOString().substring(11, 16)) {
            this.#endTime = new Date(`${this.#endDateElmt.value}T${this.#endTimeElmt.value}Z`);
        }

        if (this.#periodElmt.value == "Day-Hourly") {
            this.#startDateTime = new Date(this.#endTime.getTime() - 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "hour";
        }
        else if (this.#periodElmt.value == "Week-Daily") {
            this.#startDateTime = new Date(this.#endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "day";
        }
        else if (this.#periodElmt.value == "Week-Hourly") {
            this.#startDateTime = new Date(this.#endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "hour";
        }
        else if (this.#periodElmt.value == "Month-Daily") {
            this.#startDateTime = new Date(this.#endTime.getTime() - days_month(this.#endTime.getYear() + 1900, this.#endTime.getMonth() + 1) * 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "day";
        }
        else if (this.#periodElmt.value == "Year-Monthly") {
            this.#startDateTime = new Date(this.#endTime.getTime() - days_year(this.#endTime.getYear() + 1900) * 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "month";
        }
        else if (this.#periodElmt.value == "Year-Daily") {
            this.#startDateTime = new Date(this.#endTime.getTime() - days_year(this.#endTime.getYear() + 1900) * 24 * 60 * 60 * 1000);
            this.#bucketWidthValue = 1;
            this.#bucketWidthUnit = "day";
        }
    }

    #initElements() {
        this.#loadBtnElmt.setAttribute("disabled", "true");
        this.#endTime = new Date(Date.now());
        this.#endDateElmt.value = this.#endTime.toISOString().split("T")[0];
        this.#endTimeElmt.value = this.#endTime.toISOString().substring(11, 16);
    }

    #initEventListeners() {
        this.#periodElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#periodElmt.setAttribute("min", this.#periodElmt.value);
        });
    
        this.#loadBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            if (this.#tsSelectorView.selectedItems.length > 0) {
                this.refreshChart(this.#tsSelectorView.selectedItems[0]);
            }
            else {
                let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.WARNING, text: `No timeseries selected!`, isDismissible: true });
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        });
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

                this.#loadBtnElmt.removeAttribute("disabled");
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true });
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }

    refreshChart(tsId) {
        this.#chart.showLoading();

        let loadBtnInnerBackup = this.#loadBtnElmt.innerHTML;
        this.#loadBtnElmt.innerHTML = "";
        this.#loadBtnElmt.appendChild(new Spinner({ useSmallSize: true, useSecondaryColor: true }));
        this.#loadBtnElmt.setAttribute("disabled", "true");

        let tsDataStateId = this.#tsDataStatesSelectElmt.value;
        let timeseries = this.#tsSelectorView.selectedItems;

        this.#initApiParams();
        let urlParams = { start_time: this.#startDateTime.toISOString(), end_time: this.#endTime.toISOString(), timeseries: timeseries, data_state: tsDataStateId, bucket_width_value: this.#bucketWidthValue, bucket_width_unit: this.#bucketWidthUnit, bucket_width_value: this.#bucketWidthValue };

        if (this.#tsDataCompletenessReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataCompletenessReqID);
            this.#tsDataCompletenessReqID = null;
        }

        this.#tsDataCompletenessReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.analysis.retrieve_completeness`, urlParams),
            (data) => {
                let displayTime = (this.#bucketWidthUnit == "hour");
                this.#chart.load(data, displayTime);
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
}


export { TimeSeriesDataCompletenessView };

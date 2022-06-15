import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { TimeseriesChart } from "../../components/tsChart.js";
import { Spinner } from "../../components/spinner.js";


class TimeseriesDataExploreView {

    #messagesElmt = null;
    #chartContainerElmt = null;
    #loadBtnElmt = null;
    #startDateElmt = null;
    #startTimeElmt = null;
    #endDateElmt = null;
    #endTimeElmt = null;

    #tsDataStatesSelectElmt = null;

    #aggInputElmt = null;
    #durationInputElmt = null;
    #durationDefault = "1 day";

    #chart = null;
    #fetcher = null;

    #startTime = null;
    #endTime = null;

    #tsSelectorView = null;

    constructor(tsSelectorView, options = { height: 400 }) {
        this.#tsSelectorView = tsSelectorView;

        this.#cacheDOM();

        this.#initElements();

        this.#chart = new TimeseriesChart();
        this.#chartContainerElmt.innerHTML = "";
        this.#chartContainerElmt.appendChild(this.#chart);

        this.#fetcher = new Fetcher();

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#chartContainerElmt = document.getElementById("chartContainer");
        this.#loadBtnElmt = document.getElementById("loadBtn");

        this.#tsDataStatesSelectElmt = document.getElementById("data_states");

        this.#startDateElmt = document.getElementById("start_date");
        this.#startTimeElmt = document.getElementById("start_time");
        this.#endDateElmt = document.getElementById("end_date");
        this.#endTimeElmt = document.getElementById("end_time");

        this.#aggInputElmt = document.getElementById("agg");
        this.#durationInputElmt = document.getElementById("duration");
    }

    #initElements() {
        this.#durationInputElmt.setAttribute("placeholder", this.#durationDefault);

        this.#loadBtnElmt.setAttribute("disabled", "true");

        this.#endTime = new Date(Date.now());
        this.#startTime = new Date();
        this.#startTime.setDate(this.#endTime.getDate() - 7);

        let startTimeISO = this.#startTime.toISOString();
        let endTimeISO = this.#endTime.toISOString();

        if (this.#startDateElmt.value == "") {
            this.#startDateElmt.value = startTimeISO.split("T")[0];
        }
        if (this.#startTimeElmt.value == "") {
            this.#startTimeElmt.value = startTimeISO.substring(11, 16);
        }

        if (this.#endDateElmt.value == "") {
            this.#endDateElmt.value = endTimeISO.split("T")[0];
        }
        if (this.#endTimeElmt.value == "") {
            this.#endTimeElmt.value = endTimeISO.substring(11, 16);
        }

        this.#startDateElmt.setAttribute("max", this.#endDateElmt.value);
        this.#endDateElmt.setAttribute("min", this.#startDateElmt.value);
    }

    #initEventListeners() {
        this.#startDateElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#endDateElmt.setAttribute("min", this.#startDateElmt.value);
        });

        this.#endDateElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#startDateElmt.setAttribute("max", this.#endDateElmt.value);
        });

        this.#loadBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            if (this.#tsSelectorView.selectedItems.length > 0) {
                this.refreshChart(this.#tsSelectorView.selectedItems[0]);
            }
            else {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.WARNING, text: `No timeseries selected!`, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        });

        this.#aggInputElmt.addEventListener("change", (event) => {
            event.preventDefault();

            if (this.#aggInputElmt.value != "none" && this.#durationInputElmt.value == "") {
                this.#durationInputElmt.value = this.#durationDefault;
            }
        });
    }

    refresh() {
        this.#tsDataStatesSelectElmt.innerHTML = "";
        let loadingOptionElmt = document.createElement("option");
        loadingOptionElmt.value = "None";
        loadingOptionElmt.innerText = "loading...";
        this.#tsDataStatesSelectElmt.appendChild(loadingOptionElmt);

        let getTsDataStatesListPromise = this.#fetcher.get(flaskES6.urlFor(`api.timeseries_datastates.retrieve_list`));

        getTsDataStatesListPromise.then(
            (data) => {
                this.#tsDataStatesSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    this.#tsDataStatesSelectElmt.appendChild(optionElmt);
                }

                this.#loadBtnElmt.removeAttribute("disabled");
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        );
    }

    refreshChart(tsId) {
        this.#chart.showLoading();

        let loadBtnInnerBackup = this.#loadBtnElmt.innerHTML;
        this.#loadBtnElmt.innerHTML = "";
        this.#loadBtnElmt.appendChild(new Spinner({ useSmallSize: true, useSecondaryColor: true }));
        this.#loadBtnElmt.setAttribute("disabled", "true");

        // Get full start/end times.
        if (this.#startDateElmt.value != this.#startTime.toISOString().split("T")[0] || this.#startTimeElmt.value != this.#startTime.toISOString().substring(11, 16)) {
            this.#startTime = new Date(`${this.#startDateElmt.value}T${this.#startTimeElmt.value}Z`);
        }
        if (this.#endDateElmt.value != this.#endTime.toISOString().split("T")[0] || this.#endTimeElmt.value != this.#endTime.toISOString().substring(11, 16)) {
            this.#endTime = new Date(`${this.#endDateElmt.value}T${this.#endTimeElmt.value}Z`);
        }

        if (this.#aggInputElmt.value != "none" && this.#durationInputElmt.value == "") {
            this.#durationInputElmt.value = this.#durationDefault;
        }

        let tsDataStateId = this.#tsDataStatesSelectElmt.value;
        let urlParams = {id: tsId, data_state: tsDataStateId, start_time: this.#startTime.toISOString(), end_time: this.#endTime.toISOString(), agg: this.#aggInputElmt.value, duration: this.#durationInputElmt.value};
        this.#fetcher.get(flaskES6.urlFor(`api.timeseries_data.retrieve_data`, urlParams)).then(
            (data) => {
                this.#chart.setDownloadCSVLink(flaskES6.urlFor(`timeseries_data.download`, urlParams));
                this.#chart.load(data);
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);

                this.#chart.removeDownloadCSVLink();
            }
        ).finally(
            () => {
                this.#loadBtnElmt.innerHTML = loadBtnInnerBackup;
                this.#loadBtnElmt.removeAttribute("disabled");
            }
        );
    }
}


export { TimeseriesDataExploreView };

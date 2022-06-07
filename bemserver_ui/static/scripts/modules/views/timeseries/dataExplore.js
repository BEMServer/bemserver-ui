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

    #tsSelectContainerElmt = null;
    #tsSelectElmt = null;

    #tsDataStatesContainerElmt = null;
    #tsDataStatesSelectElmt = null;

    #aggInputElmt = null;
    #durationInputElmt = null;
    #durationDefault = "1 day";

    #chart = null;
    #fetcher = null;

    #startTime = null;
    #endTime = null;

    constructor(options = { height: 400 }) {
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

        this.#tsSelectContainerElmt = document.getElementById("tsSelectContainer");
        this.#tsDataStatesContainerElmt = document.getElementById("tsDataStatesContainer");

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

        this.#tsSelectElmt = document.createElement("select");
        this.#tsSelectElmt.classList.add("form-select");
        this.#tsSelectElmt.setAttribute("aria-label", "Select a timeseries");

        this.#tsDataStatesSelectElmt = document.createElement("select");
        this.#tsDataStatesSelectElmt.classList.add("form-select");
        this.#tsDataStatesSelectElmt.setAttribute("aria-label", "Select a timeseries data state");

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

            this.refreshChart();
        });

        this.#aggInputElmt.addEventListener("change", (event) => {
            event.preventDefault();

            if (this.#aggInputElmt.value != "none" && this.#durationInputElmt.value == "") {
                this.#durationInputElmt.value = this.#durationDefault;
            }
        });
    }

    refresh() {
        this.#tsSelectContainerElmt.innerHTML = "";
        this.#tsSelectContainerElmt.appendChild(new Spinner({ useSmallSize: true }))

        this.#tsDataStatesContainerElmt.innerHTML = "";
        this.#tsDataStatesContainerElmt.appendChild(new Spinner({ useSmallSize: true }));

        let getTsListPromise = this.#fetcher.get(flaskES6.urlFor(`api.timeseries.retrieve_list`, { page_size: 100 }));
        let getTsDataStatesListPromise = this.#fetcher.get(flaskES6.urlFor(`api.timeseries_datastates.retrieve_list`));

        getTsListPromise.then(
            (data) => {
                this.#tsSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    this.#tsSelectElmt.appendChild(optionElmt);
                }

                this.#tsSelectContainerElmt.innerHTML = "";
                if (this.#tsSelectElmt.childElementCount <= 0) {
                    this.#tsSelectContainerElmt.innerHTML = `<p class="fst-italic text-center text-muted">No timeseries</p>`;
                }
                else {
                    let inputGrouElmt = document.createElement("div");
                    inputGrouElmt.classList.add("input-group");
                    let inputGroupTextElmt = document.createElement("span");
                    inputGroupTextElmt.classList.add("input-group-text");
                    inputGroupTextElmt.innerText = "Timeseries";
                    inputGrouElmt.appendChild(inputGroupTextElmt);
                    inputGrouElmt.appendChild(this.#tsSelectElmt);
                    this.#tsSelectContainerElmt.appendChild(inputGrouElmt);
                }
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        );

        getTsDataStatesListPromise.then(
            (data) => {
                this.#tsDataStatesSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    this.#tsDataStatesSelectElmt.appendChild(optionElmt);
                }

                this.#tsDataStatesContainerElmt.innerHTML = "";
                if (this.#tsDataStatesSelectElmt.childElementCount <= 0) {
                    this.#tsDataStatesContainerElmt.innerHTML = `<p class="fst-italic text-center text-muted">No data states</p>`;
                }
                else {
                    let inputGrouElmt = document.createElement("div");
                    inputGrouElmt.classList.add("input-group");
                    let inputGroupTextElmt = document.createElement("span");
                    inputGroupTextElmt.classList.add("input-group-text");
                    inputGroupTextElmt.innerText = "Timeseries data state";
                    inputGrouElmt.appendChild(inputGroupTextElmt);
                    inputGrouElmt.appendChild(this.#tsDataStatesSelectElmt);
                    this.#tsDataStatesContainerElmt.appendChild(inputGrouElmt);
                }
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        );

        Promise.all([getTsListPromise, getTsDataStatesListPromise]).then(() => {
            if (this.#tsSelectElmt.childElementCount > 0 && this.#tsDataStatesSelectElmt.childElementCount > 0) {
                this.#loadBtnElmt.removeAttribute("disabled");

                this.refreshChart();
            }
        });
    }

    refreshChart() {
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

        let tsId = this.#tsSelectElmt.value;
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

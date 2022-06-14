import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";


class TimeseriesDeleteView {

    #messagesElmt = null;

    #dataStatesElmt = null;
    #startDateElmt = null;
    #startTimeElmt = null;
    #endDateElmt = null;
    #endTimeElmt = null;

    #deleteBtnElmt = null;

    #tsSelectorView = null;

    #startTime = null;
    #endTime = null;

    constructor(tsSelectorView) {
        this.#tsSelectorView = tsSelectorView;

        this.#cacheDOM();
        this.#initElements();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#dataStatesElmt = document.getElementById("data_states");
        this.#startDateElmt = document.getElementById("start_date");
        this.#startTimeElmt = document.getElementById("start_time");
        this.#endDateElmt = document.getElementById("end_date");
        this.#endTimeElmt = document.getElementById("end_time");

        this.#deleteBtnElmt = document.getElementById("delete");
    }

    #initElements() {
        let dateNow = new Date(Date.now());
        this.#endTime = new Date(Date.UTC(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate()));
        this.#startTime = new Date(Date.UTC(this.#endTime.getUTCFullYear(), this.#endTime.getUTCMonth(), this.#endTime.getDate() - 1));

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

        this.#deleteBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            if (this.#tsSelectorView.selectedItems.length > 0) {
                // Get full start/end times.
                if (this.#startDateElmt.value != this.#startTime.toISOString().split("T")[0] || this.#startTimeElmt.value != this.#startTime.toISOString().substring(11, 16)) {
                    this.#startTime = new Date(`${this.#startDateElmt.value}T${this.#startTimeElmt.value}Z`);
                }
                if (this.#endDateElmt.value != this.#endTime.toISOString().split("T")[0] || this.#endTimeElmt.value != this.#endTime.toISOString().substring(11, 16)) {
                    this.#endTime = new Date(`${this.#endDateElmt.value}T${this.#endTimeElmt.value}Z`);
                }

                let deleteModalConfirm = new ModalConfirm(
                    event.target.id,
                    `Remove data for <mark>${this.#tsSelectorView.selectedItems.length.toString()}</mark> timeseries between ${this.#startTime.toLocaleString(navigator.language, {timeZone: "UTC", timeZoneName: "short"})} and ${this.#endTime.toLocaleString(navigator.language, {timeZone: "UTC", timeZoneName: "short"})}`,
                    () => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.INFO, text: `Deleting timeseries data.`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);

                        let fetcher = new Fetcher();
                        fetcher.post(flaskES6.urlFor(`api.timeseries_data.delete_data`), {start_time: this.#startTime.toISOString(), end_time: this.#endTime.toISOString(), data_state: this.#dataStatesElmt.value, timeseries_ids: this.#tsSelectorView.selectedItems}).then(
                            (data) => {
                                let flashMsgElmt = null;
                                if (data.success) {
                                    flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `Timeseries data are now deleted!`, isDismissible: true});
                                }
                                else {
                                    flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: `An error occured while deleting timeseries data!`, isDismissible: true});
                                }
                                if (flashMsgElmt != null)
                                {
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                }
                            }
                        ).catch(
                            (error) => {
                                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                this.#messagesElmt.appendChild(flashMsgElmt);
                            }
                        );
                    },
                    () => {
                        deleteModalConfirm.remove();
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.INFO, text: `Operation canceled.`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
                document.body.appendChild(deleteModalConfirm);

                deleteModalConfirm.show();
            }
            else {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.WARNING, text: `No items selected to delete!`, isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        });
    }

    refresh(options = {}) {
        let optionLoadingElmt = document.createElement("option");
        optionLoadingElmt.value = "None";
        optionLoadingElmt.innerText = "loading...";
        this.#dataStatesElmt.appendChild(optionLoadingElmt);

        let fetcher = new Fetcher();
        fetcher.get(flaskES6.urlFor(`api.timeseries_datastates.retrieve_list`)).then(
            (data) => {
                this.#dataStatesElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id.toString();
                    optionElmt.innerText = option.name;
                    this.#dataStatesElmt.appendChild(optionElmt);
                }
            }
        ).catch(
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            }
        );
    }
}


export { TimeseriesDeleteView };

import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { TimeDisplay } from "../../tools/time.js";
import { flaskES6 } from "../../../app.js";


class TimeseriesDeleteView {

    #internalAPIRequester = null;
    #getDataStatesReqID = null;
    #messagesElmt = null;

    #dataStatesElmt = null;
    #startDateElmt = null;
    #startTimeElmt = null;
    #endDateElmt = null;
    #endTimeElmt = null;

    #deleteBtnElmt = null;

    #tsSelector = null;

    #startTime = null;
    #endTime = null;

    constructor(tsSelector) {
        this.#tsSelector = tsSelector;

        this.#internalAPIRequester = new InternalAPIRequest();

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
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            if (this.#tsSelector.selectedItems.length > 0) {
                this.#deleteBtnElmt.removeAttribute("disabled");
            }
            else {
                this.#deleteBtnElmt.setAttribute("disabled", true);
            }
        });

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

            if (this.#tsSelector.selectedItems.length > 0) {
                // Get full start/end times.
                if (this.#startDateElmt.value != this.#startTime.toISOString().split("T")[0] || this.#startTimeElmt.value != this.#startTime.toISOString().substring(11, 16)) {
                    this.#startTime = new Date(`${this.#startDateElmt.value}T${this.#startTimeElmt.value}Z`);
                }
                if (this.#endDateElmt.value != this.#endTime.toISOString().split("T")[0] || this.#endTimeElmt.value != this.#endTime.toISOString().substring(11, 16)) {
                    this.#endTime = new Date(`${this.#endDateElmt.value}T${this.#endTimeElmt.value}Z`);
                }

                let deleteModalConfirm = new ModalConfirm(
                    event.target.id,
                    `Remove data for <mark>${this.#tsSelector.selectedItems.length.toString()}</mark> timeseries between ${TimeDisplay.toLocaleString(this.#startTime)} and ${TimeDisplay.toLocaleString(this.#endTime)}`,
                    () => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.INFO, text: `Deleting timeseries data.`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);

                        this.#internalAPIRequester.post(
                            flaskES6.urlFor(`api.timeseries_data.delete_data`),
                            {start_time: this.#startTime.toISOString(), end_time: this.#endTime.toISOString(), data_state: this.#dataStatesElmt.value, timeseries_ids: this.#tsSelector.selectedItems},
                            (data) => {
                                let flashMsgElmt = null;
                                if (data.success) {
                                    flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `Timeseries data are now deleted!`, isDismissible: true});
                                }
                                else {
                                    flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: `An error occured while deleting timeseries data!`, isDismissible: true});
                                }
                                if (flashMsgElmt != null) {
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                }
                            },
                            (error) => {
                                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                                this.#messagesElmt.appendChild(flashMsgElmt);
                            },
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
        });
    }

    refresh() {
        let optionLoadingElmt = document.createElement("option");
        optionLoadingElmt.value = "None";
        optionLoadingElmt.innerText = "loading...";
        this.#dataStatesElmt.appendChild(optionLoadingElmt);

        if (this.#getDataStatesReqID != null) {
            this.#internalAPIRequester.abort(this.#getDataStatesReqID);
            this.#getDataStatesReqID = null;
        }
        this.#getDataStatesReqID = this.#internalAPIRequester.get(
            flaskES6.urlFor(`api.timeseries_datastates.retrieve_list`),
            (data) => {
                this.#dataStatesElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id.toString();
                    optionElmt.innerText = option.name;
                    this.#dataStatesElmt.appendChild(optionElmt);
                }
            },
            (error) => {
                let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                this.#messagesElmt.appendChild(flashMsgElmt);
            },
        );
    }
}


export { TimeseriesDeleteView };

import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { TimeseriesSelector } from "../../components/timeseries/selector.js";


export class TimeseriesDeleteView {

    #internalAPIRequester = null;
    #getDataStatesReqID = null;
    #messagesElmt = null;

    #delFormElmt = null;
    #dataStatesElmt = null;
    #tzPickerElmt = null;
    #startDatetimePickerElmt = null;
    #endDatetimePickerElmt = null;

    #deleteBtnElmt = null;

    #tsSelector = null;

    constructor() {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorDelete");

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#delFormElmt = document.getElementById("delForm");
        this.#dataStatesElmt = document.getElementById("data_states");
        this.#tzPickerElmt = document.getElementById("timezonePicker");
        this.#startDatetimePickerElmt = document.getElementById("start_datetime");
        this.#endDatetimePickerElmt = document.getElementById("end_datetime");

        this.#deleteBtnElmt = document.getElementById("delete");
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateDeleteBtnState();
        });

        this.#tzPickerElmt.addEventListener("tzChange", (event) => {
            event.preventDefault();

            this.#startDatetimePickerElmt.tzName = event.detail.tzName;
            this.#endDatetimePickerElmt.tzName = event.detail.tzName;
        });

        this.#startDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();
    
            this.#endDatetimePickerElmt.dateMin = this.#startDatetimePickerElmt.date;
        });

        this.#startDatetimePickerElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#updateDeleteBtnState();
        });

        this.#endDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();
    
            this.#startDatetimePickerElmt.dateMax = this.#endDatetimePickerElmt.date;
        });

        this.#endDatetimePickerElmt.addEventListener("datetimeChange", (event) => {
            event.preventDefault();

            this.#updateDeleteBtnState();
        });

        this.#deleteBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            if (!this.#deleteBtnElmt.hasAttribute("disabled")) {
                if (!this.#delFormElmt.checkValidity()) {
                    this.#delFormElmt.reportValidity();
                }
                else {
                    let deleteModalConfirm = new ModalConfirm(
                        event.target.id,
                        `Remove data for <mark>${this.#tsSelector.selectedItems.length.toString()}</mark> timeseries between ${this.#startDatetimePickerElmt.date} and ${this.#endDatetimePickerElmt.date}`,
                        () => {
                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.INFO, text: `Deleting timeseries data.`, isDismissible: true, isTimed: false});
                            this.#messagesElmt.appendChild(flashMsgElmt);

                            let jsonData = {
                                timezone: this.#tzPickerElmt.tzName,
                                start_date: this.#startDatetimePickerElmt.date,
                                start_time: this.#startDatetimePickerElmt.time,
                                end_date: this.#endDatetimePickerElmt.date,
                                end_time: this.#endDatetimePickerElmt.time,
                                data_state: this.#dataStatesElmt.value,
                                timeseries_ids: this.#tsSelector.selectedItems.map(ts => ts.id),
                            };

                            this.#internalAPIRequester.post(
                                flaskES6.urlFor(`api.timeseries.data.delete_data`),
                                jsonData,
                                (data) => {
                                    let flashMsgElmt = null;
                                    if (data.success) {
                                        flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `Timeseries data are now deleted!`, isDismissible: true, isTimed: false});
                                    }
                                    else {
                                        flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: `An error occured while deleting timeseries data!`, isDismissible: true, isTimed: false});
                                    }
                                    if (flashMsgElmt != null) {
                                        this.#messagesElmt.appendChild(flashMsgElmt);
                                    }
                                },
                                (error) => {
                                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true, isTimed: false});
                                    this.#messagesElmt.appendChild(flashMsgElmt);
                                },
                            );
                        },
                        () => {
                            deleteModalConfirm.remove();
                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.INFO, text: `Operation canceled.`, isDismissible: true, isTimed: false});
                            this.#messagesElmt.appendChild(flashMsgElmt);
                        },
                    );
                    document.body.appendChild(deleteModalConfirm);

                    deleteModalConfirm.show();
                }
            }
        });
    }

    #updateDeleteBtnState() {
        let disabled = true;
        if (this.#tsSelector.selectedItems.length > 0 && this.#startDatetimePickerElmt.hasDatetime && this.#endDatetimePickerElmt.hasDatetime) {
            disabled = false;
        }

        if (disabled) {
            this.#deleteBtnElmt.setAttribute("disabled", true);
        }
        else {
            this.#deleteBtnElmt.removeAttribute("disabled");
        }
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
            flaskES6.urlFor(`api.timeseries.datastates.retrieve_list`),
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

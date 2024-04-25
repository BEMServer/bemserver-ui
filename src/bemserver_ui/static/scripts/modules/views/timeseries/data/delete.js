import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { ModalConfirm } from "/static/scripts/modules/components/modalConfirm.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/spinner.js";


class TimeseriesDeleteView {

    #internalAPIRequester = null;
    #getDataStatesReqID = null;

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
                            app.flashMessage(`Deleting timeseries data.`, "info", 5);

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
                                app.urlFor(`api.timeseries.data.delete_data`),
                                jsonData,
                                (data) => {
                                    if (data.success) {
                                        app.flashMessage(`Timeseries data are now deleted!`, "success", 5);
                                    }
                                    else {
                                        app.flashMessage(`An error occured while deleting timeseries data!`, "error");
                                    }
                                },
                                (error) => {
                                    app.flashMessage(error.toString(), "error");
                                },
                            );
                        },
                        () => {
                            deleteModalConfirm.remove();
                            app.flashMessage(`Operation canceled.`, "info", 5);
                        },
                    );
                    document.body.appendChild(deleteModalConfirm);

                    deleteModalConfirm.show();
                }
            }
        });
    }

    #updateDeleteBtnState() {
        if (this.#tsSelector.selectedItems.length > 0 && this.#startDatetimePickerElmt.hasDatetime && this.#endDatetimePickerElmt.hasDatetime) {
            this.#deleteBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#deleteBtnElmt.setAttribute("disabled", true);
        }
    }

    mount() {
        let optionLoadingElmt = document.createElement("option");
        optionLoadingElmt.value = "None";
        optionLoadingElmt.innerText = "loading...";
        this.#dataStatesElmt.appendChild(optionLoadingElmt);

        if (this.#getDataStatesReqID != null) {
            this.#internalAPIRequester.abort(this.#getDataStatesReqID);
            this.#getDataStatesReqID = null;
        }
        this.#getDataStatesReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.timeseries.datastates.retrieve_list`),
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
                app.flashMessage(error.toString(), "error");
            },
        );
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeseriesDeleteView();
    view.mount();
});

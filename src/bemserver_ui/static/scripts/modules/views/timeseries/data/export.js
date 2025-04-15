import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/spinner.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";
import "/static/scripts/modules/components/timeseries/bucketWidth.js";


class TimeseriesExportView {

    #internalAPIRequester = null;
    #getDataStatesReqID = null;
    #downloadReqID = null;

    #filenameInputElmt = null;
    #dataStatesElmt = null;
    #tzPickerElmt = null;
    #periodTypeElmt = null;
    #periodCustomElmt = null;
    #periodStartDatetimeElmt = null;
    #periodEndDatetimeElmt = null;
    #aggInputElmt = null;
    #bucketElmt = null;
    #exportBtnElmt = null;
    #exportSpinnerElmt = null;

    #tsSelector = null;
    #endDateDefault = null;
    #endTimeDefault = null;
    #endDateCustomBackup = null;
    #endTimeCustomBackup = null;

    constructor() {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorExport");
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#filenameInputElmt = document.getElementById("filename");
        this.#dataStatesElmt = document.getElementById("data_states");
        this.#tzPickerElmt = document.getElementById("timezonePicker");
        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodCustomElmt = document.getElementById("periodCustom");
        this.#periodStartDatetimeElmt = document.getElementById("start_datetime");
        this.#periodEndDatetimeElmt = document.getElementById("end_datetime");
        this.#aggInputElmt = document.getElementById("agg");
        this.#bucketElmt = document.getElementById("bucket");
        this.#exportBtnElmt = document.getElementById("exportBtn");
        this.#exportSpinnerElmt = document.getElementById("exportSpinner");
    }

    #initEventListeners() {
        this.#filenameInputElmt.addEventListener("input", debounce(() => {
            this.#updateExportBtnState();
        }, 700));

        this.#tsSelector.addEventListener("toggleItem", () => {
            this.#updateExportBtnState();
        });

        this.#tsSelector.addEventListener("removeItem", () => {
            this.#updateExportBtnState();
        });

        this.#tsSelector.addEventListener("selectionChanged", () => {
            this.#updateExportBtnState();
        });

        this.#tsSelector.addEventListener("clearSelection", () => {
            this.#updateExportBtnState();
        });

        this.#tzPickerElmt.addEventListener("tzChange", (event) => {
            this.#periodStartDatetimeElmt.tzName = event.detail.tzName;
            this.#periodEndDatetimeElmt.tzName = event.detail.tzName;
        });

        this.#periodTypeElmt.addEventListener("change", () => {
            this.#updatePeriodCustomState();
            this.#updateExportBtnState();
        });

        this.#periodStartDatetimeElmt.addEventListener("dateChange", () => {
            this.#periodEndDatetimeElmt.dateMin = this.#periodStartDatetimeElmt.date;
            this.#updateExportBtnState();
        });

        this.#periodStartDatetimeElmt.addEventListener("datetimeChange", () => {
            this.#updateExportBtnState();
        });

        this.#periodEndDatetimeElmt.addEventListener("dateChange", () => {
            this.#periodStartDatetimeElmt.dateMax = this.#periodEndDatetimeElmt.date;
            this.#updateExportBtnState();
        });

        this.#periodEndDatetimeElmt.addEventListener("datetimeChange", () => {
            this.#updateExportBtnState();
        });

        this.#aggInputElmt.addEventListener("change", () => {
            this.#updateAggregationBucketState();
        });

        this.#exportBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            if (this.#exportBtnElmt.hasAttribute("disabled")) return;

            this.#downloadFile();
        });
    }

    #canExport() {
        return this.#filenameInputElmt.value.length > 0 && this.#tsSelector.selectedItems.length > 0 && this.#hasPeriodSelected();
    }

    #updateExportBtnState() {
        if (this.#canExport()) {
            this.#exportBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#exportBtnElmt.setAttribute("disabled", true);
        }
    }

    #isPeriodCustom() {
        return this.#periodTypeElmt.value == "custom";
    }

    #hasPeriodSelected() {
        return !this.#isPeriodCustom() || (this.#periodStartDatetimeElmt.hasDatetime && this.#periodStartDatetimeElmt.isValid && this.#periodEndDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.isValid);
    }

    #updatePeriodCustomState() {
        if (this.#isPeriodCustom()) {
            this.#periodEndDatetimeElmt.date = this.#endDateCustomBackup;
            this.#periodEndDatetimeElmt.time = this.#endTimeCustomBackup;

            this.#periodCustomElmt.classList.remove("d-none", "invisible");
            this.#periodStartDatetimeElmt.setAttribute("required", true);
            this.#periodEndDatetimeElmt.setAttribute("required", true);

            this.#periodStartDatetimeElmt.focus();
        }
        else {
            this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
            this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;
            this.#periodEndDatetimeElmt.date = this.#endDateDefault;
            this.#periodEndDatetimeElmt.time = this.#endTimeDefault;

            this.#periodCustomElmt.classList.add("d-none", "invisible");
            this.#periodStartDatetimeElmt.removeAttribute("required");
            this.#periodEndDatetimeElmt.removeAttribute("required");
        }
    }

    #updateAggregationBucketState() {
        if (this.#aggInputElmt.value == "none") {
            this.#bucketElmt.setAttribute("disabled", true);
            this.#bucketElmt.classList.add("d-none", "invisible");
        }
        else {
            this.#bucketElmt.removeAttribute("disabled");
            this.#bucketElmt.classList.remove("d-none", "invisible");
        }
    }

    #downloadFile() {
        this.#exportBtnElmt.setAttribute("disabled", true);
        this.#exportSpinnerElmt.classList.remove("d-none", "invisible");

        if (this.#downloadReqID != null) {
            this.#internalAPIRequester.abort(this.#downloadReqID);
            this.#downloadReqID = null;
        }

        let urlParams = {
            filename: this.#filenameInputElmt.value,
            timezone: this.#tzPickerElmt.tzName,
            period: this.#periodTypeElmt.value,
            end_date: this.#periodEndDatetimeElmt.date,
            end_time: this.#periodEndDatetimeElmt.time,
            data_state: this.#dataStatesElmt.value,
            timeseries: this.#tsSelector.selectedItems.map(ts => ts.name),
        };

        if (this.#isPeriodCustom()) {
            urlParams.start_date = this.#periodStartDatetimeElmt.date;
            urlParams.start_time = this.#periodStartDatetimeElmt.time;
        }

        if (this.#aggInputElmt.value != "none") {
            urlParams.agg = this.#aggInputElmt.value;
            urlParams.bucket_width_value = this.#bucketElmt.bucketWidthValue;
            urlParams.bucket_width_unit = this.#bucketElmt.bucketWidthUnit;
        }

        this.#downloadReqID = this.#internalAPIRequester.download(
            app.urlFor(`api.timeseries.data.download_multiple`, urlParams),
            (response) => {
                // Inspired by https://blog.stephensorensen.com/download-files-using-fetch
                let objectUrl = URL.createObjectURL(response.blob);
                let virtualLinkElmt = document.createElement("a");
                virtualLinkElmt.href = objectUrl;
                virtualLinkElmt.download = response.filename;
                virtualLinkElmt.click();
                URL.revokeObjectURL(objectUrl);

                app.flashMessage(`${response.filename} file exported!`, "success", 5);
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
            () => {
                this.#downloadReqID = null;

                this.#exportBtnElmt.removeAttribute("disabled");
                this.#exportSpinnerElmt.classList.add("d-none", "invisible");
            },
        );
    }

    mount() {
        this.#endDateDefault = this.#periodEndDatetimeElmt.date;
        this.#endTimeDefault = this.#periodEndDatetimeElmt.time;
        this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
        this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;
        this.#updatePeriodCustomState();
        this.#updateAggregationBucketState();
        this.#updateExportBtnState();

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
    let view = new TimeseriesExportView();
    view.mount();
});

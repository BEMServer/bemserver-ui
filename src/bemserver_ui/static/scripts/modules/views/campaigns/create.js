import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/spinner.js";


class CampaignCreateView {

    #tzPickerElmt = null;
    #startDatetimePickerElmt = null;
    #endDatetimePickerElmt = null;

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#tzPickerElmt = document.getElementById("timezonePicker");
        this.#startDatetimePickerElmt = document.getElementById("start_datetime");
        this.#endDatetimePickerElmt = document.getElementById("end_datetime");
    }

    #initEventListeners() {
        this.#tzPickerElmt.addEventListener("tzChange", (event) => {
            event.preventDefault();

            this.#startDatetimePickerElmt.tzName = event.detail.tzName;
            this.#endDatetimePickerElmt.tzName = event.detail.tzName;
        });

        this.#startDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();

            this.#endDatetimePickerElmt.dateMin = this.#startDatetimePickerElmt.date;
        });

        this.#endDatetimePickerElmt.addEventListener("dateChange", (event) => {
            event.preventDefault();

            this.#startDatetimePickerElmt.dateMax = this.#endDatetimePickerElmt.date;
        });
    }

    mount() {
        this.#startDatetimePickerElmt.tzName = this.#tzPickerElmt.tzName;
        this.#endDatetimePickerElmt.tzName = this.#tzPickerElmt.tzName;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new CampaignCreateView();
    view.mount();
});

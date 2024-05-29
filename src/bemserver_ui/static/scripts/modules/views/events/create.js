import "/static/scripts/modules/components/time/tzPicker.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/spinner.js";


class EventCreateView {

    #tzPickerElmt = null;
    #timestampPickerElmt = null;
    #inputSourceElmt = null;
    #btnEditSourceElmt = null;
    #colTimezoneElmt = null;
    #btnEditTimezoneElmt = null;

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#tzPickerElmt = document.getElementById("timezonePicker");
        this.#timestampPickerElmt = document.getElementById("timestamp");
        this.#inputSourceElmt = document.getElementById("source");
        this.#btnEditSourceElmt = document.getElementById("btnEditSource");
        this.#colTimezoneElmt = document.getElementById("colTimezone");
        this.#btnEditTimezoneElmt = document.getElementById("btnEditTimezone");
    }

    #initEventListeners() {
        this.#tzPickerElmt.addEventListener("tzChange", (event) => {
            event.preventDefault();

            this.#timestampPickerElmt.tzName = event.detail.tzName;
        });

        this.#btnEditSourceElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#inputSourceElmt.classList.remove("bg-dark", "bg-opacity-25");
            this.#inputSourceElmt.removeAttribute("readonly");
            this.#inputSourceElmt.select()
            this.#btnEditSourceElmt.remove();
        });

        this.#btnEditTimezoneElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#colTimezoneElmt.classList.remove("d-none", "invisible");
            this.#btnEditTimezoneElmt.remove();
        });
    }

    mount() {

    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new EventCreateView();
    view.mount();
});

import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import "/static/scripts/modules/components/itemsCount.js";


class ServiceCleanuManageView {

    #internalAPIRequester = null;
    #tsUpdateStateReqID = null;

    #stateOnRadioElmt = null;
    #stateOffRadioElmt = null;
    #cleanupIDInputElmt = null;
    #campaignIDInputElmt = null;
    #etagInputElmt = null;
    
    #formFiltersElmt = null;
    #sortInputElmt = null;
    #sortRadioElmts = null;

    constructor() {
        this.#cacheDOM();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#initEventListeners();
    }
    
    #cacheDOM() {
        if (app.signedUser.is_admin) {
            this.#stateOnRadioElmt = document.getElementById("svc_state_on");
            this.#stateOffRadioElmt = document.getElementById("svc_state_off");
            this.#cleanupIDInputElmt = document.getElementById("cleanup_id");
            this.#campaignIDInputElmt = document.getElementById("campaign_id");
            this.#etagInputElmt = document.getElementById("etag");
        }

        this.#formFiltersElmt = document.getElementById("formFiltersElmt");
        this.#sortInputElmt = document.getElementById("sort");
        this.#sortRadioElmts = [].slice.call(document.querySelectorAll(`input[type="radio"][id^="sort-"]`));
    }

    #initEventListeners() {
        if (app.signedUser.is_admin) {
            this.#stateOnRadioElmt.addEventListener("change", () => {
                if (this.#stateOnRadioElmt.checked) {
                    this.#updateServiceState(this.#stateOnRadioElmt.checked);
                }
            });

            this.#stateOffRadioElmt.addEventListener("change", () => {
                if (this.#stateOffRadioElmt.checked) {
                    this.#updateServiceState(this.#stateOnRadioElmt.checked);
                }
            });
        }

        for (let sortRadioElmt of this.#sortRadioElmts) {
            sortRadioElmt.addEventListener("change", (event) => {
                event.preventDefault();
                let sortData = sortRadioElmt.id.split("-");
                let newSortValue = `${sortData[2].toLowerCase() == "asc" ? "+" : "-"}${sortData[1].toLowerCase()}`;
                if (this.#sortInputElmt.value != newSortValue) {
                    this.#sortInputElmt.value = newSortValue;
                    this.#formFiltersElmt.submit();
                }
            })         
        };
    }

    #updateServiceState(isEnabled) {
        if (this.#tsUpdateStateReqID != null) {
            this.#internalAPIRequester.abort(this.#tsUpdateStateReqID);
            this.#tsUpdateStateReqID = null;
        }

        if (this.#cleanupIDInputElmt.value == "") {
            if (isEnabled) {
                // Enable service for campaign.
                this.#tsUpdateStateReqID = this.#internalAPIRequester.post(
                    app.urlFor(`api.services.cleanup.enable`),
                    { campaign_id: this.#campaignIDInputElmt.value, is_enabled: isEnabled },
                    (data) => {
                        this.#cleanupIDInputElmt.value = data.data.id;
                        this.#etagInputElmt.value = data.etag;

                        app.flashMessage("Cleanup service enabled!", "info", 5);
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");
                    },
                );
            }
        }
        else {
            // Update cleanup service state.
            this.#tsUpdateStateReqID = this.#internalAPIRequester.put(
                app.urlFor(`api.services.cleanup.update_state`, {id: this.#cleanupIDInputElmt.value}),
                { is_enabled: isEnabled },
                this.#etagInputElmt.value,
                (data) => {
                    this.#etagInputElmt.value = data.etag;

                    app.flashMessage(`Cleanup service ${isEnabled ? "en": "dis"}abled!`, "info", 5);
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");
                },
            );
        }
    }

    mount() {

    }
}


document.addEventListener("DOMContentLoaded", () => {
    let svcCleanupManageView = new ServiceCleanuManageView();
    svcCleanupManageView.mount();
});

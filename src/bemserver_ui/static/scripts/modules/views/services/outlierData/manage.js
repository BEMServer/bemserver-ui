import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";


class CheckOutlierDataServiceManageView {

    #internalAPIRequester = null;
    #updateStateReqID = null;

    #stateOnRadioElmt = null;
    #stateOffRadioElmt = null;
    #campaignServiceIDInputElmt = null;
    #campaignIDInputElmt = null;
    #etagInputElmt = null;
    
    constructor() {
        this.#cacheDOM();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#initEventListeners();
    }
    
    #cacheDOM() {
        if (app.signedUser.is_admin) {
            this.#stateOnRadioElmt = document.getElementById("svc_state_on");
            this.#stateOffRadioElmt = document.getElementById("svc_state_off");
            this.#campaignServiceIDInputElmt = document.getElementById("campaign_service_id");
            this.#campaignIDInputElmt = document.getElementById("campaign_id");
            this.#etagInputElmt = document.getElementById("etag");
        }
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
    }

    #updateServiceState(isEnabled) {
        if (this.#updateStateReqID != null) {
            this.#internalAPIRequester.abort(this.#updateStateReqID);
            this.#updateStateReqID = null;
        }

        if (this.#campaignServiceIDInputElmt.value == "") {
            if (isEnabled) {
                // Enable service for campaign.
                this.#updateStateReqID = this.#internalAPIRequester.post(
                    app.urlFor(`api.services.outlier_data.enable`),
                    { campaign_id: this.#campaignIDInputElmt.value, is_enabled: isEnabled },
                    (data) => {
                        this.#campaignServiceIDInputElmt.value = data.data.id;
                        this.#etagInputElmt.value = data.etag;

                        app.flashMessage("Check outlier data service enabled!", "info", 5);
                    },
                    (error) => {
                        app.flashMessage(error.toString(), "error");
                    },
                );
            }
        }
        else {
            // Update campaign service state.
            this.#updateStateReqID = this.#internalAPIRequester.put(
                app.urlFor(`api.services.outlier_data.update_state`, {id: this.#campaignServiceIDInputElmt.value}),
                { is_enabled: isEnabled },
                this.#etagInputElmt.value,
                (data) => {
                    this.#etagInputElmt.value = data.etag;

                    app.flashMessage(`Check outlier data service ${isEnabled ? "en": "dis"}abled!`, "info", 5);
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
    let view = new CheckOutlierDataServiceManageView();
    view.mount();
});

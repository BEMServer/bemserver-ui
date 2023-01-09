import { InternalAPIRequest } from "../../../tools/fetcher.js";
import { flaskES6 } from "../../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../../components/flash.js";


class CheckMissingDataServiceManageView {

    #internalAPIRequester = null;
    #updateStateReqID = null;

    #messagesElmt = null;

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
        this.#messagesElmt = document.getElementById("messages");

        this.#stateOnRadioElmt = document.getElementById("svc_state_on");
        this.#stateOffRadioElmt = document.getElementById("svc_state_off");
        this.#campaignServiceIDInputElmt = document.getElementById("campaign_service_id");
        this.#campaignIDInputElmt = document.getElementById("campaign_id");
        this.#etagInputElmt = document.getElementById("etag");
    }

    #initEventListeners() {
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

    #updateServiceState(isEnabled) {
        if (this.#updateStateReqID != null) {
            this.#internalAPIRequester.abort(this.#updateStateReqID);
            this.#updateStateReqID = null;
        }

        if (this.#campaignServiceIDInputElmt.value == "") {
            if (isEnabled) {
                // Enable service for campaign.
                this.#updateStateReqID = this.#internalAPIRequester.post(
                    flaskES6.urlFor(`api.services.missing_data.enable`),
                    { campaign_id: this.#campaignIDInputElmt.value, is_enabled: isEnabled },
                    (data) => {
                        this.#campaignServiceIDInputElmt.value = data.data.id;
                        this.#etagInputElmt.value = data.etag;

                        let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.INFO, text: "Check missing data service enabled!", isDismissible: true });
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true });
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        }
        else {
            // Update campaign service state.
            this.#updateStateReqID = this.#internalAPIRequester.put(
                flaskES6.urlFor(`api.services.missing_data.update_state`, {id: this.#campaignServiceIDInputElmt.value}),
                { is_enabled: isEnabled },
                this.#etagInputElmt.value,
                (data) => {
                    this.#etagInputElmt.value = data.etag;

                    let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.INFO, text: `Check missing data service ${isEnabled ? "en": "dis"}abled!`, isDismissible: true });
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true });
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }
}


document.addEventListener("DOMContentLoaded", () => {

    let view = new CheckMissingDataServiceManageView();

});

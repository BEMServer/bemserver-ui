import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import "../../components/itemsCount.js";


class ServiceCleanuManageView {

    #internalAPIRequester = null;
    #tsUpdateStateReqID = null;

    #messagesElmt = null;

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
        this.#messagesElmt = document.getElementById("messages");

        this.#stateOnRadioElmt = document.getElementById("svc_state_on");
        this.#stateOffRadioElmt = document.getElementById("svc_state_off");
        this.#cleanupIDInputElmt = document.getElementById("cleanup_id");
        this.#campaignIDInputElmt = document.getElementById("campaign_id");
        this.#etagInputElmt = document.getElementById("etag");

        this.#formFiltersElmt = document.getElementById("formFiltersElmt");
        this.#sortInputElmt = document.getElementById("sort");
        this.#sortRadioElmts = [].slice.call(document.querySelectorAll(`input[type="radio"][id^="sort-"]`));
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
                    flaskES6.urlFor(`api.services.cleanup.enable`),
                    { campaign_id: this.#campaignIDInputElmt.value, is_enabled: isEnabled },
                    (data) => {
                        this.#cleanupIDInputElmt.value = data.data.id;
                        this.#etagInputElmt.value = data.etag;

                        let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.INFO, text: "Cleanup service enabled!", isDismissible: true });
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
            // Update cleanup service state.
            this.#tsUpdateStateReqID = this.#internalAPIRequester.put(
                flaskES6.urlFor(`api.services.cleanup.update_state`, {id: this.#cleanupIDInputElmt.value}),
                { is_enabled: isEnabled },
                this.#etagInputElmt.value,
                (data) => {
                    this.#etagInputElmt.value = data.etag;

                    let flashMsgElmt = new FlashMessage({ type: FlashMessageTypes.INFO, text: `Cleanup service ${isEnabled ? "en": "dis"}abled!`, isDismissible: true });
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

    let svcCleanupManageView = new ServiceCleanuManageView();

});
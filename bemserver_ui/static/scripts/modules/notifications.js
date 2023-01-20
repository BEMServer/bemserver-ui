import { InternalAPIRequest } from "./tools/fetcher.js";
import { flaskES6 } from "../app.js";
import { FlashMessageTypes, FlashMessage } from "./components/flash.js";


export class NotificationUpdater {

    #intervalDelay = 60000;
    #intervalID = null;

    #internalAPIRequester = null;
    #refreshReqID = null;

    #messagesElmt = null;

    #notifBellElmt = null;
    #notifBellIconElmt = null;
    #notifBellNewBulletElmt = null;

    #notifsData = [];
    #notifsPagination = {};
    #notifsETag = null;

    get isDisabled() {
        return this.#notifBellElmt.classList.contains("d-none");
    }

    constructor(options = {}) {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#loadOptions(options);
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #loadOptions(options = {}) {
        this.#intervalDelay = options.delay || 60000;
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#notifBellElmt = document.getElementById("notifBell");
        this.#notifBellIconElmt = this.#notifBellElmt.querySelector("i:first-child");
    }

    #initEventListeners() {
        this.#notifBellElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#messagesElmt.appendChild(
                new FlashMessage({type: FlashMessageTypes.INFO, text: this.#notifsPagination.total > 0 ? `${this.#notifsPagination.total} not read notifications...` : "No notifications...", isDismissible: true, isTimed: false})
            );
            this.#messagesElmt.appendChild(
                new FlashMessage({type: FlashMessageTypes.WARNING, text: `Notifications UI panel not fully implemented yet!`, isDismissible: true, isTimed: false})
            );
        });

        this.#setInterval();
    }

    #setInterval() {
        // Ensure no other refresh interval is on.
        this.#cancelInterval();
        this.#intervalID = window.setInterval(() => { this.refresh(); }, this.#intervalDelay);
    }

    #cancelInterval() {
        if (this.#intervalID != null) {
            window.clearInterval(this.#intervalID);
            this.#intervalID = null;
        }
    }

    #updateNewBulletState() {
        if (this.#notifsData.length > 0) {
            if (this.#notifBellNewBulletElmt == null) {
                this.#notifBellNewBulletElmt = document.createElement("span");
                this.#notifBellNewBulletElmt.classList.add("position-absolute", "top-0", "start-100", "translate-middle-x", "p-1", "bg-danger", "rounded-circle");

                let textElmt = document.createElement("span");
                textElmt.classList.add("visually-hidden");
                textElmt.innerText = "New notifications";
                this.#notifBellNewBulletElmt.appendChild(textElmt);
            }

            this.#notifBellIconElmt.classList.replace("bi-bell", "bi-bell-fill");
            this.#notifBellIconElmt.classList.add("text-warning");
            this.#notifBellElmt.appendChild(this.#notifBellNewBulletElmt);
        }
        else if (this.#notifBellNewBulletElmt != null) {
            this.#notifBellIconElmt.classList.replace("bi-bell-fill", "bi-bell");
            this.#notifBellIconElmt.classList.remove("text-warning");
            this.#notifBellNewBulletElmt.remove();
        }
    }

    refresh() {
        if (this.#refreshReqID != null) {
            this.#internalAPIRequester.abort(this.#refreshReqID);
            this.#refreshReqID = null;
        }

        if (!this.isDisabled) {
            let refreshOptions = {read: false, sort: "-timestamp"};
            if (this.#notifsETag != null) {
                refreshOptions.etag = this.#notifsETag;
            }

            this.#refreshReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.notifications.retrieve_list`, refreshOptions),
                (data) => {
                    this.#notifsData = data.data;
                    this.#notifsPagination = data.pagination;
                    this.#notifsETag = data.etag;

                    this.#updateNewBulletState();

                    // TODO: display notifs data in UI (notification panel)
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }

    disable() {
        this.#notifBellElmt.classList.add("d-none", "invisible");
        this.#cancelInterval();
    }

    enable() {
        this.#notifBellElmt.classList.remove("d-none", "invisible");
        this.#setInterval();
    }
}

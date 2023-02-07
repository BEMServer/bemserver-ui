import { InternalAPIRequest } from "./tools/fetcher.js";
import { flaskES6 } from "../app.js";
import { FlashMessageTypes, FlashMessage } from "./components/flash.js";
import { Parser } from "./tools/parser.js";


export class NotificationUpdater {

    #intervalDelay = 60000;
    #intervalID = null;
    #disableAutoRefresh = false;

    #internalAPIRequester = null;
    #refreshReqID = null;

    #messagesElmt = null;

    #notifBellElmt = null;
    #notifBellIconElmt = null;
    #notifBellBulletElmt = null;
    #notifBellBulletCountElmt = null;

    #notifsCount = {
        total: 0,
    };
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
        this.#intervalDelay = Parser.parseIntOrDefault(options.delay, 60000);
        this.#disableAutoRefresh = Parser.parseBoolOrDefault(options.disableAutoRefresh, false);
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#notifBellElmt = document.getElementById("notifBell");
        this.#notifBellIconElmt = this.#notifBellElmt.querySelector("i:first-child");
    }

    #initEventListeners() {
        this.#setInterval();
    }

    #setInterval() {
        // Ensure no other refresh interval is on.
        this.#cancelInterval();
        if (!this.#disableAutoRefresh) {
            this.#intervalID = window.setInterval(() => { this.refresh(); }, this.#intervalDelay);
        }
    }

    #cancelInterval() {
        if (this.#intervalID != null) {
            window.clearInterval(this.#intervalID);
            this.#intervalID = null;
        }
    }

    #updateBulletState() {
        if (this.#notifsCount.total > 0) {
            this.#notifBellElmt.title = "You have unread notifications";

            if (this.#notifBellBulletElmt == null) {
                this.#notifBellBulletElmt = document.createElement("span");
                this.#notifBellBulletElmt.classList.add("position-absolute", "top-0", "start-100", "translate-middle", "badge", "bg-danger", "rounded-pill");

                this.#notifBellBulletCountElmt = document.createElement("span");
                this.#notifBellBulletCountElmt.innerText = this.#notifsCount.total.toString();
                this.#notifBellBulletElmt.appendChild(this.#notifBellBulletCountElmt);

                let textElmt = document.createElement("span");
                textElmt.classList.add("visually-hidden");
                textElmt.innerText = "unread notifications";
                this.#notifBellBulletElmt.appendChild(textElmt);
            }
            else {
                this.#notifBellBulletCountElmt.innerText = this.#notifsCount.total.toString();
                this.#notifBellIconElmt.classList.remove(`me-${Math.min(5, this.#notifBellBulletCountElmt.innerText.length).toString()}`);                
            }

            this.#notifBellIconElmt.classList.replace("bi-bell", "bi-bell-fill");
            this.#notifBellIconElmt.classList.add("app-notif-animate", `me-${Math.min(5, this.#notifBellBulletCountElmt.innerText.length).toString()}`);
            this.#notifBellElmt.appendChild(this.#notifBellBulletElmt);
        }
        else if (this.#notifBellBulletElmt != null) {
            this.#notifBellElmt.title = "You have no unread notifications";

            this.#notifBellIconElmt.classList.replace("bi-bell-fill", "bi-bell");
            this.#notifBellIconElmt.classList.remove("app-notif-animate");
            if (this.#notifBellBulletCountElmt != null) {
                this.#notifBellIconElmt.classList.remove(`me-${Math.min(5, this.#notifBellBulletCountElmt.innerText.length).toString()}`);
            }
            this.#notifBellBulletElmt.remove();
        }
    }

    refresh() {
        if (this.#refreshReqID != null) {
            this.#internalAPIRequester.abort(this.#refreshReqID);
            this.#refreshReqID = null;
        }

        if (!this.isDisabled) {
            let refreshOptions = { read: false };
            if (this.#notifsETag != null) {
                refreshOptions.etag = this.#notifsETag;
            }

            this.#refreshReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.notifications.retrieve_count`, refreshOptions),
                (data) => {
                    if (data.data != null) {
                        this.#notifsETag = data.etag;
                        this.#notifsCount = data.data;
                        this.#updateBulletState();
                    }
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

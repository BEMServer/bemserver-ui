import { flaskEndpoints } from "/static/scripts/modules/flaskES6-endpoints.js";
import { FlaskES6 } from "/static/scripts/modules/tools/flaskES6.js";
import { Sidebar } from "/static/scripts/modules/sidebar.js";
import { FormController } from "/static/scripts/modules/formController.js";
import { NotificationUpdater } from "/static/scripts/modules/notifications.js";
import { MessageManager } from "/static/scripts/managers/message.js";


// TODO: campaignContext defined here is not used for now...
// TODO: having signedUser here is not really great...


class App {
    #messageManager = null;

    #notifUpdaterDelay = 60000;
    #campaignContext = {};
    #signedUser = null;

    #sidebar = null;
    #formCtrl = null;
    #notifUpdater = null;
    #flaskES6 = null;

    get campaignContext() {
        return this.#campaignContext;
    }

    get signedUser() {
        return this.#signedUser;
    }

    get notifUpdater() {
        return this.#notifUpdater;
    }

    constructor(options = {}) {
        this.#loadOptions(options);

        this.#flaskES6 = new FlaskES6(flaskEndpoints);
    }

    #loadOptions(options = {}) {
        this.#signedUser = options.signedUser || {};
        this.#notifUpdaterDelay = options.notificationUpdaterDelay || 60000;
        this.#campaignContext = options.campaignContext || {};
    }

    flashMessage(message, category="message", delay=null, dismiss=true) {
        this.#messageManager.flash(message, category, delay, dismiss);
    }

    urlFor(endpoint, rule) {
        return this.#flaskES6.urlFor(endpoint, rule);
    }

    // TODO pass manager to init as args.
    mount(mountSidebar = true, mountNotifUpdater = true, mountFormController = true) {
        if (this.#messageManager == null) {
            this.#messageManager = new MessageManager();
        }
        this.#messageManager.mount();

        if (mountFormController) {
            if (this.#formCtrl == null) {
                this.#formCtrl = new FormController();
            }
            this.#formCtrl.mount();
        }

        if (mountSidebar) {
            if (this.#sidebar == null) {
                this.#sidebar = new Sidebar();
            }
            this.#sidebar.mount();
        }

        if (mountNotifUpdater) {
            if (this.#notifUpdater == null) {
                this.#notifUpdater = new NotificationUpdater({delay: this.#notifUpdaterDelay});
            }
            this.#notifUpdater.mount();
        }
    }
}


export let app = null;


export function createApp(options) {
    app = new App(options);
    return app;
}

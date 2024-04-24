import { flaskEndpoints } from "/static/scripts/modules/flaskES6-endpoints.js";
import { FlaskES6 } from "/static/scripts/modules/tools/flaskES6.js";


// TODO: campaignContext data property is not used for now...
// TODO: having signedUser data here kinda sucks...


const APP_MANAGERS = Object.freeze({
    MESSAGE_MANAGER: {
        name: "MessageManager",
        module_path: "/static/scripts/managers/message.js",
        options: {},
    },
    SIDEBAR: {
        name: "SidebarManager",
        module_path: "/static/scripts/managers/sidebar.js",
        options: {},
    },
    FORM_CONTROLLER: {
        name: "FormController",
        module_path: "/static/scripts/managers/formController.js",
        options: {},
    },
    NOTIF_UPDATER: {
        name: "NotificationUpdater",
        module_path: "/static/scripts/managers/notifications.js",
        options: {
            delay: 60000,
        },
    },
});


class App {

    #signedUser = null;
    #campaignContext = {};

    #flaskES6 = null;
    #managers = {};

    get campaignContext() {
        return this.#campaignContext;
    }

    get signedUser() {
        return this.#signedUser;
    }

    constructor(options = {}) {
        this.#loadOptions(options);

        this.#flaskES6 = new FlaskES6(flaskEndpoints);
    }

    #loadOptions(options = {}) {
        this.#signedUser = options.signedUser || {};
        this.#campaignContext = options.campaignContext || {};
    }

    async #initManager(managerName, options) {
        if (Object.keys(APP_MANAGERS).includes(managerName)) {
            let manager = APP_MANAGERS[managerName];
            let { default: ManagerClass } = await import(manager.module_path);
            if (!Object.keys(this.#managers).includes(manager.name)) {
                let managerInstance = new ManagerClass({...manager.config, ...options});
                managerInstance.mount();
                this.#managers[manager.name] = managerInstance;
            }
            else {
                console.warn(`${managerName} manager is already loaded!`);
            }
        }
        else {
            console.error(`Unknown ${managerName} manager, can not load!`);
        }
    }

    flashMessage(message, category="message", delay=null, dismiss=true) {
        this.#managers[APP_MANAGERS.MESSAGE_MANAGER.name]?.flash(message, category, delay, dismiss);
    }

    urlFor(endpoint, rule) {
        return this.#flaskES6.urlFor(endpoint, rule);
    }

    refreshNotifs() {
        this.#managers[APP_MANAGERS.NOTIF_UPDATER.name]?.refresh();
    }

    mount(managers = {}) {
        for (let [managerName, managerConfig] of Object.entries(managers)) {
            this.#initManager(managerName, managerConfig);
        }
    }
}


export let app = null;


export function createApp(options) {
    app = new App(options);
    return app;
}

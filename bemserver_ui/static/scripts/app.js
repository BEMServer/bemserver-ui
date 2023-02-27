import { signedUser } from "./modules/signedUserData.js";
import { FlaskES6 } from "./modules/tools/flaskES6.js";
import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";
import { CampaignSelectorView } from "./modules/views/campaigns/selector.js";
import { flaskEndpoints } from "./modules/flaskES6-endpoints.js";
import { FlashTimer } from "./modules/flashTimer.js";
import { NotificationUpdater } from "./modules/notifications.js";


// TODO: how can app instance be accessible from any module?
// TODO: when app instance is accessible by any other module, put flaskES6 instance inside
// TODO: manage flash messages in through this app class?


const campaignContextQueryArgName = "campaign_ctxt";
const flaskES6 = new FlaskES6(flaskEndpoints, campaignContextQueryArgName);


export class App {

    #notifUpdatedDelay = 60000;
    #campaignContext = {};

    #campaignSelector = new CampaignSelectorView();
    #sidebar = new Sidebar();
    #formCtrl = new FormController();
    #flashTimer = new FlashTimer();
    #notifUpdater = null;

    constructor(options = {}) {
        this.#loadOptions(options);

        this.#sidebar = new Sidebar();
        this.#campaignSelector = new CampaignSelectorView();
        this.#formCtrl = new FormController();
        this.#flashTimer = new FlashTimer();
        this.#notifUpdater = new NotificationUpdater({delay: this.#notifUpdatedDelay});
    }

    #loadOptions(options = {}) {
        this.#notifUpdatedDelay = options.notificationUpdaterDelay || 60000;
        this.#campaignContext = options.campaignContext || {};
    }

    mount() {
        this.#sidebar.refresh();
        this.#campaignSelector.hide();
        this.#formCtrl.bind();
        this.#flashTimer.bind();
        this.#notifUpdater.refresh();
    }
}


export { flaskES6, signedUser, campaignContextQueryArgName } ;

import { signedUser } from "./modules/signedUserData.js";
import { FlaskES6 } from "./modules/tools/flaskES6.js";
import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";
import { CampaignSelectorView } from "./modules/views/campaigns/selector.js";
import { flaskEndpoints } from "./modules/flaskES6-endpoints.js";
import { FlashTimer } from "./modules/flashTimer.js";
import { NotificationUpdater } from "./modules/notifications.js";


const flaskES6 = new FlaskES6(flaskEndpoints);
const notifUpdaterDelay = 60000;


document.addEventListener("DOMContentLoaded", () => {

    let campaignSelector = new CampaignSelectorView();
    let sidebar = new Sidebar();
    let formCtrl = new FormController();
    let flashTimer = new FlashTimer();
    let notifUpdater = new NotificationUpdater();

    sidebar.refresh();
    campaignSelector.hide();
    formCtrl.bind();
    flashTimer.bind();

    notifUpdater.refresh();
    window.setInterval(() => { notifUpdater.refresh(); }, notifUpdaterDelay);

});


export { flaskES6, signedUser } ;

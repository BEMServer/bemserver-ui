import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";
import { CampaignSelector } from "./modules/campaignSelector.js";


document.addEventListener("DOMContentLoaded", function() {

    let sidebar = new Sidebar();
    sidebar.refreshActive();

    let formCtrl = new FormController();
    formCtrl.connectModalConfirm();

    let campaignSelector = new CampaignSelector();
    campaignSelector.hide();

}, false);

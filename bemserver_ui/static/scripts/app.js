import { FlaskES6 } from "./modules/flaskES6.js";
import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";
import { CampaignSelector } from "./modules/campaignSelector.js";


const sidebar = new Sidebar();
const formCtrl = new FormController();
const campaignSelector = new CampaignSelector();
const flaskES6 = new FlaskES6();


document.addEventListener("DOMContentLoaded", function() {

    sidebar.refresh();
    formCtrl.connectModalConfirm();
    campaignSelector.hide();

}, false);


export { campaignSelector, flaskES6 } ;

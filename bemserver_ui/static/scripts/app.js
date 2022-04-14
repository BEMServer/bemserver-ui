import { FlaskES6 } from "./modules/flaskES6.js";
import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";
import { CampaignSelector } from "./modules/campaignSelector.js";


const campaignSelector = new CampaignSelector();
const flaskES6 = new FlaskES6();


document.addEventListener("DOMContentLoaded", function() {

    let sidebar = new Sidebar();
    let formCtrl = new FormController();

    sidebar.refresh();
    campaignSelector.hide();
    formCtrl.bind();

}, false);


export { campaignSelector, flaskES6 } ;

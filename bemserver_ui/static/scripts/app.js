import { Sidebar } from "./modules/sidebar.js";
import { FormController } from "./modules/formController.js";


document.addEventListener("DOMContentLoaded", function() {

    let sidebar = new Sidebar();
    sidebar.refreshActive();

    let formCtrl = new FormController();
    formCtrl.setConfirmDelete();

}, false);

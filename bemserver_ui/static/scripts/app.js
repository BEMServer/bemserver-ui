import { Sidebar } from "./modules/sidebar.js";


document.addEventListener("DOMContentLoaded", function() {

    let sidebar = new Sidebar();
    sidebar.refreshActive();

}, false);

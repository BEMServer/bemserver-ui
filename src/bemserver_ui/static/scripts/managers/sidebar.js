import { Parser } from "/static/scripts/modules/tools/parser.js"


export default class SidebarManager {

    #navLinkElmts = null;

    #sidebarMenuInnerElmt = null;
    #campaignSelectedNavLinkElmt = null;

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#navLinkElmts = [].slice.call(document.querySelectorAll(".app-sidebar .nav-link"));

        this.#sidebarMenuInnerElmt = document.querySelector("#sidebarMenu div.position-sticky");
        this.#campaignSelectedNavLinkElmt = document.querySelector("#sidebarMenu #campaignSelectedNavItem > a.nav-link");
    }

    #initEventListeners() {
        window.addEventListener("resize", () => {
            this.#updateCampaignSelectedWidth();
        });
    }

    #updateCampaignSelectedWidth() {
        if (this.#campaignSelectedNavLinkElmt != null) {
            let campaignNavStyle = window.getComputedStyle(this.#campaignSelectedNavLinkElmt.parentElement);
            let remainingWidth = this.#sidebarMenuInnerElmt.clientWidth - Parser.parseFloatOrDefault(campaignNavStyle.gap);
            if (Parser.parseFloatOrDefault(this.#campaignSelectedNavLinkElmt.style.maxWidth) != remainingWidth) {
                this.#campaignSelectedNavLinkElmt.style.maxWidth = `${remainingWidth}px`;
            }
        }
    }

    #setActive(elmt) {
        elmt?.classList.add("active", "fw-bold");
        elmt?.setAttribute("aria-current", "page");
        this.#tryOpenCollapse(elmt);
    }

    #unsetActive(elmt) {
        elmt?.classList.remove("active", "fw-bold");
        elmt?.removeAttribute("aria-current");
    }

    #tryOpenCollapse(elmt) {
        let collapseElmt = null;
        // Try to find collapse element in parents.
        let parentElmt = elmt?.parentElement;
        while (parentElmt != null) {
            if (parentElmt.classList.contains("collapse")) {
                collapseElmt = parentElmt;
                break;
            }
            parentElmt = parentElmt.parentElement;
        }
        // Is there, in elmt parents, a collapse element to open?
        if (collapseElmt != null && !collapseElmt.classList.contains("app-sidebar")) {
            let bsCollapse = new bootstrap.Collapse(collapseElmt, {toggle: false});
            bsCollapse.show();
        }
    }

    mount() {
        // Set active the "nav-link" element that corresponds to the current page location.
        let currentUrl = window.location.pathname + window.location.search;

        // First search in "nav-link" class elements.
        let elmt = document.querySelector(`.app-sidebar .nav-link[href="${currentUrl}"]:not(.disabled)`);
        if (elmt == null) {
            // Then search in dropdown items.
            elmt = document.querySelector(`div.dropdown ul.dropdown-menu a.dropdown-item[href="${currentUrl}"]:not(.disabled)`)
            if (elmt != null) {
                let dropdownMenuId = elmt.parentElement.parentElement.getAttribute("aria-labelledby");
                let dropdownMenuElmt = document.getElementById(dropdownMenuId);
                this.#setActive(dropdownMenuElmt);
            }
        }
        if (elmt == null) {
            // And finally just search the best match in nav-link elements.
            let elmtLocation = "";
            for (let navLinkElmt of this.#navLinkElmts) {
                let navLinkLocation = navLinkElmt.getAttribute("href")?.split("?")[0];
                if (window.location.pathname.startsWith(navLinkLocation)) {
                    // nav-link element location matches
                    // 1. if first found, save it
                    // 2. else verify that it is better than any other previous element found
                    if (elmt == null || (elmt != null && navLinkLocation.length > elmtLocation.length)) {
                        elmt = navLinkElmt;
                        elmtLocation = navLinkLocation;
                    }
                }
            }
        }
        this.#setActive(elmt);

        this.#updateCampaignSelectedWidth();
    }
}

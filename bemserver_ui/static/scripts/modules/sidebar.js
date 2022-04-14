class Sidebar {

    #navLinkElmts = null;
    #dropdownMenuSitesElmt = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#navLinkElmts = [].slice.call(document.querySelectorAll(".app-sidebar .nav-link"));
        this.#dropdownMenuSitesElmt = document.getElementById("dropdownMenuSites");
    }

    #setActive(elmt) {
        elmt?.classList.add("active", "fw-bold");
        elmt?.setAttribute("aria-current", "page");
    }

    #unsetActive(elmt) {
        elmt?.classList.remove("active", "fw-bold");
        elmt?.removeAttribute("aria-current");
    }

    refresh() {
        // Set active the nav link element that corresponds to the current page location.
        let currentUrl = window.location.pathname + window.location.search;

        // First search in nav-links.
        let elmt = document.querySelector(`.app-sidebar .nav-link[href="${currentUrl}"]:not(.disabled)`);
        if (elmt == null) {
            // Then search in dropdwn items.
            elmt = this.#dropdownMenuSitesElmt?.parentElement.querySelector(`a.dropdown-item[href="${currentUrl}"]:not(.disabled)`)
            if (elmt != null) {
                this.#setActive(this.#dropdownMenuSitesElmt);
            }
        }
        if (elmt == null) {
            // And finally just search the best match in nav-links.
            for (let navLinkElmt of this.#navLinkElmts) {
                if (window.location.pathname.startsWith(navLinkElmt.getAttribute("href")?.split("?")[0])) {
                    elmt = navLinkElmt;
                    break;
                }
            }
        }
        this.#setActive(elmt);
    }
}


export { Sidebar };

class Sidebar {

    #navLinkElmts = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#navLinkElmts = [].slice.call(document.querySelectorAll(".app-sidebar .nav-link"));
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

    refresh() {
        // Set active the nav link element that corresponds to the current page location.
        let currentUrl = window.location.pathname + window.location.search;

        // First search in nav-links.
        let elmt = document.querySelector(`.app-sidebar .nav-link[href="${currentUrl}"]:not(.disabled)`);
        if (elmt == null) {
            // Then search in dropdwn items.
            elmt = document.querySelector(`div.dropdown ul.dropdown-menu a.dropdown-item[href="${currentUrl}"]:not(.disabled)`)
            if (elmt != null) {
                let dropdownMenuId = elmt.parentElement.parentElement.getAttribute("aria-labelledby");
                let dropdownMenuElmt = document.getElementById(dropdownMenuId);
                this.#setActive(dropdownMenuElmt);
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

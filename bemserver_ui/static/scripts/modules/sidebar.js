class Sidebar {

    refreshActive() {
        // Set active the nav link element that corresponds to the current page location.
        let currentUrl = window.location.pathname + window.location.search;
        let elements = document.querySelectorAll(".nav-link");
        elements.forEach(function (element) {
            if (element.getAttribute("href") == currentUrl) {
                element.classList.add("active", "fw-bold");
                element.setAttribute("aria-current", "page");
            }
            else if (element.classList.contains("active")) {
                element.classList.remove("active", "fw-bold");
                element.removeAttribute("aria-current");
            }
        });
    }

}


export { Sidebar };

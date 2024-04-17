import { Parser } from "../tools/parser.js";


export class PageSizeSelector extends HTMLDivElement {

    #current = 10;
    #selectElmt = null;

    #selectedOptElmt = null;

    constructor(options = {}) {
        super();

        this.current = Parser.parseIntOrDefault(options.current, this.getAttribute("current"));
    }

    static get AVAILABLE_PAGE_SIZES() {
        return [5, 10, 25, 50, 100];
    }

    get current() {
        return this.#current;
    }
    set current(value) {
        let cleanValue = Parser.parseIntOrDefault(value, this.#current);
        if (this.constructor.AVAILABLE_PAGE_SIZES.includes(cleanValue)) {
            this.#current = cleanValue;
        }
        this.#updateSelected();
    }

    #initEventListeners() {
        this.#selectElmt?.addEventListener("change", (event) => {
            event.preventDefault();

            let newPageSize = Parser.parseIntOrDefault(event.target.value, this.#current);
            if (this.constructor.AVAILABLE_PAGE_SIZES.includes(newPageSize)) {
                let oldPageSize = this.#current;
                if (newPageSize != oldPageSize) {
                    let pageSizeChangeEvent = new CustomEvent("pageSizeChange", {detail: {oldValue: oldPageSize, newValue: newPageSize}, bubbles: true});
                    this.#current = newPageSize;
                    this.#updateSelected();
                    this.dispatchEvent(pageSizeChangeEvent);
                }
            }
        });
    }

    #updateSelected() {
        if (this.#selectedOptElmt?.value != this.#current.toString()) {
            this.#selectedOptElmt?.removeAttribute("selected");
            let newOptElmt = this.querySelector(`option[value="${this.#current}"]`);
            newOptElmt?.setAttribute("selected", "");
            this.#selectedOptElmt = newOptElmt;
        }
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("d-flex", "d-grid", "align-items-center", "gap-2");

        let labelElmt = document.createElement("label");
        labelElmt.classList.add("form-label", "text-nowrap", "mb-0");
        labelElmt.innerText = "Page size";
        this.appendChild(labelElmt);

        this.#selectElmt = document.createElement("select");
        this.#selectElmt.classList.add("form-select", "form-select-sm");
        this.#selectElmt.setAttribute("aria-label", "Select a page size");
        for (let pageSizeValue of this.constructor.AVAILABLE_PAGE_SIZES) {
            let selectOptionElmt = document.createElement("option");
            selectOptionElmt.value = pageSizeValue.toString();
            if (this.#current == pageSizeValue) {
                selectOptionElmt.setAttribute("selected", "");
                this.#selectedOptElmt = selectOptionElmt;
            }
            selectOptionElmt.text = pageSizeValue.toString();
            this.#selectElmt.appendChild(selectOptionElmt);
        }
        this.appendChild(this.#selectElmt);

        this.#initEventListeners();
    }
}


class PaginationItem extends HTMLLIElement {

    #pageLinkElmt = null;

    #isActivable = true;
    #isActive = false;
    #isEnabled = true;
    #isVisible = true;
    #title = "";
    #innerHTML = "";
    #page = null;

    constructor(options = {}) {
        super();

        this.#isActivable = Parser.parseBoolOrDefault(options.isActivable, this.#isActivable);
        this.#isActive = Parser.parseBoolOrDefault(options.isActive, this.#isActive);
        this.#isEnabled = Parser.parseBoolOrDefault(options.isEnabled, this.#isEnabled);
        this.#isVisible = Parser.parseBoolOrDefault(options.isVisible, this.#isVisible);
        this.#title = options.title || this.#title;
        this.#innerHTML = options.innerHTML || this.#innerHTML;
        this.#page = Parser.parseIntOrDefault(options.page, this.#page);
    }

    get isActivable() {
        return this.#isActivable;
    }

    get isActive() {
        return this.#isActive;
    }
    set isActive(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#isActive);
        if (this.#isActive != cleanValue) {
            this.#isActive = cleanValue;
            this.#update();
        }
    }

    get isEnabled() {
        return this.#isEnabled;
    }
    set isEnabled(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#isEnabled);
        if (this.#isEnabled != cleanValue) {
            this.#isEnabled = cleanValue;
            this.#update();
        }
    }

    get isVisible() {
        return this.#isVisible;
    }
    set isVisible(value) {
        let cleanValue = Parser.parseBoolOrDefault(value, this.#isVisible);
        if (this.#isVisible != cleanValue) {
            this.#isVisible = cleanValue;
            this.#update();
        }
    }

    get page() {
        return this.#page;
    }
    set page(value) {
        let cleanValue = Parser.parseIntOrDefault(value, this.#page);
        if (this.#page != cleanValue) {
            this.#page = cleanValue;
            this.#update();
        }
    }

    #initEventListeners() {
        this.#pageLinkElmt?.addEventListener("click", (event) => {
            event.preventDefault();

            let navPageItemClickEvent = new CustomEvent("pageItemClick", {detail: {page: this.#page}, bubbles: true});
            this.dispatchEvent(navPageItemClickEvent);
        });
    }

    #update() {
        if (this.#isActivable) {
            if (this.#isActive) {
                this.classList.add("active");
                this.setAttribute("aria-current", "page");
            }
            else {
                this.classList.remove("active");
                this.removeAttribute("aria-current");
            }
        }

        if (this.#isEnabled) {
            this.classList.remove("disabled");
        }
        else {
            this.classList.add("disabled");
        }

        if (this.#isVisible) {
            this.classList.remove("d-none", "invisible");
        }
        else {
            this.classList.add("d-none", "invisible");
        }

        if (this.#page != null) {
            this.setAttribute("page", this.#page);
        }
        else {
            this.removeAttribute("page");
        }
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("page-item");

        this.#pageLinkElmt = document.createElement("a");
        this.#pageLinkElmt.classList.add("page-link");
        this.#pageLinkElmt.title = this.#title;
        this.#pageLinkElmt.setAttribute("role", "button");
        this.#pageLinkElmt.innerHTML = this.#innerHTML;
        this.appendChild(this.#pageLinkElmt);

        this.#update();
        this.#initEventListeners();
    }
}


export class Pagination extends HTMLUListElement {

    #pageSize = 10;
    #totalItems = 0;
    #totalPages = 1;
    #firstPage = 1;
    #lastPage = 1;
    #page = 1;
    #previousPage = null;
    #nextPage = null;

    #hasPaginationDataChanged = false;
    #startPageItem = 1;
    #endPageItem = 1;
    #hasStartEllipsis = false;
    #hasEndEllipsis = false;

    #firstPageItemElmt = null;
    #previousPageItemElmt = null;
    #startEllipsisPageItemElmt = null;
    #endEllipsisPageItemElmt = null;
    #nextPageItemElmt = null;
    #lastPageItemElmt = null;

    #currentActivePageItemElmt = null;

    constructor(options = {}) {
        super();

        this.#loadOptions(options);
        this.#preparePaginationData();
        this.#initEventListeners();
    }

    get startItem() {
        return ((this.#page - 1) * this.#pageSize) + 1;
    }
    get endItem() {
        if (this.#page == this.#lastPage) {
            return this.#totalItems;
        }
        return ((this.#page - 1) * this.#pageSize) + this.#pageSize;
    }
    get totalItems() {
        return this.#totalItems;
    }
    get page() {
        return this.#page;
    }
    set page(value) {
        let cleanValue = Parser.parseIntOrDefault(value, 1);
        if (cleanValue != this.#page) {
            this.reload({ pageSize: this.#pageSize, totalItems: this.#totalItems, totalPages: this.#totalPages, firstPage: this.#firstPage, lastPage: this.#lastPage, page: cleanValue, previousPage: this.#previousPage, nextPage: this.#nextPage });
        }
    }
    get firstPage() {
        return this.#firstPage;
    }
    get lastPage() {
        return this.#lastPage;
    }
    get previousPage() {
        return this.#previousPage;
    }
    get nextPage() {
        return this.#nextPage;
    }

    #loadOptions(options = {}) {
        this.#pageSize = Parser.parseIntOrDefault(options.pageSize, this.#pageSize);
        this.#totalItems = Parser.parseIntOrDefault(options.totalItems, 0);
        this.#totalPages = Parser.parseIntOrDefault(options.totalPages, 1);
        this.#firstPage = Parser.parseIntOrDefault(options.firstPage, 1);
        this.#lastPage = Parser.parseIntOrDefault(options.lastPage, 1);
        this.#page = Parser.parseIntOrDefault(options.page, 1);
        this.#previousPage = Parser.parseIntOrDefault(options.previousPage, null);
        this.#nextPage = Parser.parseIntOrDefault(options.nextPage, null);
    }

    #preparePaginationData(totalNavLinks = 5) {
        let nbLinksPerSide = Math.trunc(totalNavLinks / 2);
        let startNbLinks = Math.min(nbLinksPerSide, this.#page - this.#firstPage);
        let endNbLinks = Math.min(nbLinksPerSide, this.#lastPage - this.#page);

        let tmpStartNbLinks = startNbLinks + (nbLinksPerSide - endNbLinks);
        endNbLinks = endNbLinks + (nbLinksPerSide - startNbLinks);
        startNbLinks = tmpStartNbLinks;

        let oldStartPageItem = this.#startPageItem;
        this.#startPageItem = this.#firstPage;
        if (this.#previousPage != Number.NaN) {
            this.#startPageItem = Math.max(this.#startPageItem, this.#page - startNbLinks);
        }
        this.#hasStartEllipsis = this.#startPageItem > this.#firstPage;

        let oldEndPageItem = this.#endPageItem;
        this.#endPageItem = this.#lastPage;
        if (this.#nextPage != Number.NaN) {
            this.#endPageItem = Math.min(this.#endPageItem, this.#page + endNbLinks);
        }
        this.#hasEndEllipsis = this.#endPageItem < this.#lastPage;

        this.#hasPaginationDataChanged = (oldStartPageItem != this.#startPageItem || oldEndPageItem != this.#endPageItem);
    }

    #initEventListeners() {
        this.addEventListener("pageItemClick", (event) => {
            event.preventDefault();

            if (this.#page != event.detail.page) {
                this.#page = event.detail.page;
                this.#updatePageItemActive();
            }
            else {
                event.stopPropagation();
            }
        });
    }

    #update() {
        this.#firstPageItemElmt.isEnabled = (this.#page != this.#firstPage);
        this.#previousPageItemElmt.isEnabled = !Number.isNaN(this.#previousPage);
        this.#previousPageItemElmt.page = this.#previousPage;
        this.#startEllipsisPageItemElmt.isVisible = this.#hasStartEllipsis;

        this.#endEllipsisPageItemElmt.isVisible = this.#hasEndEllipsis;
        this.#nextPageItemElmt.isEnabled = !Number.isNaN(this.#nextPage);
        this.#nextPageItemElmt.page = this.#nextPage;
        this.#lastPageItemElmt.isEnabled = (this.#page != this.#lastPage);
        this.#lastPageItemElmt.page = this.#lastPage;

        if (this.#hasPaginationDataChanged) {
            this.innerHTML = "";
            this.appendChild(this.#firstPageItemElmt);
            this.appendChild(this.#previousPageItemElmt);
            this.appendChild(this.#startEllipsisPageItemElmt);
            this.#renderPageItemElements();
            this.appendChild(this.#endEllipsisPageItemElmt);
            this.appendChild(this.#nextPageItemElmt);
            this.appendChild(this.#lastPageItemElmt);
        }
        else {
            this.#updatePageItemActive();
        }

        this.#hasPaginationDataChanged = false;
    }

    #updatePageItemActive() {
        if (this.#currentActivePageItemElmt != null) {
            this.#currentActivePageItemElmt.isActive = false;
            for (let pageItemElmt of this.children) {
                if (pageItemElmt.isActivable && pageItemElmt.page == this.#page) {
                    this.#currentActivePageItemElmt = pageItemElmt;
                    this.#currentActivePageItemElmt.isActive = true;
                    break;
                }
            }
        }
    }

    #renderPageItemElements() {
        for (let pageItemNumber = this.#startPageItem ; pageItemNumber <= this.#endPageItem ; pageItemNumber += 1) {
            let isEnabled = this.#totalItems > 0;
            let isActive = this.#page == pageItemNumber && isEnabled;
            let pageItemElmt = new PaginationItem({isActive: isActive, isEnabled: isEnabled, page: pageItemNumber, title: `Page ${pageItemNumber}`, innerHTML: pageItemNumber.toString()});
            if (isActive) {
                this.#currentActivePageItemElmt = pageItemElmt;
            }
            this.appendChild(pageItemElmt);
        }
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("pagination", "justify-content-end", "mb-0");

        // First page.
        this.#firstPageItemElmt = new PaginationItem({isActivable: false, isEnabled: this.#page != this.#firstPage, page: this.#firstPage, title: "First page", innerHTML: `<i class="bi bi-chevron-double-left"></i>`});
        this.appendChild(this.#firstPageItemElmt);
        // Previous page.
        this.#previousPageItemElmt = new PaginationItem({isActivable: false, isEnabled: !Number.isNaN(this.#previousPage), page: this.#previousPage, title: "Previous page", innerHTML: `<i class="bi bi-chevron-left"></i>`});
        this.appendChild(this.#previousPageItemElmt);
        // Start ellipsis.
        this.#startEllipsisPageItemElmt = new PaginationItem({isActivable: false, isEnabled: false, isVisible: this.#hasStartEllipsis, innerHTML: "..."});
        this.appendChild(this.#startEllipsisPageItemElmt);
        // Navigable page items.
        this.#renderPageItemElements();
        // End ellipsis.
        this.#endEllipsisPageItemElmt = new PaginationItem({isActivable: false, isEnabled: false, isVisible: this.#hasEndEllipsis, innerHTML: "..."});
        this.appendChild(this.#endEllipsisPageItemElmt);
        // Next page.
        this.#nextPageItemElmt = new PaginationItem({isActivable: false, isEnabled: !Number.isNaN(this.#nextPage), page: this.#nextPage, title: "Next page", innerHTML: `<i class="bi bi-chevron-right"></i>`});
        this.appendChild(this.#nextPageItemElmt);
        // Last page.
        this.#lastPageItemElmt = new PaginationItem({isActivable: false, isEnabled: this.#page != this.#lastPage, page: this.#lastPage, title: "Last page", innerHTML: `<i class="bi bi-chevron-double-right"></i>`});
        this.appendChild(this.#lastPageItemElmt);
    }

    reload(options = {}) {
        this.#loadOptions(options);
        this.#preparePaginationData();
        this.#update();
    }
}


if (window.customElements.get("app-pagination-item") == null) {
    window.customElements.define("app-pagination-item", PaginationItem, { extends: "li" });
}
if (window.customElements.get("app-pagination") == null) {
    window.customElements.define("app-pagination", Pagination, { extends: "ul" });
}
if (window.customElements.get("app-pagesize-selector") == null) {
    window.customElements.define("app-pagesize-selector", PageSizeSelector, { extends: "div" });
}

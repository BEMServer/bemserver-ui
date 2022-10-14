import { Spinner } from "./spinner.js";


class AccordionListItem extends HTMLDivElement {

    #itemId = null;
    #itemIcon = null;
    #itemTitle = null;
    #itemSubtitle = null;

    #collapseElmt = null;
    #bodyContainerElmt = null;

    #bsCollapse = null;

    constructor(itemId, itemIcon, itemTitle, itemSubtitle = null) {
        super();

        this.#itemId = itemId;
        this.#itemIcon = itemIcon;
        this.#itemTitle = itemTitle;
        this.#itemSubtitle = itemSubtitle;
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("accordion-item");

        let itemHeaderElmt = document.createElement("h2");
        itemHeaderElmt.id = `itemHeading-${this.#itemId}`;
        itemHeaderElmt.classList.add("accordion-header");
        this.appendChild(itemHeaderElmt);

        this.#collapseElmt = document.createElement("div");
        this.#collapseElmt.id = `itemCollapse-${this.#itemId}`;
        this.#collapseElmt.classList.add("accordion-collapse", "collapse");
        this.#collapseElmt.setAttribute("aria-labelledby", itemHeaderElmt.id);
        this.appendChild(this.#collapseElmt);

        let itemHeaderBtnElmt = document.createElement("button");
        itemHeaderBtnElmt.classList.add("accordion-button", "collapsed");
        itemHeaderBtnElmt.setAttribute("type", "button");
        itemHeaderBtnElmt.setAttribute("data-bs-toggle", "collapse");
        itemHeaderBtnElmt.setAttribute("data-bs-target", `#${this.#collapseElmt.id}`);
        itemHeaderBtnElmt.setAttribute("aria-expended", false);
        itemHeaderBtnElmt.setAttribute("aria-controls", this.#collapseElmt.id);
        itemHeaderElmt.appendChild(itemHeaderBtnElmt);

        let itemHeaderBtnContentElmt = document.createElement("div");
        itemHeaderBtnContentElmt.classList.add("d-sm-flex", "justify-content-sm-between", "d-grid", "gap-3", "w-100", "me-3");
        itemHeaderBtnElmt.appendChild(itemHeaderBtnContentElmt);

        // Build title.
        let itemTitleContainerElmt = document.createElement("div");
        itemTitleContainerElmt.classList.add("d-flex", "gap-1");
        let itemTitleIconElmt = document.createElement("i");
        itemTitleIconElmt.classList.add("bi", `bi-${this.#itemIcon}`, "me-1");
        itemTitleContainerElmt.appendChild(itemTitleIconElmt);
        let itemTitleTextElmt = document.createElement("span");
        itemTitleTextElmt.classList.add("fw-bold", "text-break");
        itemTitleTextElmt.innerText = this.#itemTitle;
        itemTitleContainerElmt.appendChild(itemTitleTextElmt);
        if (this.#itemSubtitle != null) {
            let itemSubtitleElmt = document.createElement("span");
            itemSubtitleElmt.classList.add("text-muted");
            itemSubtitleElmt.innerText = this.#itemSubtitle;
            itemTitleContainerElmt.appendChild(itemSubtitleElmt);
        }
        itemHeaderBtnContentElmt.appendChild(itemTitleContainerElmt);

        this.#bodyContainerElmt = document.createElement("div");
        this.#bodyContainerElmt.classList.add("accordion-body");
        this.#collapseElmt.appendChild(this.#bodyContainerElmt);

        this.#bsCollapse = bootstrap.Collapse.getOrCreateInstance(this.#collapseElmt, {toggle: false});

        this.#initEventListeners();
    }

    #initEventListeners() {
        this.#collapseElmt.addEventListener("shown.bs.collapse", (event) => {
            let itemOpenEvent = new CustomEvent("accordionItemOpen", {
                detail: {
                    itemId: this.#itemId,
                    itemTitle: this.#itemTitle,
                },
                bubbles: true,
            });
            this.dispatchEvent(itemOpenEvent);
        });
    }

    refreshBodyContainerElement(element) {
        this.#bodyContainerElmt.innerHTML = "";
        this.#bodyContainerElmt.appendChild(element);
    }

    replaceBodyContainerElement(element) {
        element.classList.add("accordion-body");
        this.#bodyContainerElmt = element;
        this.#collapseElmt.innerHTML = "";
        this.#collapseElmt.appendChild(this.#bodyContainerElmt);
    }

    expand() {
        this.#bsCollapse.show();
    }

    collapse() {
        this.#bsCollapse.hide();
    }
}


export class AccordionList extends HTMLDivElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("accordion");
    }

    setLoading() {
        this.innerHTML = "";
        this.appendChild(new Spinner());
    }

    render(data) {
        this.innerHTML = "";
        for (let row of data) {
            let accordionListItemElmt = new AccordionListItem(row.id, row.icon, row.name, row.subtitle);
            this.appendChild(accordionListItemElmt);
        }
        if (this.childElementCount <= 0) {
            this.innerHTML = `<p class="fst-italic text-center text-muted">No data</p>`;
        }
    }
}


if (customElements.get("app-accordion-list") == null) {
    customElements.define("app-accordion-list", AccordionList, { extends: "div" });
}
if (customElements.get("app-accordion-list-item") == null) {
    customElements.define("app-accordion-list-item", AccordionListItem, { extends: "div" });
}

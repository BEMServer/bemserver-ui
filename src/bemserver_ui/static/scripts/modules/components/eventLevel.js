export const EventLevel = Object.freeze({
    DEBUG: {
        name: "DEBUG",
        icon: ["bi", "bi-bug", "me-1"],
        badge: ["badge", "text-bg-dark", "bg-opacity-50", "p-2"],
    },
    INFO: {
        name: "INFO",
        icon: ["bi", "bi-info-square", "me-1"],
        badge: ["badge", "text-bg-success", "bg-opacity-75", "p-2"],
    },
    WARNING: {
        name: "WARNING",
        icon: ["bi", "bi-exclamation-triangle", "me-1"],
        badge: ["badge", "text-bg-warning", "bg-opacity-50", "p-2"],
    },
    ERROR: {
        name: "ERROR",
        icon: ["bi", "bi-x-octagon", "me-1"],
        badge: ["badge", "text-bg-danger", "bg-opacity-50", "text-black", "p-2"],
    },
    CRITICAL: {
        name: "CRITICAL",
        icon: ["bi", "bi-radioactive", "me-1"],
        badge: ["badge", "text-bg-danger", "p-2"],
    },
});


export class EventLevelBadge extends HTMLSpanElement {

    #unknownLevelStyle = {
        icon: [],
        badge: ["badge", "text-bg-dark", "p-2"],
    };
    #defaultLevel = EventLevel.INFO;

    #iconElmt = null;
    #textElmt = null;

    static get observedAttributes() {
        return ["level"];
    }

    constructor() {
        super();

        this.#iconElmt = document.createElement("i");
        this.#textElmt = document.createElement("span");

        if (!this.hasAttribute("level")) {
            this.setAttribute("level", this.#defaultLevel.name);
        }
    }

    #update() {
        let level = this.#defaultLevel;
        let levelName = level.name;
        if (this.hasAttribute("level")) {
            levelName = this.getAttribute("level").toUpperCase();
            if (EventLevel[levelName] == null)
            {
                level = this.#unknownLevelStyle;
            }
            else {
                level = EventLevel[levelName];
            }
        }

        this.#iconElmt.setAttribute("class", "");
        this.#iconElmt.classList.add(...level.icon);

        this.setAttribute("class", "");
        this.classList.add("text-nowrap");
        this.classList.add(...level.badge);

        this.#textElmt.innerText = level.name;
    }

    connectedCallback() {
        this.innerHTML = "";
        this.appendChild(this.#iconElmt);
        this.appendChild(this.#textElmt);

        this.#update();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue != newValue) {
            switch (name) {
                case "level":
                    this.#update();
                    break;
            }
        }
    }

    update(options = {}) {
        if (options.level != null) {
            this.setAttribute("level", options.level.toString().toUpperCase());
        }
    }
}


if (window.customElements.get("app-event-level") == null) {
    window.customElements.define("app-event-level", EventLevelBadge, { extends: "span" });
}

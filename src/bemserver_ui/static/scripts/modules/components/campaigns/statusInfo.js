export class CampaignStatusInfoElement extends HTMLDivElement {

    #availableRenderStyles = ["text", "bullet"];
    #renderStyle = "bullet";
    #campaignStatus = "unknown";
    #campaignName = "";

    #statusElmt = null;
    #nameElmt = null;

    constructor(options = {}) {
        super();

        this.#loadOptions(options);
    }

    connectedCallback() {
        this.#render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue != newValue) {
            if (name == "render-style" && this.#availableRenderStyles.includes(newValue)) {
                this.#renderStyle = newValue;
                this.#updateStatus();
            }
            else if (name == "status") {
                this.#campaignStatus = newValue;
                this.#updateStatus();
            }
            else if (name == "label") {
                this.#campaignName = newValue;
                this.#updateLabel();
            }
        }
    }

    #loadOptions(options = {}) {
        let renderStyle = this.getAttribute("render-style") || options.renderStyle;
        if (this.#availableRenderStyles.includes(renderStyle)) {
            this.#renderStyle = renderStyle;
        }

        this.#campaignStatus = this.getAttribute("status") || options.status || "unknown";
        this.#campaignName = this.getAttribute("label") || options.label || "";
    }

    #render() {
        this.innerHTML = "";
        this.classList.add("hstack", "align-items-center", "gap-2", "w-100");

        this.#statusElmt = document.createElement("span");
        this.appendChild(this.#statusElmt);
        this.#updateStatus();

        this.#nameElmt = document.createElement("span");
        this.#nameElmt.classList.add("text-truncate");
        this.appendChild(this.#nameElmt);

        this.#updateLabel();
    }

    #updateStatus() {
        this.#statusElmt.innerHTML = "";
        this.#statusElmt.className = "";
        this.#statusElmt.removeAttribute("title");

        let subStyleClassName = this.#campaignStatus == "ongoing" ? "success" : "danger";
        if (this.#renderStyle == "text") {
            this.#statusElmt.classList.add("fw-bold", `text-${subStyleClassName}`, "text-opacity-75");
            this.#statusElmt.textContent = `[${this.#campaignStatus.toLocaleUpperCase(navigator.languages)}]`
        }
        else if (this.#renderStyle == "bullet") {
            this.#statusElmt.classList.add(`bg-${subStyleClassName}`, "border", "border-light", "rounded-circle", "p-2");
            this.#statusElmt.setAttribute("title", `Campaign state: ${this.#campaignStatus.toLocaleUpperCase(navigator.languages)}`);

            let spanElmt = document.createElement("span");
            spanElmt.classList.add("visually-hidden");
            spanElmt.textContent = this.#campaignStatus.toLocaleUpperCase(navigator.languages);
            this.#statusElmt.appendChild(spanElmt);
        }
    }

    #updateLabel() {
        this.#nameElmt.textContent = this.#campaignName;
    }
}


if (window.customElements.get("app-campaign-status-info") == null) {
    window.customElements.define("app-campaign-status-info", CampaignStatusInfoElement, { extends: "div" });
}

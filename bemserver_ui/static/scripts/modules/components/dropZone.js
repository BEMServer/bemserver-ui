import { Spinner } from "./spinner.js";


export class DropZone extends HTMLDivElement {

    #allowDuplicates = false;

    #dropEffect = "copy";
    #dropCount = 0;

    #helpTitle = "No items yet.";
    #helpTexts = ["Drag and drop items here."];

    #getDraggedElmtCallback = null;

    constructor(options) {
        super();

        this.#dropEffect = options.dropEffect || "copy";
        this.#helpTitle = options.helpTitle || "No items yet.";
        this.#helpTexts = options.helpTexts || ["Drag and drop items here."];
        this.#getDraggedElmtCallback = options.getDraggedElmtCallback;
    }

    get count() {
        return this.#dropCount;
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("d-flex", "flex-wrap", "gap-2", "m-2");

        this.#initEventListeners();
    }

    #initEventListeners() {
        this.addEventListener("dragover", (event) => {
            event.preventDefault();

            let sourceElmt = this.#getDraggedElmtCallback?.();

            let isDuplicate = (!this.#allowDuplicates && sourceElmt != null);
            if (isDuplicate) {
                sourceElmt.classList.add("dragging-duplicate");
                this.classList.add("drop-not-allowed");
                event.dataTransfer.dropEffect = "none";
            }
            else {
                this.classList.add("dragover");
                event.dataTransfer.dropEffect = this.#dropEffect;
            }
        });

        this.addEventListener("dragleave", (event) => {
            event.preventDefault();

            this.classList.remove("dragover");
            this.classList.remove("drop-not-allowed");

            let sourceElmt = this.#getDraggedElmtCallback?.();
            sourceElmt?.classList.remove("dragging-duplicate");
        });

        this.addEventListener("drop", (event) => {
            event.preventDefault();

            this.classList.remove("dragover");
            this.classList.remove("drop-not-allowed");

            let isDuplicate = false;
            if (!this.#allowDuplicates) {
                let jsonData = JSON.parse(event.dataTransfer.getData("application/json"));
                isDuplicate = this.querySelector(`#${jsonData.sourceNodeId}`) != null;
            }

            let dropEvent = new CustomEvent("itemDrop", {
                detail: {
                    dataTransfer: event.dataTransfer,
                    target: this,
                    isDuplicate: isDuplicate,
                },
                bubbles: true,
            });
            this.dispatchEvent(dropEvent);
        });
    }

    addElement(element) {
        let isDuplicate = false;
        if (!this.#allowDuplicates) {
            isDuplicate = this.querySelector(`#${element.id}`) != null;
        }
        if (!isDuplicate) {
            if (this.#dropCount <= 0) {
                this.clear();
            }
            this.appendChild(element);
            this.#dropCount += 1;
        }
    }

    removeElement(element) {
        if (this.querySelector(`#${element.id}`) != null) {
            element.remove();
            this.#dropCount -= 1;

            if (this.#dropCount <= 0) {
                this.clear();
                this.setHelp();
            }
        }
    }

    setLoading() {
        this.innerHTML = "";
        this.appendChild(new Spinner());
    }

    setHelp() {
        this.innerHTML = "";

        let helpContainerElmt = document.createElement("div");
        helpContainerElmt.classList.add("alert", "alert-info");
        helpContainerElmt.setAttribute("role", "alert");
        this.appendChild(helpContainerElmt);

        let helpIconElmt = document.createElement("i");
        helpIconElmt.classList.add("bi", "bi-question-diamond", "me-1");
        helpContainerElmt.appendChild(helpIconElmt);

        let helpTitleElmt = document.createElement("span");
        helpTitleElmt.classList.add("fw-bold");
        helpTitleElmt.innerText = this.#helpTitle;
        helpContainerElmt.appendChild(helpTitleElmt);

        let helpTextContainerElmt = document.createElement("div");
        helpTextContainerElmt.classList.add("fst-italic");
        if (this.#helpTexts.length > 0) {
            helpTextContainerElmt.classList.add("mt-2");
        }
        helpContainerElmt.appendChild(helpTextContainerElmt);

        for (let helpText of this.#helpTexts) {
            let helpTextElmt = document.createElement("p");
            helpTextElmt.classList.add("mb-0");
            helpTextElmt.innerHTML = helpText;
            helpTextContainerElmt.appendChild(helpTextElmt);
        }
    }

    clear() {
        this.innerHTML = "";
        this.#dropCount = 0;
    }
}


if (customElements.get("app-drop-zone") == null) {
    customElements.define("app-drop-zone", DropZone, { extends: "div" });
}

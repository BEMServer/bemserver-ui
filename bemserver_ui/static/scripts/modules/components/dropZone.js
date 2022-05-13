import { Spinner } from "./spinner.js";


class DropZone extends HTMLDivElement {

    #allowDuplicates = false;

    #dropEffect = "copy";
    #dropCount = 0;

    #helpTitle = "No items yet.";
    #helpTexts = ["Drag and drop items here."];

    constructor(options = { dropEffect: "copy", helpTitle: "No items yet.", helpTexts: ["Drag and drop items here."] }) {
        super();

        this.#dropEffect = options.dropEffect;
        this.#helpTitle = options.helpTitle;
        this.#helpTexts = options.helpTexts;
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
        this.addEventListener("dragover", function(event) {
            event.preventDefault();

            let jsonData = JSON.parse(event.dataTransfer.getData("application/json"));
            let sourceElmt = this.querySelector(`#${jsonData.sourceNodeId}`);

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

            let dragOverEvent = new CustomEvent("itemDragOver", {
                detail: {
                    dataTransfer: event.dataTransfer,
                    target: this,
                    isDuplicate: isDuplicate,
                },
                bubbles: true,
            });
            this.dispatchEvent(dragOverEvent);
        }.bind(this));

        this.addEventListener("dragleave", function(event) {
            event.preventDefault();

            this.classList.remove("dragover");
            this.classList.remove("drop-not-allowed");

            let jsonData = JSON.parse(event.dataTransfer.getData("application/json"));
            let sourceElmt = this.querySelector(`#${jsonData.sourceNodeId}`);
            sourceElmt?.classList.remove("dragging-duplicate");

            let dragLeaveEvent = new CustomEvent("itemDragLeave", {
                detail: {
                    dataTransfer: event.dataTransfer,
                    target: this,
                },
                bubbles: true,
            });
            this.dispatchEvent(dragLeaveEvent);
        }.bind(this));

        this.addEventListener("drop", function(event) {
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
        }.bind(this));
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


customElements.define("app-drop-zone", DropZone, { extends: "div" });


export { DropZone };

import { Spinner } from "./spinner.js";


class DropZone extends HTMLDivElement {

    #allowDuplicates = false;

    #dropCount = 0;

    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("d-flex", "flex-wrap", "gap-2", "m-2");

        this.#initEventListeners();
    }

    #initEventListeners() {
        this.addEventListener("dragover", function(event) {
            event.preventDefault();

            let isDuplicate = false;
            if (!this.#allowDuplicates) {
                let jsonData = JSON.parse(event.dataTransfer.getData("application/json"));
                isDuplicate = this.querySelector(`#${jsonData.sourceNodeId}`) != null;
            }

            if (isDuplicate) {
                this.classList.add("drop-not-allowed");
            }
            else {
                this.classList.add("dragover");
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
        this.innerHTML = `<div class="alert alert-info" role="alert">
    <i class="bi bi-question-diamond"></i>
    <span class="fst-italic">Drag and drop sites or zones here to locate this timeseries.</span>
</div>`;
    }

    clear() {
        this.innerHTML = "";
        this.#dropCount = 0;
    }
}


customElements.define("app-drop-zone", DropZone, { extends: "div" });


export { DropZone };

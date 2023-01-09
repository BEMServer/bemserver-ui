import { Spinner } from "./spinner.js";


export class DropZone extends HTMLDivElement {

    #allowDuplicates = false;

    #dropEffect = "copy";
    #dropCount = 0;

    #helpNoItemsText = "No items";
    #helpBackgroundText = "Drag and drop items here";

    #getDraggedElmtCallback = null;

    #innerDropZoneElmt = null;
    #helpContainerElmt = null;

    constructor(options) {
        super();

        this.#dropEffect = options.dropEffect || "copy";
        this.#helpNoItemsText = options.helpNoItemsText || "No items";
        this.#helpBackgroundText = options.helpBackgroundText || "Drag and drop items here";
        this.#getDraggedElmtCallback = options.getDraggedElmtCallback;

        this.#innerDropZoneElmt = document.createElement("div");
        this.#innerDropZoneElmt.classList.add("d-flex", "flex-wrap", "gap-2", "m-2", "px-2", "py-3");
    }

    get count() {
        return this.#dropCount;
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("position-relative");
        this.style.minHeight = "100";

        this.#helpContainerElmt = document.createElement("div");
        this.#helpContainerElmt.classList.add("position-absolute", "bottom-0", "end-0", "pb-1", "pe-3");
        this.appendChild(this.#helpContainerElmt);

        let helpTextElmt = document.createElement("span");
        helpTextElmt.classList.add("fst-italic", "text-black", "text-opacity-25");
        helpTextElmt.innerText = this.#helpBackgroundText;
        this.#helpContainerElmt.appendChild(helpTextElmt);

        this.appendChild(this.#innerDropZoneElmt);

        this.showNoItems();
        this.showHelp();

        this.#initEventListeners();
    }

    #initEventListeners() {
        this.addEventListener("dragover", (event) => {
            event.preventDefault();

            let sourceElmt = this.#getDraggedElmtCallback?.();

            let isDuplicate = (!this.#allowDuplicates && sourceElmt != null);
            if (isDuplicate) {
                sourceElmt.classList.add("dragging-duplicate");
                this.#innerDropZoneElmt.classList.add("drop-not-allowed");
                event.dataTransfer.dropEffect = "none";
            }
            else {
                this.#innerDropZoneElmt.classList.add("dragover");
                event.dataTransfer.dropEffect = this.#dropEffect;
            }
        });

        this.addEventListener("dragleave", (event) => {
            event.preventDefault();

            this.#innerDropZoneElmt.classList.remove("dragover");
            this.#innerDropZoneElmt.classList.remove("drop-not-allowed");

            let sourceElmt = this.#getDraggedElmtCallback?.();
            sourceElmt?.classList.remove("dragging-duplicate");
        });

        this.addEventListener("drop", (event) => {
            event.preventDefault();

            this.#innerDropZoneElmt.classList.remove("dragover");
            this.#innerDropZoneElmt.classList.remove("drop-not-allowed");

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
            this.#innerDropZoneElmt.appendChild(element);
            this.#dropCount += 1;
        }
    }

    removeElement(element) {
        if (this.querySelector(`#${element.id}`) != null) {
            element.remove();
            this.#dropCount -= 1;

            if (this.#dropCount <= 0) {
                this.clear();
                this.showNoItems();
            }
        }
    }

    setLoading() {
        this.#innerDropZoneElmt.innerHTML = "";
        this.#innerDropZoneElmt.appendChild(new Spinner());
    }

    showHelp() {
        this.#innerDropZoneElmt.classList.add("border", "border-4", "rounded-4", "bg-white", "app-border-dashed");
        this.#helpContainerElmt.classList.remove("d-none");
    }

    hideHelp() {
        this.#innerDropZoneElmt.classList.remove("border", "border-4", "rounded-4", "bg-white", "app-border-dashed");
        this.#helpContainerElmt.classList.add("d-none");
    }

    showNoItems() {
        if (this.#dropCount <= 0) {
            this.#innerDropZoneElmt.innerHTML = "";
            let noItemsElmt = document.createElement("span");
            noItemsElmt.classList.add("fst-italic", "text-muted");
            noItemsElmt.innerText = this.#helpNoItemsText;
            this.#innerDropZoneElmt.appendChild(noItemsElmt);
        }
    }

    clear() {
        this.#innerDropZoneElmt.innerHTML = "";
        this.#dropCount = 0;
    }
}


if (window.customElements.get("app-drop-zone") == null) {
    window.customElements.define("app-drop-zone", DropZone, { extends: "div" });
}

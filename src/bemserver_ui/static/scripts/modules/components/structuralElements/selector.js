import "../tree.js";
import { filter } from "../../tools/array.js";


export class StructuralElementSelector extends HTMLElement {

    #treeSelectorElmt = null;
    #treeSelectorData = null;
    #treeNodeDataSelected = null;

    #selectedItemsContainerElmt = null;
    #clearSelectionBtnElmt = null;

    #searchInputElmt = null;
    #searchClearBtnElmt = null;

    get selectedData() {
        return this.#treeNodeDataSelected;
    }

    constructor() {
        super();

        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#treeSelectorElmt = this.querySelector("#treeSelector");

        this.#selectedItemsContainerElmt = this.querySelector("#selectedItemsContainer");
        this.#clearSelectionBtnElmt = this.querySelector("#clearSelectionBtn");

        this.#searchInputElmt = this.querySelector("#search");
        this.#searchClearBtnElmt = this.querySelector("#clearSearchBtn");
    }

    #initEventListeners() {
        this.#treeSelectorElmt.addEventListener("treeNodeSelect", (event) => {
            this.#treeNodeDataSelected = event.detail;
            this.#update();
        });

        this.#treeSelectorElmt.addEventListener("treeNodeUnselect", () => {
            this.#treeNodeDataSelected = null;
            this.#update();
        });

        this.#clearSelectionBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#treeSelectorElmt.unselect();
        });

        this.#searchInputElmt.addEventListener("input", (event) => {
            event.preventDefault();

            this.#update();
            this.#loadTree();
        });

        this.#searchClearBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.#searchInputElmt.value = "";
            this.#update();
            this.#loadTree();
        });
    }

    #update() {
        if (this.#searchInputElmt.value != "") {
            this.#searchInputElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
            this.#searchClearBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#searchInputElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#searchClearBtnElmt.classList.add("d-none", "invisible");
        }

        this.#selectedItemsContainerElmt.innerHTML = "";
        if (this.#treeNodeDataSelected != null) {
            let selectedNodeContainerElmt = document.createElement("div");
            selectedNodeContainerElmt.classList.add("hstack", "gap-2");
            this.#selectedItemsContainerElmt.appendChild(selectedNodeContainerElmt);

            let selectedNodeNameElmt = document.createElement("span");
            selectedNodeNameElmt.classList.add("fw-bold");
            selectedNodeNameElmt.innerText = this.#treeNodeDataSelected.name;
            selectedNodeContainerElmt.appendChild(selectedNodeNameElmt);

            let selectedNodePathElmt = document.createElement("small");
            selectedNodePathElmt.classList.add("text-muted");
            selectedNodePathElmt.innerText = this.#treeNodeDataSelected.path;
            selectedNodeContainerElmt.appendChild(selectedNodePathElmt);

            this.#clearSelectionBtnElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#clearSelectionBtnElmt.classList.add("d-none", "invisible");
        }
    }

    #loadTree() {
        let filteredData = this.#treeSelectorData;
        if (this.#searchInputElmt.value != "") {
            this.showLoadingTree();
            filteredData = filter(this.#treeSelectorData, this.#searchInputElmt.value, "name", false, true);
        }
        this.#treeSelectorElmt.load(filteredData);

        if (this.#searchInputElmt.value != "") {
            this.#treeSelectorElmt.expandAll();
        }
    }

    connectedCallback() {
        this.#initEventListeners();
        this.#update();
    }

    showLoadingTree() {
        this.#treeSelectorElmt.showLoading();
    }

    loadTree(data) {
        this.#treeSelectorData = data;
        this.#loadTree();
    }

    select(nodeId) {
        this.#treeSelectorElmt.select(nodeId);
    }

    unselect() {
        this.#treeSelectorElmt.unselect();
    }

    setSelectableTypes(types = ["site", "building", "storey", "space", "zone"]) {
        this.showLoadingTree();

        let recursiveSetNodeSelectable = (node, types) => {
            node.is_selectable = types.includes(node.type);
            for (let childNode of node.nodes) {
                recursiveSetNodeSelectable(childNode, types);
            }
        };

        for (let node of this.#treeSelectorData) {
            recursiveSetNodeSelectable(node, types);
        }

        this.#loadTree();
    }

    static getInstance(elementId = null) {
        let queryId = "";
        if (elementId != null) {
            queryId = `[id="${elementId}"]`;
        }
        return document.querySelector(`app-structural-element-selector${queryId}`);
    }
}


if (customElements.get("app-structural-element-selector") == null) {
    customElements.define("app-structural-element-selector", StructuralElementSelector);
}

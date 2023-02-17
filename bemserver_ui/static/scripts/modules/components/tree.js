import { Parser } from "../tools/parser.js";
import { Spinner } from "./spinner.js";


// TODO: TreeNode class? (extends from HTMLLIElement)


export class Tree extends HTMLElement {

    #maxWidth = null;
    #showToolbar = true;
    #ignoreUnselectEvent = true;
    #defaultTreeNodeIconClasses = ["bi", "bi-folder"];
    #defaultTreeNodeCollapsedIconClasses = ["bi", "bi-folder-plus"];
    #defaultTreeNodeExpandedIconClasses = ["bi", "bi-folder-minus"];
    #treeNodeIconClasses = this.#defaultTreeNodeIconClasses;
    #treeNodeCollapsedIconClasses = this.#defaultTreeNodeCollapsedIconClasses;
    #treeNodeExpandedIconClasses = this.#defaultTreeNodeExpandedIconClasses;

    #toolbarElmt = null;
    #collapseAllBtnElmt = null;
    #expandAllBtnElmt = null;
    #treeContainerElmt = null;

    #treeNodeSelected = null;

    constructor(options = {}) {
        super();

        this.#loadOptions(options);
        this.#initDOM();
    }

    #loadOptions(options = {}) {
        this.#maxWidth = options.maxWidth || this.getAttribute("max-width");
        this.#showToolbar = options.showToolbar != null ? options.showToolbar : this.hasAttribute("toolbar") ? Parser.parseBoolOrDefault(this.getAttribute("toolbar")) : true;
        this.#ignoreUnselectEvent = options.ignoreUnselect != null ? options.ignoreUnselect : this.hasAttribute("ignore-unselect") ? Parser.parseBoolOrDefault(this.getAttribute("ignore-unselect")) : true;
        this.#treeNodeIconClasses = options.treeNodeIconClasses || this.getAttribute("icon")?.split(",") || this.#defaultTreeNodeIconClasses;
        this.#treeNodeCollapsedIconClasses = options.treeNodeCollapsedIconClasses || this.getAttribute("icon-collapsed")?.split(",") || this.#defaultTreeNodeCollapsedIconClasses;
        this.#treeNodeExpandedIconClasses = options.treeNodeExpandedIconClasses || this.getAttribute("icon-expanded")?.split(",") || this.#defaultTreeNodeExpandedIconClasses;
    }

    #initDOM() {
        this.#treeContainerElmt = document.createElement("div");
        this.#treeContainerElmt.classList.add("nav-tree");

        this.#toolbarElmt = document.createElement("div");
        this.#toolbarElmt.classList.add("d-sm-flex", "d-grid", "justify-content-end", "gap-sm-3", "gap-1");

        this.#collapseAllBtnElmt = document.createElement("a");
        this.#collapseAllBtnElmt.classList.add("link-primary", "text-decoration-none");
        this.#collapseAllBtnElmt.setAttribute("role", "button");
        this.#toolbarElmt.appendChild(this.#collapseAllBtnElmt);

        let collapseIconElmt = document.createElement("i");
        collapseIconElmt.classList.add("bi", "bi-arrows-collapse", "me-1");
        this.#collapseAllBtnElmt.appendChild(collapseIconElmt);

        let collapseTextElmt = document.createElement("small");
        collapseTextElmt.classList.add("text-nowrap");
        collapseTextElmt.innerText = "collapse all";
        this.#collapseAllBtnElmt.appendChild(collapseTextElmt);

        this.#expandAllBtnElmt = document.createElement("a");
        this.#expandAllBtnElmt.classList.add("link-primary", "text-decoration-none");
        this.#expandAllBtnElmt.setAttribute("role", "button");
        this.#toolbarElmt.appendChild(this.#expandAllBtnElmt);

        let expandIconElmt = document.createElement("i");
        expandIconElmt.classList.add("bi", "bi-arrows-expand", "me-1");
        this.#expandAllBtnElmt.appendChild(expandIconElmt);

        let expandTextElmt = document.createElement("small");
        expandTextElmt.classList.add("text-nowrap");
        expandTextElmt.innerText = "expand all";
        this.#expandAllBtnElmt.appendChild(expandTextElmt);
    }

    #initEventListeners() {
        this.#collapseAllBtnElmt?.addEventListener("click", () => { this.collapseAll(); });
        this.#expandAllBtnElmt?.addEventListener("click", () => { this.expandAll(); });
    }

    #getCollapsableFromItem(itemElmt, switchable=false, ancestor=false) {
        let collapsableElmt = null;
        if (ancestor) {
            collapsableElmt = itemElmt?.closest("ul.collapse");
        }
        else {
            collapsableElmt = itemElmt?.querySelector("ul.collapse");
        }
        if (collapsableElmt != null) {
            return new bootstrap.Collapse(collapsableElmt, {toggle: switchable});
        }
        return null;
    }

    #collapseItem(itemElmt) {
        let bsCollapse = this.#getCollapsableFromItem(itemElmt);
        bsCollapse?.hide();
    }

    #expandItem(itemElmt) {
        let bsCollapse = this.#getCollapsableFromItem(itemElmt);
        bsCollapse?.show();
    }

    #expandOrCollapseItem(itemElmt) {
        let bsCollapse = this.#getCollapsableFromItem(itemElmt, switchable=true);
        bsCollapse?.toggle();
    }

    #renderNodes(nodes, parentElmt = null, parentNodeId = null, level = 0) {
        let ulElmt = document.createElement("ul");
        ulElmt.id = `level-${level}${parentNodeId != null ? `-${parentNodeId}` : ""}`;
        ulElmt.classList.add("collapse");
        if (level == 0) {
            ulElmt.classList.add("show");
        }
        ulElmt.classList.add("mb-0");

        if (parentElmt == null) {
            this.#treeContainerElmt.appendChild(ulElmt);
        }
        else {
            parentElmt.appendChild(ulElmt);
        }

        for (let node of nodes) {
            let hasChildren = node.nodes.length > 0;

            let liElmt = document.createElement("li");
            liElmt.classList.add("nav-tree-item", "text-truncate", "m-1");
            ulElmt.appendChild(liElmt);

            let iconElmt = document.createElement("i");

            if (hasChildren) {
                iconElmt.classList.add(...this.#treeNodeCollapsedIconClasses, "me-1");

                let iconLinkElmt = document.createElement("a");
                iconLinkElmt.classList.add("nav-tree-item-icon");
                iconLinkElmt.setAttribute("data-bs-toggle", "collapse");
                iconLinkElmt.setAttribute("data-bs-target", `#level-${level + 1}-${node.id}`);
                iconLinkElmt.appendChild(iconElmt);

                liElmt.appendChild(iconLinkElmt);

                liElmt.addEventListener("show.bs.collapse", (event) => {
                    if (event.target.parentElement == liElmt) {
                        iconElmt.classList.remove(...this.#treeNodeCollapsedIconClasses);
                        iconElmt.classList.add(...this.#treeNodeExpandedIconClasses);
                    }
                });
                liElmt.addEventListener("hide.bs.collapse", (event) => {
                    if (event.target.parentElement == liElmt) {
                        iconElmt.classList.remove(...this.#treeNodeExpandedIconClasses);
                        iconElmt.classList.add(...this.#treeNodeCollapsedIconClasses);
                    }
                });
            }
            else {
                iconElmt.classList.add(...this.#treeNodeIconClasses, "me-1");
                liElmt.appendChild(iconElmt);
            }

            let linkElmt = document.createElement("a");
            linkElmt.classList.add("nav-tree-item-link", "rounded", "px-2", "py-1");
            linkElmt.id = node.node_id;
            linkElmt.title = node.full_path;
            linkElmt.innerText = node.name;
            linkElmt.setAttribute("data-tree-node-id", node.id);
            linkElmt.setAttribute("data-tree-node-type", node.type);
            linkElmt.setAttribute("data-tree-node-path", node.path);
            linkElmt.setAttribute("draggable", node.is_draggable);
            if (!Parser.parseBoolOrDefault(node.is_selectable)) {
                linkElmt.classList.add("disabled");
                linkElmt.setAttribute("aria-disabled", true);
            }
            liElmt.appendChild(linkElmt);

            linkElmt.addEventListener("click", (event) => {
                if (Parser.parseBoolOrDefault(node.is_selectable)) {
                    if (this.#treeNodeSelected != event.target) {
                        this.#treeNodeSelected?.classList.remove("active");
                        this.#treeNodeSelected = event.target;
                        this.#treeNodeSelected.classList.add("active");
                        this.#getCollapsableFromItem(this.#treeNodeSelected.parentElement)?.show();

                        let treeNodeSelectEvent = new CustomEvent("treeNodeSelect", {detail: node, bubbles: true});
                        this.dispatchEvent(treeNodeSelectEvent);

                    }
                    else if (!this.#ignoreUnselectEvent) {
                        this.#treeNodeSelected?.classList.remove("active");
                        this.#treeNodeSelected = null;

                        let treeNodeUnselectEvent = new CustomEvent("treeNodeUnselect", {detail: node, bubbles: true});
                        this.dispatchEvent(treeNodeUnselectEvent);
                    }
                }
                else {
                    event.stopPropagation();

                    this.#getCollapsableFromItem(event.target.parentElement)?.show();
                }
            });

            if (Parser.parseBoolOrDefault(node.is_draggable, false)) {
                linkElmt.addEventListener("dragstart", (event) => {
                    linkElmt.classList.add("dragging");

                    event.dataTransfer.effectAllowed = "all";
                    event.dataTransfer.setData("application/json", JSON.stringify(this.getTreeNodeData(node.type, node.id)));

                    let itemDragStartEvent = new CustomEvent("itemDragStart", {detail: {"target": linkElmt}, bubbles: true});
                    this.dispatchEvent(itemDragStartEvent);
                });
                linkElmt.addEventListener("dragend", () => {
                    linkElmt.classList.remove("dragging");

                    let itemDragEndEvent = new CustomEvent("itemDragEnd", {detail: {"target": linkElmt}, bubbles: true});
                    this.dispatchEvent(itemDragEndEvent);
                });
            }

            if (hasChildren) {
                this.#renderNodes(node.nodes, liElmt, node.id, level+1);
            }
        }
    }

    getTreeNodeData(nodeType, nodeId) {
        let querySelectorString = `.nav-tree-item-link[data-tree-node-type="${nodeType}"][data-tree-node-id="${nodeId}"]`;
        let treeNodeElmt = this.#treeContainerElmt.querySelector(querySelectorString);
        return {
            "sourceNodeData": {
                "id": nodeId,
                "type": nodeType,
                "path": treeNodeElmt?.getAttribute("data-tree-node-path"),
                "name": treeNodeElmt?.innerText,
            },
            "sourceNodeId": `${nodeType}-${nodeId}`,
            "sourceNodeQuerySelector": querySelectorString,
        };
    }

    connectedCallback() {
        this.innerHTML = "";
        this.classList.add("d-flex", "justify-content-between", "align-items-start", "border", "rounded", "p-2", "gap-3");

        this.#treeContainerElmt.style.maxWidth = this.#maxWidth;
        this.appendChild(this.#treeContainerElmt);

        if (!this.#showToolbar) {
            this.#toolbarElmt.classList.add("d-none", "invisible");
        }
        this.appendChild(this.#toolbarElmt);

        this.#initEventListeners();
    }

    collapseAll() {
        let treeNodeElmts = [].slice.call(this.#treeContainerElmt.querySelectorAll(".nav-tree-item"));
        treeNodeElmts.reverse().forEach((itemElmt) => {
            this.#collapseItem(itemElmt);
        });
    }

    expandAll() {
        let treeNodeElmts = [].slice.call(this.#treeContainerElmt.querySelectorAll(".nav-tree-item"));
        treeNodeElmts.forEach((itemElmt) => {
            this.#expandItem(itemElmt);
        });
    }

    showLoading() {
        this.#treeContainerElmt.innerHTML = "";
        this.#treeContainerElmt.appendChild(new Spinner());
    }

    hideLoading() {
        this.#treeContainerElmt.innerHTML = "";
    }

    load(data) {
        this.hideLoading();

        if (data.length > 0) {
            this.#renderNodes(data);
        }
        else {
            let noDataElmt = document.createElement("p");
            noDataElmt.classList.add("fst-italic", "text-muted", "mb-0");
            noDataElmt.innerText = "No data";
            this.#treeContainerElmt.appendChild(noDataElmt);
        }
    }

    select(nodeId) {
        this.unselect();
        let [nodeType, _nodeId] = nodeId.split("-");
        let nodeData = this.getTreeNodeData(nodeType, _nodeId);
        let treeNodeElmt = this.#treeContainerElmt.querySelector(nodeData.sourceNodeQuerySelector)
        treeNodeElmt?.click();

        // Expand all parent nodes until root node.
        let collapsableParent = this.#getCollapsableFromItem(treeNodeElmt, false, true);
        while (collapsableParent != null) {
            collapsableParent.show();
            collapsableParent = this.#getCollapsableFromItem(collapsableParent._element.parentElement, false, true);
        }
    }

    unselect() {
        if (this.#treeNodeSelected != null) {
            this.#treeNodeSelected.click();
        }
    }
}


if (window.customElements.get("app-tree") == null) {
    window.customElements.define("app-tree", Tree);
}

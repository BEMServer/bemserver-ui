import { Parser } from "./tools/parser.js"

class Tree {

    #treeId = "tree";
    #treeElmt = null;
    #treeItemElmts = [];
    #toolbarElmt = null
    #collapseAllBtnElmt = null;
    #expandAllBtnElmt = null;

    #selectedTreeItem = null;
    #onSelectedTreeItemCallback = null;
    #onUnselectedTreeItemCallback = null;
    selectedItemId = null;
    selectedItemType = null;
    selectedItemPath = null;

    #ignoreUnselectEvent = true;

    #defaultIconItem = "bi bi-folder";
    #defaultIconItemCollapsed = "bi bi-folder-plus";
    #defaultIconItemExpanded = "bi bi-folder-minus";
    #iconItem = this.#defaultIconItem;
    #iconItemCollapsed = this.#defaultIconItemCollapsed;
    #iconItemExpanded = this.#defaultIconItemExpanded;

    constructor(treeId, callbacks, options) {
        this.#treeId = treeId;
        this.#onSelectedTreeItemCallback = callbacks?.selected;
        this.#onUnselectedTreeItemCallback = callbacks?.unselected;
        this.#ignoreUnselectEvent = options?.ignoreUnselectEvent != null ? options?.ignoreUnselectEvent : true;
        this.#iconItem = options?.icons?.default != null ? options?.icons?.default : this.#defaultIconItem;
        this.#iconItemCollapsed = options?.icons?.collapsed || this.#defaultIconItemCollapsed;
        this.#iconItemExpanded = options?.icons?.expanded || this.#defaultIconItemExpanded;

        this.#cacheDOM();

        this.#initIcons();
        this.#initEventListeners();

        if (this.#treeItemElmts?.length <= 0) {
            this.#toolbarElmt?.classList.add("d-none");
        }
    }

    #cacheDOM() {
        this.#treeElmt = document.getElementById(this.#treeId);
        this.#treeItemElmts = [].slice.call(this.#treeElmt.querySelectorAll(".nav-tree-item"));
        this.#toolbarElmt = document.getElementById(`${this.#treeId}Toolbar`);
        this.#collapseAllBtnElmt = document.getElementById(`${this.#treeId}CollapseAll`);
        this.#expandAllBtnElmt = document.getElementById(`${this.#treeId}ExpandAll`);
    }

    #initIcons() {
        this.#treeItemElmts.forEach(function (itemElmt) {
            let iconLinkElmt = itemElmt.querySelector(".nav-tree-item-icon > i");
            if (iconLinkElmt != null) {
                if (iconLinkElmt.className == this.#defaultIconItemCollapsed) {
                    iconLinkElmt.setAttribute("class", this.#iconItemCollapsed);
                }
                else {
                    iconLinkElmt.setAttribute("class", this.#iconItemExpanded);
                }
            }

            let iconElmt = itemElmt.querySelector(".nav-tree-item > i");
            iconElmt?.setAttribute("class", this.#iconItem);
        }.bind(this));
    }

    #initEventListeners() {
        for (let itemElmt of this.#treeItemElmts) {
            let collapsableElmt = itemElmt.querySelector("ul.collapse");
            collapsableElmt?.addEventListener("show.bs.collapse", function(event) {
                let iconElmt = event.target.parentElement.querySelector(".nav-tree-item-icon > i");
                iconElmt.className = this.#iconItemExpanded;
            }.bind(this));
            collapsableElmt?.addEventListener("hide.bs.collapse", function(event) {
                let iconElmt = event.target.parentElement.querySelector(".nav-tree-item-icon > i");
                iconElmt.className = this.#iconItemCollapsed;
            }.bind(this));

            let linkElmt = itemElmt.querySelector(".nav-tree-item-link");
            if (linkElmt != null) {
                linkElmt.addEventListener("click", function(event) {
                    event.preventDefault();

                    if (this.#selectedTreeItem != event.target) {
                        this.#selectedTreeItem?.classList.remove("active");
                        this.#selectedTreeItem = event.target;
                        this.#selectedTreeItem.classList.add("active");
                        this.selectedItemId = this.#selectedTreeItem.getAttribute("data-tree-item-id");
                        this.selectedItemType = this.#selectedTreeItem.getAttribute("data-tree-item-type");
                        this.selectedItemPath = this.#selectedTreeItem.getAttribute("data-tree-item-path");
                        this.#onSelectedTreeItemCallback?.call(null, this.selectedItemId, this.selectedItemType, this.selectedItemPath);
                        this.#getCollapsableFromItem(this.#selectedTreeItem.parentElement)?.show();
                    }
                    else if (!this.#ignoreUnselectEvent) {
                        this.#selectedTreeItem?.classList.remove("active");
                        this.#selectedTreeItem = null;
                        this.selectedItemId = null;
                        this.selectedItemType = null;
                        this.selectedItemPath = null;
                        this.#onUnselectedTreeItemCallback?.call();
                    }
                }.bind(this));

                let isDraggable = Parser.parseBoolOrDefault(linkElmt.getAttribute("draggable"), false);
                if (isDraggable) {
                    linkElmt.addEventListener("dragstart", function(event) {
                        this.classList.add("dragging");

                        let id = this.getAttribute("data-tree-item-id");
                        let type = this.getAttribute("data-tree-item-type");
                        let path = this.getAttribute("data-tree-item-path");
                        let name = this.innerText;

                        event.dataTransfer.effectAllowed = "all";
                        event.dataTransfer.setData("application/json", JSON.stringify({
                            "sourceNodeData": {
                                "id": id,
                                "type": type,
                                "path": path,
                                "name": name,
                            },
                            "sourceNodeId": `${type}-${id}`,
                            "sourceNodeQuerySelector": `.nav-tree-item-link[data-tree-item-id="${id}"][data-tree-item-type="${type}"]`,
                        }));
                    });
                    linkElmt.addEventListener("dragend", function() {
                        this.classList.remove("dragging");
                    });
                }
            }
        }

        this.#collapseAllBtnElmt?.addEventListener("click", this.collapseAll.bind(this), false);
        this.#expandAllBtnElmt?.addEventListener("click", this.expandAll.bind(this), false);
    }

    #getCollapsableFromItem(itemElmt, switchable=false) {
        let collapsableElmnt = itemElmt.querySelector("ul.collapse");
        if (collapsableElmnt != null) {
            return new bootstrap.Collapse(collapsableElmnt, {toggle: switchable});
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

    collapseAll() {
        this.#treeItemElmts.reverse().forEach(function (itemElmt) {
            this.#collapseItem(itemElmt);
        }.bind(this));
    }

    expandAll() {
        this.#treeItemElmts.forEach(function (itemElmt) {
            this.#expandItem(itemElmt);
        }.bind(this));
    }

    getItemData(itemType, itemId) {
        let querySelectorString = `.nav-tree-item-link[data-tree-item-type="${itemType}"][data-tree-item-id="${itemId}"]`;
        let itemElmt = this.#treeElmt.querySelector(querySelectorString);
        return {
            "sourceNodeData": {
                "id": itemElmt?.getAttribute("data-tree-item-id"),
                "type": itemElmt?.getAttribute("data-tree-item-type"),
                "path": itemElmt?.getAttribute("data-tree-item-path"),
                "name": itemElmt?.innerText,
            },
            "sourceNodeId": `${itemType}-${itemId}`,
            "sourceNodeQuerySelector": querySelectorString,
        };
    }
}


export { Tree };

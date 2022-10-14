export class UserGroupItem extends HTMLDivElement {

    #groupId = null;
    #groupName = null;
    #isDraggable = false;
    #groupViewUrl = null;
    #groupRemoveUserCallback = null;

    #groupRemoveUserBtnElmt = null;

    constructor(groupId, groupName, draggable = false, groupViewUrl = null, groupRemoveUserCallback = null) {
        super();

        this.#groupId = groupId;
        this.#groupName = groupName;
        this.#isDraggable = draggable;
        this.#groupViewUrl = groupViewUrl;
        this.#groupRemoveUserCallback = groupRemoveUserCallback;

        this.id = `${this.#isDraggable ? "drag-" : ""}usergroup-${this.#groupId}`;
    }

    #initEventListeners() {
        if (this.#groupRemoveUserBtnElmt != null && this.#groupRemoveUserCallback != null) {
            this.#groupRemoveUserBtnElmt.addEventListener("click", (event) => {
                event.preventDefault();

                this.#groupRemoveUserCallback();
            });
        }

        if (this.#isDraggable) {
            this.addEventListener("dragstart", (event) => {
                this.classList.add("dragging");

                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/json", JSON.stringify({
                    "sourceNodeData": {
                        "id": this.#groupId,
                        "name": this.#groupName,
                    },
                    "sourceNodeId": this.id,
                }));

                let itemDragStartEvent = new CustomEvent("itemDragStart", {
                    detail: {
                        "target": this,
                    },
                    bubbles: true,
                });
                this.dispatchEvent(itemDragStartEvent);
            });

            this.addEventListener("dragend", () => {
                this.classList.remove("dragging");

                let itemDragEndEvent = new CustomEvent("itemDragEnd", {
                    detail: {
                        "target": this,
                    },
                    bubbles: true,
                });
                this.dispatchEvent(itemDragEndEvent);
            });
        }
    }

    connectedCallback() {
        this.innerHTML = "";

        this.classList.add("text-truncate");
        this.style.maxWidth = "250px";

        if (this.#isDraggable) {
            this.setAttribute("draggable", true);
        }

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", "bi-people", "me-1");

        let textElmt = document.createElement("span");
        textElmt.innerText = this.#groupName;
        textElmt.title = this.#groupName;

        if (this.#groupViewUrl == null) {
            this.classList.add("border", "border-1", "rounded", "bg-white", "p-2");
            this.appendChild(iconElmt);
            this.appendChild(textElmt);
        }
        else {
            this.classList.add("btn-group", "rounded", "bg-white");
            this.setAttribute("role", "group");
            this.setAttribute("aria-label", "Actions on user group");

            let groupViewLinkElmt = document.createElement("a");
            groupViewLinkElmt.classList.add("btn", "btn-outline-secondary", "text-truncate");
            groupViewLinkElmt.setAttribute("role", "button");
            groupViewLinkElmt.href = this.#groupViewUrl;
            groupViewLinkElmt.title = "Manage user group";
            groupViewLinkElmt.appendChild(iconElmt);
            groupViewLinkElmt.appendChild(textElmt);
            this.appendChild(groupViewLinkElmt);
        }

        if (this.#groupRemoveUserCallback != null) {
            this.#groupRemoveUserBtnElmt = document.createElement("button");
            this.#groupRemoveUserBtnElmt.classList.add("btn", "btn-outline-danger", "rounded-end");
            this.#groupRemoveUserBtnElmt.title = "Remove user from group";
            this.appendChild(this.#groupRemoveUserBtnElmt);

            let removeIconElmt = document.createElement("i");
            removeIconElmt.classList.add("bi", "bi-x-lg");
            this.#groupRemoveUserBtnElmt.appendChild(removeIconElmt);
        }

        this.#initEventListeners();
    }
}


if (customElements.get("app-usergroup") == null) {
    customElements.define("app-usergroup", UserGroupItem, { extends: "div" });
}

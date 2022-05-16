import { DropZone } from "../../components/dropZone.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";


class UserManageGroupsView {

    #user = null;

    #messagesElmt = null;

    #userGroupTabElmt = null;
    #userGroupAvailableBtnElmt = null;
    #userGroupContainerElmt = null;
    #userGroupCountElmt = null;

    #userGroupAvailableColumnElmt = null;
    #userGroupAvailableCollapsePanelElmt = null;
    #userGroupAvailableContainerElmt = null;
    #userGroupAvailableCountElmt = null;
    #userGroupAvailableHelpCollapsePanelElmt = null;

    #dropZoneElmt = null;

    constructor(user) {
        this.#user = user;

        this.#cacheDOM();

        this.#dropZoneElmt = new DropZone({ dropEffect: "move", helpTitle: `Not yet a member of any group.`, helpTexts: [`Click on <mark>${this.#userGroupAvailableBtnElmt.innerText}</mark> button to get available group list.`, `Then <span class="fw-bold">drag and drop</span> a group into this zone to make the user a member.`] });
        this.#dropZoneElmt.id = `dropZone-${this.#user.id}`;
        this.#userGroupContainerElmt.appendChild(this.#dropZoneElmt);

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");
        this.#userGroupTabElmt = document.getElementById("groups-tab");
        this.#userGroupAvailableBtnElmt = document.getElementById("userGroupAvailableBtn");
        this.#userGroupContainerElmt = document.getElementById("userGroupContainer");
        this.#userGroupCountElmt = document.getElementById("userGroupCount");
        this.#userGroupAvailableColumnElmt = document.getElementById("userGroupAvailableColumn");
        this.#userGroupAvailableCollapsePanelElmt = document.getElementById("userGroupAvailableCollapsePanel");
        this.#userGroupAvailableContainerElmt = document.getElementById("userGroupAvailableContainer");
        this.#userGroupAvailableCountElmt = document.getElementById("userGroupAvailableCount");
        this.#userGroupAvailableHelpCollapsePanelElmt = document.getElementById("userGroupAvailableHelpCollapsePanel");
    }

    #initEventListeners() {
        this.#userGroupTabElmt.addEventListener("hide.bs.tab", () => {
            let bsCollapse = bootstrap.Collapse.getOrCreateInstance(this.#userGroupAvailableCollapsePanelElmt, {toggle: false});
            bsCollapse.hide();
        });

        this.#userGroupAvailableCollapsePanelElmt.addEventListener("show.bs.collapse", (event) => {
            // Only do this actions when main collapse element event is triggered.
            if (event.target == this.#userGroupAvailableCollapsePanelElmt) {
                this.#userGroupAvailableColumnElmt.classList.remove("d-none");

                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-arrow-bar-right");
                this.#userGroupAvailableBtnElmt.innerHTML = "";
                this.#userGroupAvailableBtnElmt.appendChild(iconElmt);
            }
        });

        this.#userGroupAvailableCollapsePanelElmt.addEventListener("hidden.bs.collapse", (event) => {
            // Only do this actions when main collapse element event is triggered.
            if (event.target == this.#userGroupAvailableCollapsePanelElmt) {
                this.#userGroupAvailableColumnElmt.classList.add("d-none");

                let textElmt = document.createElement("span");
                textElmt.innerText = "Manage user's groups";
                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-arrow-bar-left", "me-1");

                this.#userGroupAvailableBtnElmt.innerHTML = "";
                this.#userGroupAvailableBtnElmt.appendChild(iconElmt);
                this.#userGroupAvailableBtnElmt.appendChild(textElmt);
            }
        });

        this.#dropZoneElmt.addEventListener("itemDrop", (event) => {
            event.preventDefault();

            let jsonData = JSON.parse(event.detail.dataTransfer.getData("application/json"));
            let groupId = jsonData.sourceNodeData.id;
            let groupName = jsonData.sourceNodeData.name;

            let fetcher = new Fetcher();
            fetcher.post(flaskES6.urlFor(`api.user_groups.add_user`, {id: groupId}), {user_id: this.#user.id}).then(
                (data) => {
                    let userGroupItemElmt = this.#createUserGroupElement({id: groupId, name: groupName, rel_id: data.data.id});
                    this.#dropZoneElmt.addElement(userGroupItemElmt);

                    let dropedItemElmt = document.getElementById(jsonData.sourceNodeId);
                    dropedItemElmt.classList.add("d-none", "invisible");

                    this.#refreshCounters();

                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `User added to ${groupName} group!`, isDismissible: true, delay: 4});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                }
            ).catch(
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                }
            );
        });
    }

    #createUserGroupElement(data) {
        let userGroupItemElmt = document.createElement("div");
        userGroupItemElmt.id = `group-${data.id}`;

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", "bi-people", "me-1");

        let textElmt = document.createElement("span");
        textElmt.innerText = data.name;

        if (!signedUser.is_admin) {
            userGroupItemElmt.classList.add("border", "border-1", "rounded", "bg-white", "p-2");
            userGroupItemElmt.appendChild(iconElmt)
            userGroupItemElmt.appendChild(textElmt);
        }
        else {
            userGroupItemElmt.classList.add("btn-group", "rounded", "bg-white");
            userGroupItemElmt.setAttribute("role", "group");
            userGroupItemElmt.setAttribute("aria-label", "Actions on user group");

            let manageLinkElmt = document.createElement("a");
            manageLinkElmt.classList.add("btn", "btn-outline-secondary");
            manageLinkElmt.setAttribute("role", "group");
            manageLinkElmt.href = flaskES6.urlFor("user_groups.view", {id: data.id, tab: "users"});
            manageLinkElmt.title = "Manage user group";
            manageLinkElmt.appendChild(iconElmt);
            manageLinkElmt.appendChild(textElmt);
            userGroupItemElmt.appendChild(manageLinkElmt);

            let removeBtnElmt = document.createElement("button");
            removeBtnElmt.classList.add("btn", "btn-outline-danger", "rounded-end");
            removeBtnElmt.title = "Remove user from group";
            userGroupItemElmt.appendChild(removeBtnElmt);

            let removeIconElmt = document.createElement("i");
            removeIconElmt.classList.add("bi", "bi-x-lg");
            removeBtnElmt.appendChild(removeIconElmt);

            // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
            let modalConfirm = new ModalConfirm(userGroupItemElmt.id, `Remove <mark>${this.#user.name}</mark> user from <mark>${data.name}</mark> group`, () => {
                // Inside the callback to remove user from group.
                let fetcher = new Fetcher();
                fetcher.post(flaskES6.urlFor("api.user_groups.remove_user", {id: data.id, rel_id: data.rel_id})).then(
                    () => {
                        let dropedItemElmt = document.getElementById(`src-group-${data.id}`);
                        if (dropedItemElmt != null) {
                            dropedItemElmt.classList.remove("d-none", "invisible");
                        }
                        else {
                            dropedItemElmt = this.#createUserGroupAvailableElement(data);
                            this.#userGroupAvailableContainerElmt.appendChild(dropedItemElmt);
                        }
        
                        let userGroupItemElmt = document.getElementById(`group-${data.id}`);
                        this.#dropZoneElmt.removeElement(userGroupItemElmt);

                        this.#refreshCounters();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `User removed from ${data.name} group!`, isDismissible: true, delay: 4});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    }
                ).catch(
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    }
                );
            });
            userGroupItemElmt.appendChild(modalConfirm);

            // Add an event listener to display a confirm message on remove button click.
            removeBtnElmt.addEventListener("click", (event) => {
                event.preventDefault();

                // Display modal.
                modalConfirm.show();
            });
        }

        return userGroupItemElmt;
    }

    #createUserGroupAvailableElement(data) {
        let userGroupItemElmt = document.createElement("div");
        userGroupItemElmt.id = `src-group-${data.id}`;
        userGroupItemElmt.classList.add("border", "border-1", "rounded", "bg-white", "p-2");
        userGroupItemElmt.setAttribute("draggable", true);

        let iconElmt = document.createElement("i");
        iconElmt.classList.add("bi", "bi-people", "me-1");
        userGroupItemElmt.appendChild(iconElmt)

        let textElmt = document.createElement("span");
        textElmt.innerText = data.name;
        userGroupItemElmt.appendChild(textElmt);

        userGroupItemElmt.addEventListener("dragstart", (event) => {
            userGroupItemElmt.classList.add("dragging");

            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/json", JSON.stringify({
                "sourceNodeData": {
                    "id": data.id,
                    "name": data.name,
                },
                "sourceNodeId": `src-group-${data.id}`,
            }));
        });
        userGroupItemElmt.addEventListener("dragend", () => {
            userGroupItemElmt.classList.remove("dragging");
        });

        return userGroupItemElmt;
    }

    #refreshCounters() {
        this.#userGroupCountElmt.innerText = this.#dropZoneElmt.count.toString();
        let userGroupAvailableCount = this.#userGroupAvailableContainerElmt.querySelectorAll(":scope > div[draggable=true]:not(.d-none)").length;
        this.#userGroupAvailableCountElmt.innerText = userGroupAvailableCount.toString();

        if (this.#dropZoneElmt.count <= 0) {
            this.#dropZoneElmt.setHelp();
        }
        let noUserGroupAvailableInfoElmt = this.#userGroupAvailableContainerElmt.querySelector(":scope > span");
        if (noUserGroupAvailableInfoElmt == null) {
            noUserGroupAvailableInfoElmt = document.createElement("span");
            noUserGroupAvailableInfoElmt.classList.add("fst-italic");
            noUserGroupAvailableInfoElmt.innerText = "No groups available.";
            this.#userGroupAvailableContainerElmt.appendChild(noUserGroupAvailableInfoElmt);
        }
        if (userGroupAvailableCount <= 0) {
            noUserGroupAvailableInfoElmt.classList.remove("d-none");
        }
        else {
            noUserGroupAvailableInfoElmt.classList.add("d-none");
        }
    }

    refresh() {
        if (!this.#userGroupTabElmt.isLoaded) {
            this.#userGroupCountElmt.innerHTML = "";
            this.#userGroupCountElmt.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

            this.#userGroupAvailableCountElmt.innerHTML = "";
            this.#userGroupAvailableCountElmt.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

            this.#userGroupAvailableContainerElmt.innnerHTML = "";
            this.#userGroupAvailableContainerElmt.appendChild(new Spinner());

            this.#dropZoneElmt.setLoading();

            let fetcher = new Fetcher();
            fetcher.get(flaskES6.urlFor(`api.users.list_groups`, {id: this.#user.id})).then(
                (data) => {
                    this.#dropZoneElmt.clear();
                    for (let row of data.groups) {
                        let userGroupItemElmt = this.#createUserGroupElement(row);
                        this.#dropZoneElmt.addElement(userGroupItemElmt);
                    }

                    this.#userGroupAvailableContainerElmt.innerHTML = "";
                    for (let row of data.available_groups) {
                        let userGroupAvailableItemElmt = this.#createUserGroupAvailableElement(row);
                        this.#userGroupAvailableContainerElmt.appendChild(userGroupAvailableItemElmt);
                    }

                    this.#refreshCounters();

                    this.#userGroupTabElmt.isLoaded = true;
                }
            ).catch(
                (error) => {
                    if (error.name != "AbortError") {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    }
                }
            );
        }
    }
}


export { UserManageGroupsView };

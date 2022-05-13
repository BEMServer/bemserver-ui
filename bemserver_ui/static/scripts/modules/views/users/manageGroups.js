import { DropZone } from "../../components/dropZone.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";


class UserManageGroupsView {

    _user = null;

    _messagesElmt = null;

    _userGroupTabElmt = null;
    _userGroupAvailableBtnElmt = null;
    _userGroupContainerElmt = null;
    _userGroupCountElmt = null;

    _userGroupAvailableColumnElmt = null;
    _userGroupAvailableCollapsePanelElmt = null;
    _userGroupAvailableContainerElmt = null;
    _userGroupAvailableCountElmt = null;
    _userGroupAvailableHelpCollapsePanelElmt = null;

    _dropZoneElmt = null;

    constructor(user) {
        this._user = user;

        this._cacheDOM();

        this._dropZoneElmt = new DropZone({ dropEffect: "move", helpTitle: `Not yet a member of any group.`, helpTexts: [`Click on <mark>${this._userGroupAvailableBtnElmt.innerText}</mark> button to get available group list.`, `Then <span class="fw-bold">drag and drop</span> a group into this zone to make the user a member.`] });
        this._dropZoneElmt.id = `dropZone-${this._user.id}`;
        this._userGroupContainerElmt.appendChild(this._dropZoneElmt);

        this._initEventListeners();
    }

    _cacheDOM() {
        this._messagesElmt = document.getElementById("messages");
        this._userGroupTabElmt = document.getElementById("groups-tab");
        this._userGroupAvailableBtnElmt = document.getElementById("userGroupAvailableBtn");
        this._userGroupContainerElmt = document.getElementById("userGroupContainer");
        this._userGroupCountElmt = document.getElementById("userGroupCount");
        this._userGroupAvailableColumnElmt = document.getElementById("userGroupAvailableColumn");
        this._userGroupAvailableCollapsePanelElmt = document.getElementById("userGroupAvailableCollapsePanel");
        this._userGroupAvailableContainerElmt = document.getElementById("userGroupAvailableContainer");
        this._userGroupAvailableCountElmt = document.getElementById("userGroupAvailableCount");
        this._userGroupAvailableHelpCollapsePanelElmt = document.getElementById("userGroupAvailableHelpCollapsePanel");
    }

    _initEventListeners() {
        this._userGroupTabElmt.addEventListener("hide.bs.tab", () => {
            let bsCollapse = bootstrap.Collapse.getOrCreateInstance(this._userGroupAvailableCollapsePanelElmt, {toggle: false});
            bsCollapse.hide();
        });

        this._userGroupAvailableCollapsePanelElmt.addEventListener("show.bs.collapse", (event) => {
            // Only do this actions when main collapse element event is triggered.
            if (event.target == this._userGroupAvailableCollapsePanelElmt) {
                this._userGroupAvailableColumnElmt.classList.remove("d-none");

                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-arrow-bar-right");
                this._userGroupAvailableBtnElmt.innerHTML = "";
                this._userGroupAvailableBtnElmt.appendChild(iconElmt);
            }
        });

        this._userGroupAvailableCollapsePanelElmt.addEventListener("hidden.bs.collapse", (event) => {
            // Only do this actions when main collapse element event is triggered.
            if (event.target == this._userGroupAvailableCollapsePanelElmt) {
                this._userGroupAvailableColumnElmt.classList.add("d-none");

                let textElmt = document.createElement("span");
                textElmt.innerText = "Manage user's groups";
                let iconElmt = document.createElement("i");
                iconElmt.classList.add("bi", "bi-arrow-bar-left", "me-1");

                this._userGroupAvailableBtnElmt.innerHTML = "";
                this._userGroupAvailableBtnElmt.appendChild(iconElmt);
                this._userGroupAvailableBtnElmt.appendChild(textElmt);
            }
        });

        this._dropZoneElmt.addEventListener("itemDrop", (event) => {
            event.preventDefault();

            let jsonData = JSON.parse(event.detail.dataTransfer.getData("application/json"));
            let groupId = jsonData.sourceNodeData.id;
            let groupName = jsonData.sourceNodeData.name;

            let fetcher = new Fetcher();
            fetcher.post(flaskES6.urlFor(`api.user_groups.add_user`, {id: groupId}), {user_id: this._user.id}).then(
                (data) => {
                    let userGroupItemElmt = this._createUserGroupElement({id: groupId, name: groupName, rel_id: data.data.id});
                    this._dropZoneElmt.addElement(userGroupItemElmt);

                    let dropedItemElmt = document.getElementById(jsonData.sourceNodeId);
                    dropedItemElmt.classList.add("d-none", "invisible");

                    this._refreshCounters();

                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `User added to ${groupName} group!`, isDismissible: true, delay: 4});
                    this._messagesElmt.appendChild(flashMsgElmt);
                }
            ).catch(
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this._messagesElmt.appendChild(flashMsgElmt);
                }
            );
        });
    }

    _createUserGroupElement(data) {
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
            let modalConfirm = new ModalConfirm(userGroupItemElmt.id, `Remove <mark>${this._user.name}</mark> user from <mark>${data.name}</mark> group`, () => {
                // Inside the callback to remove user from group.
                let fetcher = new Fetcher();
                fetcher.post(flaskES6.urlFor("api.user_groups.remove_user", {id: data.id, rel_id: data.rel_id})).then(
                    () => {
                        let dropedItemElmt = document.getElementById(`src-group-${data.id}`);
                        if (dropedItemElmt != null) {
                            dropedItemElmt.classList.remove("d-none", "invisible");
                        }
                        else {
                            dropedItemElmt = this._createUserGroupAvailableElement(data);
                            this._userGroupAvailableContainerElmt.appendChild(dropedItemElmt);
                        }
        
                        let userGroupItemElmt = document.getElementById(`group-${data.id}`);
                        this._dropZoneElmt.removeElement(userGroupItemElmt);

                        this._refreshCounters();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `User removed from ${data.name} group!`, isDismissible: true, delay: 4});
                        this._messagesElmt.appendChild(flashMsgElmt);
                    }
                ).catch(
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this._messagesElmt.appendChild(flashMsgElmt);
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

    _createUserGroupAvailableElement(data) {
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

    _refreshCounters() {
        this._userGroupCountElmt.innerText = this._dropZoneElmt.count.toString();
        let userGroupAvailableCount = this._userGroupAvailableContainerElmt.querySelectorAll(":scope > div[draggable=true]:not(.d-none)").length;
        this._userGroupAvailableCountElmt.innerText = userGroupAvailableCount.toString();

        if (this._dropZoneElmt.count <= 0) {
            this._dropZoneElmt.setHelp();
        }
        let noUserGroupAvailableInfoElmt = this._userGroupAvailableContainerElmt.querySelector(":scope > span");
        if (noUserGroupAvailableInfoElmt == null) {
            noUserGroupAvailableInfoElmt = document.createElement("span");
            noUserGroupAvailableInfoElmt.classList.add("fst-italic");
            noUserGroupAvailableInfoElmt.innerText = "No groups available.";
            this._userGroupAvailableContainerElmt.appendChild(noUserGroupAvailableInfoElmt);
        }
        if (userGroupAvailableCount <= 0) {
            noUserGroupAvailableInfoElmt.classList.remove("d-none");
        }
        else {
            noUserGroupAvailableInfoElmt.classList.add("d-none");
        }
    }

    refresh() {
        if (!this._userGroupTabElmt.isLoaded) {
            this._userGroupCountElmt.innerHTML = "";
            this._userGroupCountElmt.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

            this._userGroupAvailableCountElmt.innerHTML = "";
            this._userGroupAvailableCountElmt.appendChild(new Spinner({useSmallSize: true, useSecondaryColor: true}));

            this._userGroupAvailableContainerElmt.innnerHTML = "";
            this._userGroupAvailableContainerElmt.appendChild(new Spinner());

            this._dropZoneElmt.setLoading();

            let fetcher = new Fetcher();
            fetcher.get(flaskES6.urlFor(`api.users.list_groups`, {id: this._user.id})).then(
                (data) => {
                    this._dropZoneElmt.clear();
                    for (let row of data.groups) {
                        let userGroupItemElmt = this._createUserGroupElement(row);
                        this._dropZoneElmt.addElement(userGroupItemElmt);
                    }

                    this._userGroupAvailableContainerElmt.innerHTML = "";
                    for (let row of data.available_groups) {
                        let userGroupAvailableItemElmt = this._createUserGroupAvailableElement(row);
                        this._userGroupAvailableContainerElmt.appendChild(userGroupAvailableItemElmt);
                    }

                    this._refreshCounters();

                    this._userGroupTabElmt.isLoaded = true;
                }
            ).catch(
                (error) => {
                    if (error.name != "AbortError") {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this._messagesElmt.appendChild(flashMsgElmt);
                    }
                }
            );
        }
    }
}


export { UserManageGroupsView };

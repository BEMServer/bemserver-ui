import { DropZone } from "../../components/dropZone.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { Spinner } from "../../components/spinner.js";
import { UserGroupItem } from "../../components/userGroup/userGroupItem.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6, signedUser } from "../../../app.js";


export class CampaignScopeManageGroupsView {

    #campaignScope = null;

    #internalAPIRequester = null;
    #getGroupListReqID = null;
    #messagesElmt = null;

    #userGroupTabElmt = null;
    #userGroupAvailableBtnElmt = null;
    #userGroupContainerElmt = null;
    #userGroupCountElmt = null;

    #userGroupAvailableColumnElmt = null;
    #userGroupAvailableCollapsePanelElmt = null;
    #userGroupAvailableContainerElmt = null;
    #userGroupAvailableCountElmt = null;

    #dropZoneElmt = null;

    constructor(campaignScope) {
        this.#campaignScope = campaignScope;

        this.#cacheDOM();

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#dropZoneElmt = new DropZone({ dropEffect: "move", helpNoItemsText: `No special groups allowed.`, helpBackgroundText: `Drag and drop groups here` });
        this.#dropZoneElmt.id = `dropZone-${this.#campaignScope.id}`;
        this.#userGroupContainerElmt.appendChild(this.#dropZoneElmt);
        this.#dropZoneElmt.hideHelp();

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

                this.#dropZoneElmt.showHelp();
            }
        });

        this.#userGroupAvailableCollapsePanelElmt.addEventListener("hide.bs.collapse", (event) => {
            if (event.target == this.#userGroupAvailableCollapsePanelElmt) {
                this.#dropZoneElmt.hideHelp();
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

            this.#internalAPIRequester.post(
                flaskES6.urlFor(`api.campaign_scopes.add_group`, {id: this.#campaignScope.id}),
                {group_id: groupId},
                (data) => {
                    let userGroupItemElmt = new UserGroupItem(groupId, groupName, false, signedUser.is_admin ? flaskES6.urlFor(`user_groups.view`, {id: groupId, tab: `campaign_scopes`}) : null, signedUser.is_admin ? this.#userGroupRemoveUserCallback.bind(this, groupId, groupName, data.data.id, this.#campaignScope.name) : null);
                    this.#dropZoneElmt.addElement(userGroupItemElmt);

                    let dropedItemElmt = document.getElementById(jsonData.sourceNodeId);
                    dropedItemElmt.classList.add("d-none", "invisible");

                    this.#refreshCounters();

                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${groupName} added to ${this.#campaignScope.name}!`, isDismissible: true, delay: 4});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        });
    }

    #userGroupRemoveUserCallback(groupId, groupName, groupUserRelId, campaignScopeName) {
        let userGroupItemElmt = document.getElementById(`usergroup-${groupId}`);

        // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
        let modalConfirm = new ModalConfirm(`usergroup-${groupId}`, `Remove <mark>${groupName}</mark> from <mark>${campaignScopeName}</mark>`, () => {
            // Inside the callback to remove user from group.
            this.#internalAPIRequester.post(
                flaskES6.urlFor("api.campaign_scopes.remove_group", {id: this.#campaignScope.id, rel_id: groupUserRelId}),
                null,
                () => {
                    let dropedItemElmt = document.getElementById(`drag-usergroup-${groupId}`);
                    if (dropedItemElmt != null) {
                        dropedItemElmt.classList.remove("d-none", "invisible");
                    }
                    else {
                        dropedItemElmt = new UserGroupItem(groupId, groupName, true);
                        this.#userGroupAvailableContainerElmt.appendChild(dropedItemElmt);
                    }
                    this.#dropZoneElmt.removeElement(userGroupItemElmt);

                    this.#refreshCounters();

                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${groupName} removed from ${this.#campaignScope.name}!`, isDismissible: true, delay: 4});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        });
        userGroupItemElmt.appendChild(modalConfirm);

        modalConfirm.show();
    }

    #refreshCounters() {
        this.#userGroupCountElmt.innerText = this.#dropZoneElmt.count.toString();
        let userGroupAvailableCount = this.#userGroupAvailableContainerElmt.querySelectorAll(":scope > div[draggable=true]:not(.d-none)").length;
        this.#userGroupAvailableCountElmt.innerText = userGroupAvailableCount.toString();

        if (this.#dropZoneElmt.count <= 0) {
            this.#dropZoneElmt.showNoItems();
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

            if (this.#getGroupListReqID != null) {
                this.#internalAPIRequester.abort(this.#getGroupListReqID);
                this.#getGroupListReqID = null;
            }
            this.#getGroupListReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.campaign_scopes.list_groups`, {id: this.#campaignScope.id}),
                (data) => {
                    this.#dropZoneElmt.clear();
                    for (let row of data.groups) {
                        let userGroupItemElmt = new UserGroupItem(row.id, row.name, false, signedUser.is_admin ? flaskES6.urlFor(`user_groups.view`, {id: row.id, tab: `campaign_scopes`}) : null, signedUser.is_admin ? this.#userGroupRemoveUserCallback.bind(this, row.id, row.name, row.rel_id, this.#campaignScope.name) : null);
                        this.#dropZoneElmt.addElement(userGroupItemElmt);
                    }

                    this.#userGroupAvailableContainerElmt.innerHTML = "";
                    for (let row of data.available_groups) {
                        let userGroupAvailableItemElmt = new UserGroupItem(row.id, row.name, true);
                        this.#userGroupAvailableContainerElmt.appendChild(userGroupAvailableItemElmt);
                    }

                    this.#refreshCounters();

                    this.#userGroupTabElmt.isLoaded = true;
                },
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        }
    }
}

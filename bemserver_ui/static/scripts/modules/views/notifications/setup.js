import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { EventLevelBadge } from "../../components/eventLevel.js";


export class NotificationSetupView {

    #internalAPIRequester = null;
    #postReqID = null;
    #putReqID = null;
    #deleteReqID = null;

    #messagesElmt = null;

    #configTableElmt = null;
    #configTableBodyElmt = null;
    #addEventCategorySectionElmt = null;
    #addEventCategoryBtnElmt = null;
    #addEventCategoryMenuElmt = null;
    #saveConfigBtnElmt = null;
    #itemsCountElmt = null;

    #config = null;
    #eventCategories = {};
    #availableEventCategoryIds = [];

    #editConfigModalElmt = null;
    #editConfigModal = null;
    #editedNotificationLevelInputElmt = null;
    #editedEventCategoryInputElmt = null;
    #editedEventCategoryLabelElmt = null;

    constructor(notifConfig, eventCategories, availableEventCategories) {
        this.#config = notifConfig;
        this.#eventCategories = eventCategories;
        this.#availableEventCategoryIds = availableEventCategories;

        this.#cacheDOM();
        this.#initEventListeners();

        this.#internalAPIRequester = new InternalAPIRequest();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#configTableElmt = document.getElementById("configTable");
        this.#configTableBodyElmt = this.#configTableElmt.querySelector("tbody");

        this.#addEventCategorySectionElmt = document.getElementById("addEventCategorySection");
        this.#addEventCategoryBtnElmt = document.getElementById("addEventCategoryBtn");
        this.#addEventCategoryMenuElmt = this.#addEventCategoryBtnElmt.parentElement.querySelector("ul.dropdown-menu");
        this.#saveConfigBtnElmt = document.getElementById("saveConfigBtn");
        this.#itemsCountElmt = document.getElementById("itemsCount");

        this.#editConfigModalElmt = document.getElementById("editConfigModal");
        this.#editConfigModal = new bootstrap.Modal(this.#editConfigModalElmt);

        this.#editedNotificationLevelInputElmt = this.#editConfigModalElmt.querySelector("#editedNotificationLevel");
        this.#editedEventCategoryInputElmt = this.#editConfigModalElmt.querySelector("#editedEventCategory");
        this.#editedEventCategoryLabelElmt = this.#editConfigModalElmt.querySelector("#editedEventCategoryLabel");
    }

    #initEventListeners() {
        this.#saveConfigBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            // Save selection in database (post to create or put to update).
            if (this.#postReqID != null) {
                this.#internalAPIRequester.abort(this.#postReqID);
                this.#postReqID = null;
            }
            if (this.#putReqID != null) {
                this.#internalAPIRequester.abort(this.#putReqID);
                this.#putReqID = null;
            }

            let payload = {
                category_id: this.#editedEventCategoryInputElmt.value,
                notification_level: this.#editedNotificationLevelInputElmt.value,
            };

            let eventCategoryConfigData = this.#config[this.#editedEventCategoryInputElmt.value];
            if (eventCategoryConfigData.id == null) {
                // Create (post).
                this.#postReqID = this.#internalAPIRequester.post(
                    flaskES6.urlFor(`api.notifications.setup_create`),
                    payload,
                    (data) => {
                        eventCategoryConfigData.id = data.data.id;
                        eventCategoryConfigData.category_id = data.data.category_id;
                        eventCategoryConfigData.category_name = data.data.category_name;
                        eventCategoryConfigData.user_id = data.data.user_id;
                        eventCategoryConfigData.notification_level = data.data.notification_level;
                        eventCategoryConfigData.etag = data.etag;
                        this.#config[this.#editedEventCategoryInputElmt.value] = eventCategoryConfigData;

                        this.#refreshConf(eventCategoryConfigData.category_id);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                    () => {
                        this.#editConfigModal.hide();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${this.#editedEventCategoryLabelElmt.innerText} notification setup saved!`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
            else {
                // Update (put).
                this.#putReqID = this.#internalAPIRequester.put(
                    flaskES6.urlFor(`api.notifications.setup_update`, {id: eventCategoryConfigData.id}),
                    payload,
                    eventCategoryConfigData.etag,
                    (data) => {
                        eventCategoryConfigData.id = data.data.id;
                        eventCategoryConfigData.category_id = data.data.category_id;
                        eventCategoryConfigData.category_name = data.data.category_name;
                        eventCategoryConfigData.user_id = data.data.user_id;
                        eventCategoryConfigData.notification_level = data.data.notification_level;
                        eventCategoryConfigData.etag = data.etag;
                        this.#config[this.#editedEventCategoryInputElmt.value] = eventCategoryConfigData;

                        this.#refreshConf(eventCategoryConfigData.category_id);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                    () => {
                        this.#editConfigModal.hide();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${this.#editedEventCategoryLabelElmt.innerText} notification setup saved!`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        });

        this.#editConfigModalElmt.addEventListener("show.bs.modal", (event) => {
            // event.relatedTarget is the button that triggered the modal
            let eventCategoryId = event.relatedTarget.getAttribute("data-event-category");

            let eventCategoryConfig = this.#config[eventCategoryId];

            this.#editedEventCategoryLabelElmt.innerText = eventCategoryConfig.category_name;
            this.#editedNotificationLevelInputElmt.value = eventCategoryConfig.notification_level;
            this.#editedEventCategoryInputElmt.value = eventCategoryId;
        });
    }

    #refreshConf(eventCategoryId) {
        let idSuffix = `${eventCategoryId}`;
        let levelBadgeElmt = document.getElementById(`levelBadge-${idSuffix}`);
        let notSavedElmt = document.getElementById(`notSaved-${idSuffix}`);
        let btnDeleteConfigElmt = document.getElementById(`btnDelConfig-${idSuffix}`);

        let confData = this.#config[eventCategoryId];

        levelBadgeElmt.setAttribute("level", confData.notification_level.toString().toUpperCase());

        if (confData.id != null) {
            btnDeleteConfigElmt.classList.remove("d-none");
            notSavedElmt?.classList.add("d-none");
        }
        else {
            btnDeleteConfigElmt.classList.add("d-none");
            notSavedElmt?.classList.remove("d-none");
        }
    }

    #addEventCategoryFromConfig(eventCategoryConfigData) {
        let idSuffix = `${eventCategoryConfigData.category_id}`;

        let rowElmt = document.createElement("tr");
        rowElmt.classList.add("align-middle");

        let thElmt = document.createElement("th");
        thElmt.classList.add("text-center", "text-break");
        thElmt.setAttribute("scope", "row");
        thElmt.innerText = eventCategoryConfigData.category_name;
        rowElmt.appendChild(thElmt);

        let tdElmt = document.createElement("td");
        rowElmt.appendChild(tdElmt);

        let tdContainerElmt = document.createElement("div");
        tdContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-center", "gap-2", "p-2");
        tdElmt.appendChild(tdContainerElmt);

        let tdInfoContainerElmt = document.createElement("div");
        tdInfoContainerElmt.classList.add("d-flex", "flex-wrap", "align-items-center", "gap-2");
        tdContainerElmt.appendChild(tdInfoContainerElmt);

        let levelBadgeElmt = new EventLevelBadge();
        levelBadgeElmt.id = `levelBadge-${idSuffix}`;
        levelBadgeElmt.setAttribute("level", eventCategoryConfigData.notification_level.toString().toUpperCase());
        tdInfoContainerElmt.appendChild(levelBadgeElmt);

        if (eventCategoryConfigData.id == null) {
            let notSavedElmt = document.createElement("small");
            notSavedElmt.classList.add("fst-italic", "text-nowrap");
            notSavedElmt.id = `notSaved-${idSuffix}`;
            notSavedElmt.innerText = "(* not saved yet)";
            tdInfoContainerElmt.appendChild(notSavedElmt);
        }

        let editContainerElmt = document.createElement("div");
        editContainerElmt.classList.add("d-flex", "gap-2");
        tdContainerElmt.appendChild(editContainerElmt);

        let btnModalElmt = document.createElement("button");
        btnModalElmt.classList.add("btn", "btn-sm", "btn-outline-secondary");
        btnModalElmt.setAttribute("data-bs-toggle", "modal");
        btnModalElmt.setAttribute("data-bs-target", "#editConfigModal");
        btnModalElmt.setAttribute("data-event-category", eventCategoryConfigData.category_id);
        editContainerElmt.appendChild(btnModalElmt);

        let editIconElmt = document.createElement("i");
        editIconElmt.classList.add("bi", "bi-pencil");
        btnModalElmt.appendChild(editIconElmt);

        let btnDeleteElmt = document.createElement("button");
        btnDeleteElmt.classList.add("btn", "btn-sm", "btn-outline-danger");
        btnDeleteElmt.id = `btnDelConfig-${idSuffix}`;
        editContainerElmt.appendChild(btnDeleteElmt);

        let delIconElmt = document.createElement("i");
        delIconElmt.classList.add("bi", "bi-trash");
        btnDeleteElmt.appendChild(delIconElmt);

        let restoreEventCatMenuItemCallback = () => {
            rowElmt.remove();
            delete this.#config[eventCategoryConfigData.category_id];
            this.#availableEventCategoryIds.push(eventCategoryConfigData.category_id);
            this.#addEventCatMenuItemElmt(eventCategoryConfigData.category_id);
            this.#updateAddEventCategorySectionState();
        };

        // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
        let modalConfirm = new ModalConfirm(eventCategoryConfigData.category_id, `Remove <mark>${eventCategoryConfigData.category_name}</mark> notification setup`, () => {
            if (this.#deleteReqID != null) {
                this.#internalAPIRequester.abort(this.#deleteReqID);
                this.#deleteReqID = null;
            }

            // let energyConsTs = this.#getEnergyConsTs(energySourceConfigData.energy_source_id, configData.energy_use_id);
            this.#deleteReqID = this.#internalAPIRequester.delete(
                flaskES6.urlFor(`api.notifications.setup_delete`, {id: eventCategoryConfigData.id}),
                eventCategoryConfigData.etag,
                restoreEventCatMenuItemCallback,
                (error) => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
                () => {
                    let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `${eventCategoryConfigData.category_name} notification setup removed!`, isDismissible: true});
                    this.#messagesElmt.appendChild(flashMsgElmt);
                },
            );
        });
        editContainerElmt.appendChild(modalConfirm);

        // Add an event listener to display a confirm message on delete button click.
        btnDeleteElmt.addEventListener("click", (event) => {
            event.preventDefault();
            if (eventCategoryConfigData.id != null) {
                // Display modal.
                modalConfirm.show();
            }
            else {
                restoreEventCatMenuItemCallback();
            }
        });

        this.#configTableBodyElmt.appendChild(rowElmt);

        let totalCount = Object.keys(this.#config).length;
        this.#itemsCountElmt.update({firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount, totalCount: totalCount});
    }

    #addEventCatMenuItemElmt(eventCategoryId) {
        let menuItemLinkElmt = document.createElement("a");
        menuItemLinkElmt.classList.add("dropdown-item");
        menuItemLinkElmt.setAttribute("role", "button");
        menuItemLinkElmt.innerText = this.#eventCategories[eventCategoryId];

        let menuItemElmt = document.createElement("li");
        menuItemElmt.appendChild(menuItemLinkElmt);

        this.#addEventCategoryMenuElmt.appendChild(menuItemElmt);

        menuItemLinkElmt.addEventListener("click", (event) => {
            menuItemElmt.remove();
            this.#availableEventCategoryIds = this.#availableEventCategoryIds.filter((availableEventCategoryId) => availableEventCategoryId != eventCategoryId);

            this.#config[eventCategoryId] = {
                category_id: eventCategoryId,
                category_name: this.#eventCategories[eventCategoryId],
                notification_level: this.#editedNotificationLevelInputElmt.getAttribute("data-default"),
            };

            this.#addEventCategoryFromConfig(this.#config[eventCategoryId]);
            this.#updateAddEventCategorySectionState();
        });
    }

    #updateAddEventCategorySectionState() {
        if (this.#availableEventCategoryIds.length <= 0) {
            this.#addEventCategorySectionElmt.classList.add("d-none");
        }
        else {
            this.#addEventCategorySectionElmt.classList.remove("d-none");
        }
    }

    refresh() {
        this.#configTableBodyElmt.innerHTML = "";

        for (let eventCategoryConfigData of Object.values(this.#config)) {
            this.#addEventCategoryFromConfig(eventCategoryConfigData);
        }

        for (let eventCategoryId of this.#availableEventCategoryIds) {
            this.#addEventCatMenuItemElmt(eventCategoryId);
        };

        this.#updateAddEventCategorySectionState();
    }
}

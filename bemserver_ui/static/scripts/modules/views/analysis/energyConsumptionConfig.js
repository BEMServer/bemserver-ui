import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { ModalConfirm } from "../../components/modalConfirm.js";
import { FlashMessageTypes, FlashMessage } from "../../components/flash.js";
import { TimeseriesSelector } from  "../../components/timeseries/selector.js";


export class EnergyConsumptionConfigView {

    #internalAPIRequester = null;
    #postReqID = null;
    #putReqID = null;
    #deleteReqID = null;

    #messagesElmt = null;

    #configTableElmt = null;
    #configTableBodyElmt = null;
    #configTableFooterElmt = null;
    #addEnergySourceBtnElmt = null;
    #addEnergySourceMenuElmt = null;
    #saveSelectedTimeseriesBtnElmt = null;
    #itemsCountElmt = null;

    #structuralElement = {};
    #config = null;
    #energySources = {};
    #energyUses = {};
    #availableEnergySources = [];
    #tsSelector = null;
    #isEditable = false;

    #selectTimeseriesModalElmt = null;
    #selectTimeseriesModal = null;
    #editedEnergySourceInputElmt = null;
    #editedEnergyUseInputElmt = null;
    #editedEnergySourceNameElmt = null;
    #editedEnergyUseNameElmt = null;
    #editedWhFactorInputElmt = null;

    constructor(structuralElement, enerConsConfig, energySources, energyUses, availableEnergySources, isEditable) {
        this.#structuralElement = structuralElement;
        this.#config = enerConsConfig;
        this.#energySources = energySources;
        this.#energyUses = energyUses;
        this.#availableEnergySources = availableEnergySources;
        this.#isEditable = isEditable;

        if (this.#isEditable) {
            this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorConfig");
        }

        this.#cacheDOM();
        this.#initEventListeners();

        this.#internalAPIRequester = new InternalAPIRequest();
    }

    #cacheDOM() {
        this.#messagesElmt = document.getElementById("messages");

        this.#configTableElmt = document.getElementById("configTable");
        this.#configTableBodyElmt = this.#configTableElmt.querySelector("tbody");
        this.#configTableFooterElmt = this.#configTableElmt.querySelector("tfoot");
        this.#itemsCountElmt = document.getElementById("itemsCount");

        if (this.#isEditable) {
            this.#addEnergySourceBtnElmt = document.getElementById("addEnergySourceBtn");
            this.#addEnergySourceMenuElmt = this.#addEnergySourceBtnElmt?.parentElement.querySelector("ul.dropdown-menu");
            this.#saveSelectedTimeseriesBtnElmt = document.getElementById("saveSelectedTimeseriesBtn");

            this.#selectTimeseriesModalElmt = document.getElementById("selectTimeseries");
            this.#selectTimeseriesModal = new bootstrap.Modal(this.#selectTimeseriesModalElmt);

            this.#editedEnergySourceInputElmt = this.#selectTimeseriesModalElmt.querySelector("#editedEnergySource");
            this.#editedEnergyUseInputElmt = this.#selectTimeseriesModalElmt.querySelector("#editedEnergyUse");
            this.#editedEnergySourceNameElmt = this.#selectTimeseriesModalElmt.querySelector("#editedEnergySourceName");
            this.#editedEnergyUseNameElmt = this.#selectTimeseriesModalElmt.querySelector("#editedEnergyUseName");

            this.#editedWhFactorInputElmt = document.getElementById("editedWhFactor");
        }
    }

    #initEventListeners() {
        this.#tsSelector?.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateSaveBtnState();
        });

        this.#saveSelectedTimeseriesBtnElmt?.addEventListener("click", (event) => {
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
                structural_element_type: this.#structuralElement.type,
                structural_element_id: this.#structuralElement.id,
                energy_source_id: this.#editedEnergySourceInputElmt.value,
                energy_use_id: this.#editedEnergyUseInputElmt.value,
                timeseries_id: this.#tsSelector.selectedItemIds[0],
                wh_factor: this.#editedWhFactorInputElmt.value,
            };

            let energyConsTs = this.#getEnergyConsTs(this.#editedEnergySourceInputElmt.value, this.#editedEnergyUseInputElmt.value);
            if (energyConsTs.id == null) {
                // Create (post).
                this.#postReqID = this.#internalAPIRequester.post(
                    flaskES6.urlFor(`api.energy_consumption.create`),
                    payload,
                    (data) => {
                        let confData = this.#config[this.#editedEnergySourceInputElmt.value].energy_uses[this.#editedEnergyUseInputElmt.value];
                        confData.id = data.data.id;
                        confData.ts_id = data.data.timeseries_id;
                        confData.ts_name = data.data.ts_name;
                        confData.ts_unit = data.data.ts_unit;
                        confData.wh_factor = data.data.wh_conversion_factor;
                        confData.etag = data.etag;
                        this.#config[this.#editedEnergySourceInputElmt.value].energy_uses[this.#editedEnergyUseInputElmt.value] = confData;

                        this.#refreshConf(this.#editedEnergySourceInputElmt.value, this.#editedEnergyUseInputElmt.value);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                    () => {
                        this.#selectTimeseriesModal.hide();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `[${this.#editedEnergySourceNameElmt.innerText} - ${this.#editedEnergyUseNameElmt.innerText}] energy consumption configuration saved!`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
            else {
                // Update (put).
                this.#putReqID = this.#internalAPIRequester.put(
                    flaskES6.urlFor(`api.energy_consumption.update`, {id: energyConsTs.id}),
                    payload,
                    energyConsTs.etag,
                    (data) => {
                        let confData = this.#config[this.#editedEnergySourceInputElmt.value].energy_uses[this.#editedEnergyUseInputElmt.value];
                        confData.ts_id = data.data.timeseries_id;
                        confData.ts_name = data.data.ts_name;
                        confData.ts_unit = data.data.ts_unit;
                        confData.wh_factor = data.data.wh_conversion_factor;
                        confData.etag = data.etag;
                        this.#config[this.#editedEnergySourceInputElmt.value].energy_uses[this.#editedEnergyUseInputElmt.value] = confData;

                        this.#refreshConf(this.#editedEnergySourceInputElmt.value, this.#editedEnergyUseInputElmt.value);
                    },
                    (error) => {
                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                    () => {
                        this.#selectTimeseriesModal.hide();

                        let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `[${this.#editedEnergySourceNameElmt.innerText} - ${this.#editedEnergyUseNameElmt.innerText}] energy consumption configuration saved!`, isDismissible: true});
                        this.#messagesElmt.appendChild(flashMsgElmt);
                    },
                );
            }
        });

        this.#selectTimeseriesModalElmt?.addEventListener("show.bs.modal", (event) => {
            this.#tsSelector.clearAllSelection();

            // event.relatedTarget is the button that triggered the modal
            let energySourceId = event.relatedTarget.getAttribute("data-energy-source");
            let energyUseId = event.relatedTarget.getAttribute("data-energy-use");

            let energyConsTs = this.#getEnergyConsTs(energySourceId, energyUseId);

            this.#editedEnergySourceNameElmt.innerText = this.#energySources[energySourceId];
            this.#editedEnergyUseNameElmt.innerText = this.#energyUses[energyUseId];
            this.#editedEnergySourceInputElmt.value = energySourceId;
            this.#editedEnergyUseInputElmt.value = energyUseId;
            this.#editedWhFactorInputElmt.value = energyConsTs.wh_factor;

            if (energyConsTs.ts_id != null) {
                this.#tsSelector.select(energyConsTs.ts_id, () => { this.#updateSaveBtnState(); });
            }
            else {
                this.#updateSaveBtnState();
            }
        });
    }

    #updateSaveBtnState() {
        if (this.#tsSelector.selectedItemNames.length > 0) {
            this.#saveSelectedTimeseriesBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#saveSelectedTimeseriesBtnElmt.setAttribute("disabled", true);
        }
    }

    #refreshConf(energySourceId, energyUseId) {
        let idSuffix = `${energySourceId}-${energyUseId}`;
        let spanTsElmt = document.getElementById(`tsSpan-${idSuffix}`);
        let spanWhFactorElmt = document.getElementById(`whFactorSpan-${idSuffix}`);

        let confData = this.#getEnergyConsTs(energySourceId, energyUseId);
        spanTsElmt.innerText = `[${confData.ts_id ? confData.ts_name : "none"}]`;
        spanWhFactorElmt.innerText = `x${confData.wh_factor}`;

        let tsConfigTdElmt = document.getElementById(`tsConfigCell-${idSuffix}`);
        let btnDeleteConfigElmt = document.getElementById(`btnDelConfig-${idSuffix}`);
        if (confData.id == null) {
            tsConfigTdElmt.classList.add("table-warning");
            spanWhFactorElmt.classList.add("d-none");
            btnDeleteConfigElmt.classList.add("d-none");
        }
        else {
            tsConfigTdElmt.classList.remove("table-warning");
            spanWhFactorElmt.classList.remove("d-none");
            btnDeleteConfigElmt.classList.remove("d-none");
        }
    }

    #getEnergyConsTs(energySourceId, energyUseId) {
        return this.#config[energySourceId].energy_uses[energyUseId];
    }

    #addEnergySourceFromConfig(energySourceConfigData) {
        let rowElmt = document.createElement("tr");
        rowElmt.classList.add("align-middle");

        let thElmt = document.createElement("th");
        thElmt.classList.add("text-center", "text-break");
        thElmt.setAttribute("scope", "row");
        thElmt.innerText = energySourceConfigData.energy_source_name;
        rowElmt.appendChild(thElmt);

        for (let energyUseId of Object.keys(this.#energyUses)) {
            let configData = energySourceConfigData.energy_uses[energyUseId];
            let idSuffix = `${energySourceConfigData.energy_source_id}-${energyUseId}`;

            let tsConfigTdElmt = document.createElement("td");
            tsConfigTdElmt.id = `tsConfigCell-${idSuffix}`;

            let tdContainerElmt = document.createElement("div");
            tdContainerElmt.classList.add("d-flex", "justify-content-between", "align-items-center", "gap-2", "p-2");

            let tdSpanContainerElmt = document.createElement("div");
            tdSpanContainerElmt.classList.add("d-flex", "flex-wrap", "align-items-center", "gap-2");

            let spanTsElmt = document.createElement("span");
            spanTsElmt.classList.add("text-break");
            spanTsElmt.id = `tsSpan-${idSuffix}`;
            spanTsElmt.innerText = `[${configData.ts_id ? configData.ts_name : "none"}]`;

            let spanWhFactorElmt = document.createElement("span");
            spanWhFactorElmt.id = `whFactorSpan-${idSuffix}`;
            spanWhFactorElmt.innerText = `x${configData.wh_factor}`;

            if (configData.id == null) {
                tsConfigTdElmt.classList.add("table-warning");
                spanWhFactorElmt.classList.add("d-none");
            }

            tdSpanContainerElmt.appendChild(spanTsElmt);
            tdSpanContainerElmt.appendChild(spanWhFactorElmt);

            tdContainerElmt.appendChild(tdSpanContainerElmt);

            if (this.#isEditable) {
                let editContainerElmt = document.createElement("div");
                editContainerElmt.classList.add("d-grid", "gap-1");

                let btnModalTimeseriesSelectorElmt = document.createElement("button");
                btnModalTimeseriesSelectorElmt.classList.add("btn", "btn-sm", "btn-outline-secondary");
                btnModalTimeseriesSelectorElmt.setAttribute("data-bs-toggle", "modal");
                btnModalTimeseriesSelectorElmt.setAttribute("data-bs-target", "#selectTimeseries");
                btnModalTimeseriesSelectorElmt.setAttribute("data-energy-source", energySourceConfigData.energy_source_id);
                btnModalTimeseriesSelectorElmt.setAttribute("data-energy-use", configData.energy_use_id);

                let editIconElmt = document.createElement("i");
                editIconElmt.classList.add("bi", "bi-pencil");

                btnModalTimeseriesSelectorElmt.appendChild(editIconElmt);
                editContainerElmt.appendChild(btnModalTimeseriesSelectorElmt);

                let btnDeleteElmt = document.createElement("button");
                btnDeleteElmt.classList.add("btn", "btn-sm", "btn-outline-danger");
                btnDeleteElmt.id = `btnDelConfig-${idSuffix}`;

                let delIconElmt = document.createElement("i");
                delIconElmt.classList.add("bi", "bi-trash");
                btnDeleteElmt.appendChild(delIconElmt);

                if (configData.id == null) {
                    btnDeleteElmt.classList.add("d-none");
                }

                // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
                let modalConfirm = new ModalConfirm(tsConfigTdElmt.id, `Remove <mark>${energySourceConfigData.energy_source_name} - ${configData.energy_use_name}</mark> energy consumption configuration`, () => {
                    if (this.#deleteReqID != null) {
                        this.#internalAPIRequester.abort(this.#deleteReqID);
                        this.#deleteReqID = null;
                    }

                    let energyConsTs = this.#getEnergyConsTs(energySourceConfigData.energy_source_id, configData.energy_use_id);
                    this.#deleteReqID = this.#internalAPIRequester.delete(
                        flaskES6.urlFor(`api.energy_consumption.delete`, {id: energyConsTs.id, structural_element_type: this.#structuralElement.type}),
                        energyConsTs.etag,
                        () => {
                            let confData = this.#config[energySourceConfigData.energy_source_id].energy_uses[configData.energy_use_id];
                            confData.id = null;
                            confData.ts_id = null;
                            confData.ts_name = null;
                            confData.ts_unit = null;
                            confData.wh_factor = 1;
                            confData.etag = null;
                            this.#config[energySourceConfigData.energy_source_id].energy_uses[configData.energy_use_id] = confData;

                            this.#refreshConf(energySourceConfigData.energy_source_id, configData.energy_use_id);

                            btnDeleteElmt.classList.add("d-none");
                        },
                        (error) => {
                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.ERROR, text: error.toString(), isDismissible: true});
                            this.#messagesElmt.appendChild(flashMsgElmt);
                        },
                        () => {
                            let flashMsgElmt = new FlashMessage({type: FlashMessageTypes.SUCCESS, text: `[${energySourceConfigData.energy_source_name} - ${configData.energy_use_name}] energy consumption configuration removed!`, isDismissible: true});
                            this.#messagesElmt.appendChild(flashMsgElmt);
                        },
                    );
                });
                editContainerElmt.appendChild(modalConfirm);

                // Add an event listener to display a confirm message on delete button click.
                btnDeleteElmt.addEventListener("click", (event) => {
                    event.preventDefault();
                    // Display modal.
                    modalConfirm.show();
                });

                editContainerElmt.appendChild(btnDeleteElmt);
                tdContainerElmt.appendChild(editContainerElmt);
            }

            tsConfigTdElmt.appendChild(tdContainerElmt);
            rowElmt.appendChild(tsConfigTdElmt);
        }

        this.#configTableBodyElmt.appendChild(rowElmt);

        let totalCount = Object.keys(this.#config).length;
        this.#itemsCountElmt.update({firstItem: 1, lastItem: totalCount, totalCount: totalCount});
    }

    refresh() {
        this.#configTableBodyElmt.innerHTML = "";

        for (let energySourceConfigData of Object.values(this.#config)) {
            this.#addEnergySourceFromConfig(energySourceConfigData);
        }

        if (this.#isEditable) {
            for (let energySourceId of this.#availableEnergySources) {
                let menuItemLinkElmt = document.createElement("a");
                menuItemLinkElmt.classList.add("dropdown-item");
                menuItemLinkElmt.setAttribute("role", "button");
                menuItemLinkElmt.innerText = this.#energySources[energySourceId];

                let menuItemElmt = document.createElement("li");
                menuItemElmt.appendChild(menuItemLinkElmt);

                this.#addEnergySourceMenuElmt.appendChild(menuItemElmt);

                menuItemLinkElmt.addEventListener("click", (event) => {
                    menuItemElmt.remove();
                    this.#availableEnergySources = this.#availableEnergySources.filter((availableEnergySource) => availableEnergySource.id != energySourceId);

                    let energyUsesConfigData = {};
                    for (let [energyUseId, energyUseName] of Object.entries(this.#energyUses)) {
                        energyUsesConfigData[energyUseId] = {
                            energy_use_id: energyUseId,
                            energy_use_name: energyUseName,
                            id: null,
                            ts_id: null,
                            ts_name: null,
                            ts_unit: null,
                            wh_factor: 1,
                            etag: null,
                        };
                    }

                    this.#config[energySourceId] = {
                        energy_source_id: energySourceId,
                        energy_source_name: this.#energySources[energySourceId],
                        energy_uses: energyUsesConfigData,
                    };

                    this.#addEnergySourceFromConfig(this.#config[energySourceId]);

                    if (this.#availableEnergySources.length <= 0) {
                        this.#configTableFooterElmt.classList.add("d-none");
                    }
                });
            };

            if (this.#availableEnergySources.length <= 0) {
                this.#configTableFooterElmt.classList.add("d-none");
            }
        }
        else {
            this.#configTableFooterElmt?.classList.add("d-none");
        }
    }
}

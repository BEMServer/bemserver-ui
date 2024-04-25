import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { ModalConfirm } from "/static/scripts/modules/components/modalConfirm.js";
import { TimeseriesSelector } from  "/static/scripts/modules/components/timeseries/selector.js";
import "/static/scripts/modules/components/tree.js";
import "/static/scripts/modules/components/itemsCount.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";


export class TimeseriesSemanticSetupView {

    #internalAPIRequester = null;
    #sitesTreeReqID = null;
    #weatherSetupGetReqID = null;
    #forecastWeatherSetupGetReqID = null;
    #energyProdSetupGetReqID = null;
    #energyConsSetupGetReqID = null;
    #postReqIDByTab = {};
    #putReqIDByTab = {};
    #deleteReqIDByTab = {};

    #sitesTreeElmt = null;
    #weatherTabElmt = null;
    #forecastWeatherTabElmt = null;
    #energyProdTabElmt = null;
    #energyConsTabElmt = null;

    #weatherSetupHelpElmt = null;
    #weatherSetupTableElmt = null;
    #weatherSetupItemsCountElmt = null;
    #weatherAddParamBtnElmt = null;
    #weatherAddParamMenuElmt = null;

    #forecastWeatherSetupHelpElmt = null;
    #forecastWeatherSetupTableElmt = null;
    #forecastWeatherSetupItemsCountElmt = null;
    #forecastWeatherAddParamBtnElmt = null;
    #forecastWeatherAddParamMenuElmt = null;

    #energyProdSetupHelpElmt = null;
    #energyProdSetupTableElmt = null;
    #energyProdSetupItemsCountElmt = null;
    #energyProdAddEnergyBtnElmt = null;
    #energyProdAddEnergyMenuElmt = null;

    #energyConsSetupHelpElmt = null;
    #energyConsSetupTableElmt = null;
    #energyConsSetupItemsCountElmt = null;
    #energyConsAddEnergyBtnElmt = null;
    #energyConsAddEnergyMenuElmt = null;

    #selectTimeseriesTargetTextElmt = null;
    #selectedTimeseriesSaveBtnElmt = null;
    #selectTimeseriesModalElmt = null;
    #selectTimeseriesModal = null;

    #tsSelector = null;
    #isEditable = false;
    #energies = {};
    #energyEndUses = {};
    #weatherParams = {};
    #energyProdTechs = {};

    #structuralElementType = null;
    #structuralElementId = null;
    // Weather setup (parameter <-> timeseries) by weather parameter.
    #weatherSetupByParam = {};
    // Forecast weather setup (parameter <-> timeseries) by weather parameter.
    #forecastWeatherSetupByParam = {};
    // Energy production setup by energy and production techno (energy <-> prod techno <-> timeseries).
    #energyProdSetupByEnergyAndTech = {};
    // Energy consumption setup by energy and energy use (energy <-> energy use <-> timeseries).
    #energyConsSetupByEnergyAndUses = {};

    #selectedTab = null;
    #weatherParamEdited = null;
    #forecastWeatherParamEdited = null;
    #energyEdited = null;
    #endUseEdited = null;
    #prodTechEdited = null;

    constructor(energies, energyEndUses, weatherParams, energyProdTechs, isEditable) {
        this.#energies = energies;
        this.#energyEndUses = energyEndUses;
        this.#weatherParams = weatherParams;
        this.#energyProdTechs = energyProdTechs;
        this.#isEditable = isEditable;

        if (this.#isEditable) {
            this.#tsSelector = TimeseriesSelector.getInstance("tsSelector");
        }

        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();

        // Which tab is currently selected?
        this.#selectedTab = document.querySelector(`button.nav-link.active`);
    }

    #cacheDOM() {
        this.#sitesTreeElmt = document.getElementById("sitesTree");
        this.#weatherTabElmt = document.getElementById("weather-tab");
        this.#forecastWeatherTabElmt = document.getElementById("weatherForecast-tab");
        this.#energyProdTabElmt = document.getElementById("energyProd-tab");
        this.#energyConsTabElmt = document.getElementById("energyCons-tab");

        this.#weatherSetupHelpElmt = document.getElementById("weatherSetupHelp");
        this.#weatherSetupTableElmt = document.getElementById("weatherSetupTable");
        this.#weatherSetupItemsCountElmt = document.getElementById("weatherItemsCount");
        this.#weatherAddParamBtnElmt = document.getElementById("weatherAddParamBtn");
        this.#weatherAddParamMenuElmt = this.#weatherAddParamBtnElmt?.parentElement.querySelector("ul.dropdown-menu");

        this.#forecastWeatherSetupHelpElmt = document.getElementById("weatherForecastSetupHelp");
        this.#forecastWeatherSetupTableElmt = document.getElementById("weatherForecastSetupTable");
        this.#forecastWeatherSetupItemsCountElmt = document.getElementById("weatherForecastItemsCount");
        this.#forecastWeatherAddParamBtnElmt = document.getElementById("weatherForecastAddParamBtn");
        this.#forecastWeatherAddParamMenuElmt = this.#forecastWeatherAddParamBtnElmt?.parentElement.querySelector("ul.dropdown-menu");

        this.#energyProdSetupHelpElmt = document.getElementById("energyProdSetupHelp");
        this.#energyProdSetupTableElmt = document.getElementById("energyProdSetupTable");
        this.#energyProdSetupItemsCountElmt = document.getElementById("energyProdItemsCount");
        this.#energyProdAddEnergyBtnElmt = document.getElementById("energyProdAddEnergyBtn");
        this.#energyProdAddEnergyMenuElmt = this.#energyProdAddEnergyBtnElmt?.parentElement.querySelector("ul.dropdown-menu");

        this.#energyConsSetupHelpElmt = document.getElementById("energyConsSetupHelp");
        this.#energyConsSetupTableElmt = document.getElementById("energyConsSetupTable");
        this.#energyConsSetupItemsCountElmt = document.getElementById("energyConsItemsCount");
        this.#energyConsAddEnergyBtnElmt = document.getElementById("energyConsAddEnergyBtn");
        this.#energyConsAddEnergyMenuElmt = this.#energyConsAddEnergyBtnElmt?.parentElement.querySelector("ul.dropdown-menu");

        if (this.#isEditable) {
            this.#selectTimeseriesTargetTextElmt = document.getElementById("selectTimeseriesTargetText");
            this.#selectedTimeseriesSaveBtnElmt = document.getElementById("selectedTimeseriesSaveBtn");

            this.#selectTimeseriesModalElmt = document.getElementById("selectTimeseries");
            this.#selectTimeseriesModal = new bootstrap.Modal(this.#selectTimeseriesModalElmt);
        }
    }

    #initEventListeners() {
        this.#sitesTreeElmt.addEventListener("treeNodeSelect", (event) => {
            this.#structuralElementType = event.detail.type;
            this.#structuralElementId = event.detail.id;

            let filters = {};
            filters[this.#structuralElementType] = this.#structuralElementId;
            this.#tsSelector.setFilters(filters);
            this.#tsSelector.clearAllSelection();

            this.#loadWeatherParametersSetup();
            this.#loadForecastWeatherParametersSetup();
            this.#loadEnergyProductionSetup();
            this.#loadEnergyConsumptionSetup();
        });

        this.#weatherTabElmt.addEventListener("show.bs.tab", () => {
            this.#selectedTab = this.#weatherTabElmt;
        });

        this.#forecastWeatherTabElmt.addEventListener("show.bs.tab", () => {
            this.#selectedTab = this.#forecastWeatherTabElmt;
        });

        this.#energyProdTabElmt.addEventListener("show.bs.tab", () => {
            this.#selectedTab = this.#energyProdTabElmt;
        });

        this.#energyConsTabElmt.addEventListener("show.bs.tab", () => {
            this.#selectedTab = this.#energyConsTabElmt;
        });

        this.#tsSelector?.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateSaveBtnState();
        });

        this.#selectedTimeseriesSaveBtnElmt?.addEventListener("click", (event) => {
            event.preventDefault();

            this.#saveSelectedTimeseries();
        });

        this.#selectTimeseriesModalElmt?.addEventListener("hide.bs.modal", () => {
            this.#weatherParamEdited = null;
            this.#forecastWeatherParamEdited = null;
            this.#energyEdited = null;
            this.#prodTechEdited = null;
            this.#endUseEdited = null;
        });
    }

    #internalApiErrorCallback(error) {
        app.flashMessage(error.toString(), "error");
    }

    #updateSaveBtnState() {
        if (this.#tsSelector.selectedItems.length > 0) {
            this.#selectedTimeseriesSaveBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#selectedTimeseriesSaveBtnElmt.setAttribute("disabled", true);
        }
    }

    #saveSelectedTimeseries() {
        if (this.#postReqIDByTab[this.#selectedTab] != null) {
            this.#internalAPIRequester.abort(this.#postReqIDByTab[this.#selectedTab]);
            this.#postReqIDByTab[this.#selectedTab] = null;
        }
        if (this.#putReqIDByTab[this.#selectedTab] != null) {
            this.#internalAPIRequester.abort(this.#putReqIDByTab[this.#selectedTab]);
            this.#putReqIDByTab[this.#selectedTab] = null;
        }

        // Weather parameter tab case.
        if (this.#selectedTab == this.#weatherTabElmt) {
            let updateSetupCallback = (data) => {
                let updatedData = data.data;
                updatedData.etag = data.etag;
                this.#weatherSetupByParam[updatedData.parameter] = updatedData;
                this.#refreshSetup(updatedData.timeseries, `weather-${updatedData.parameter}`);
            };
            let updateSetupDoneCallback = () => {
                let weatherData = this.#weatherSetupByParam[this.#weatherParamEdited];
                app.flashMessage(`${weatherData.parameter_label} weather parameter setup saved!`, "success", 5);
                this.#selectTimeseriesModal.hide();
            };

            let payload = {
                parameter: this.#weatherParamEdited,
                site_id: this.#structuralElementId,
                timeseries_id: this.#tsSelector.selectedItems[0].id,
                forecast: false,
            };

            let weatherData = this.#weatherSetupByParam[this.#weatherParamEdited];
            if (weatherData.id == null) {
                // Create setup (post call).
                this.#postReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.post(
                    app.urlFor(`api.semantics.weather.create`),
                    payload,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else if (weatherData.timeseries_id != this.#tsSelector.selectedItems[0].id) {
                // Update setup (put call).
                this.#putReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.put(
                    app.urlFor(`api.semantics.weather.update`, {id: weatherData.id}),
                    payload,
                    weatherData.etag,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else {
                // Nothing to do but just hide timeseries selection modal.
                this.#selectTimeseriesModal.hide();
            }
        }
        // Forecast weather parameter tab case.
        if (this.#selectedTab == this.#forecastWeatherTabElmt) {
            let updateSetupCallback = (data) => {
                let updatedData = data.data;
                updatedData.etag = data.etag;
                this.#forecastWeatherSetupByParam[updatedData.parameter] = updatedData;
                this.#refreshSetup(updatedData.timeseries, `weatherForecast-${updatedData.parameter}`);
            };
            let updateSetupDoneCallback = () => {
                let weatherData = this.#forecastWeatherSetupByParam[this.#forecastWeatherParamEdited];
                app.flashMessage(`${weatherData.parameter_label} weather parameter setup saved!`, "success", 5);
                this.#selectTimeseriesModal.hide();
            };

            let payload = {
                parameter: this.#forecastWeatherParamEdited,
                site_id: this.#structuralElementId,
                timeseries_id: this.#tsSelector.selectedItems[0].id,
                forecast: true,
            };

            let weatherData = this.#forecastWeatherSetupByParam[this.#forecastWeatherParamEdited];
            if (weatherData.id == null) {
                // Create setup (post call).
                this.#postReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.post(
                    app.urlFor(`api.semantics.weather.create`),
                    payload,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else if (weatherData.timeseries_id != this.#tsSelector.selectedItems[0].id) {
                // Update setup (put call).
                this.#putReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.put(
                    app.urlFor(`api.semantics.weather.update`, {id: weatherData.id}),
                    payload,
                    weatherData.etag,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else {
                // Nothing to do but just hide timeseries selection modal.
                this.#selectTimeseriesModal.hide();
            }
        }
        // Energy production tab case.
        else if (this.#selectedTab == this.#energyProdTabElmt) {
            let updateSetupCallback = (data) => {
                let updatedData = data.data;
                updatedData.etag = data.etag;
                this.#energyProdSetupByEnergyAndTech[updatedData.energy_id][updatedData.prod_tech_id] = updatedData;
                this.#refreshSetup(updatedData.timeseries, `energyProd-${updatedData.energy_id}-${updatedData.prod_tech_id}`);
            };
            let updateSetupDoneCallback = () => {
                let energyProdData = this.#energyProdSetupByEnergyAndTech[this.#energyEdited][this.#prodTechEdited];
                let energyName = this.#energies[energyProdData.energy_id];
                let prodTechName = this.#energyProdTechs[energyProdData.prod_tech_id];

                app.flashMessage(`[${energyName} - ${prodTechName}] energy production setup saved!`, "success", 5);

                this.#selectTimeseriesModal.hide();
            };

            let payload = {
                energy_id: this.#energyEdited,
                prod_tech_id: this.#prodTechEdited,
                timeseries_id: this.#tsSelector.selectedItems[0].id,
            };
            payload[`${this.#structuralElementType}_id`] = this.#structuralElementId;

            let energyProdData = this.#energyProdSetupByEnergyAndTech[this.#energyEdited][this.#prodTechEdited];
            if (energyProdData.id == null) {
                // Create setup (post call).
                this.#postReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.post(
                    app.urlFor(`api.semantics.energy.production.create`, {"struct_elmt_type": this.#structuralElementType}),
                    payload,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else if (energyProdData.timeseries_id != this.#tsSelector.selectedItems[0].id) {
                // Update setup (put call).
                this.#putReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.put(
                    app.urlFor(`api.semantics.energy.production.update`, {id: energyProdData.id, "struct_elmt_type": this.#structuralElementType}),
                    payload,
                    energyProdData.etag,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else {
                // Nothing to do but just hide timeseries selection modal.
                this.#selectTimeseriesModal.hide();
            }
        }
        // Energy consumption tab case.
        else if (this.#selectedTab == this.#energyConsTabElmt) {
            let updateSetupCallback = (data) => {
                let updatedData = data.data;
                updatedData.etag = data.etag;
                this.#energyConsSetupByEnergyAndUses[updatedData.energy_id][updatedData.end_use_id] = updatedData;
                this.#refreshSetup(updatedData.timeseries, `energyCons-${updatedData.energy_id}-${updatedData.end_use_id}`);
            };
            let updateSetupDoneCallback = () => {
                let energyConsData = this.#energyConsSetupByEnergyAndUses[this.#energyEdited][this.#endUseEdited];
                let energyName = this.#energies[energyConsData.energy_id];
                let endUseName = this.#energyEndUses[energyConsData.end_use_id];

                app.flashMessage(`[${energyName} - ${endUseName}] energy consumption setup saved!`, "success", 5);

                this.#selectTimeseriesModal.hide();
            };

            let payload = {
                energy_id: this.#energyEdited,
                end_use_id: this.#endUseEdited,
                timeseries_id: this.#tsSelector.selectedItems[0].id,
            };
            payload[`${this.#structuralElementType}_id`] = this.#structuralElementId;

            let energyConsData = this.#energyConsSetupByEnergyAndUses[this.#energyEdited][this.#endUseEdited];
            if (energyConsData.id == null) {
                // Create setup (post call).
                this.#postReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.post(
                    app.urlFor(`api.semantics.energy.consumption.create`, {"struct_elmt_type": this.#structuralElementType}),
                    payload,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else if (energyConsData.timeseries_id != this.#tsSelector.selectedItems[0].id) {
                // Update setup (put call).
                this.#putReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.put(
                    app.urlFor(`api.semantics.energy.consumption.update`, {id: energyConsData.id, "struct_elmt_type": this.#structuralElementType}),
                    payload,
                    energyConsData.etag,
                    updateSetupCallback,
                    this.#internalApiErrorCallback,
                    updateSetupDoneCallback,
                );
            }
            else {
                // Nothing to do but just hide timeseries selection modal.
                this.#selectTimeseriesModal.hide();
            }
        }
    }

    #refreshSetup(timeseries, suffixId) {
        let btnEditElmt = document.getElementById(`btnEditSetup-${suffixId}`);
        let tsTdElmt = document.getElementById(`tsSetupCell-${suffixId}`);
        let btnDeleteElmt = document.getElementById(`btnDelSetup-${suffixId}`);

        if (timeseries == null) {
            btnEditElmt.classList.remove("btn-link", "link-secondary", "text-decoration-none");
            btnEditElmt.classList.add("btn-ouline-secondary", "fst-italic");
            btnEditElmt.innerText = "Select a timeseries";
            btnEditElmt.title = btnEditElmt.innerText;
            tsTdElmt.classList.add("table-warning");
            btnDeleteElmt.classList.add("d-none", "invisible");
        }
        else {
            btnEditElmt.classList.remove("btn-ouline-secondary", "fst-italic");
            btnEditElmt.classList.add("btn-link", "link-secondary", "text-decoration-none");
            btnEditElmt.innerText = `${timeseries.name}${timeseries.unit_symbol ? ` [${timeseries.unit_symbol}]` : ""}`;
            btnEditElmt.title = "Edit selection";
            tsTdElmt.classList.remove("table-warning");
            btnDeleteElmt.classList.remove("d-none", "invisible");
        }
    }

    #loadSitesTreeData() {
        this.#sitesTreeElmt.showLoading();

        if (this.#sitesTreeReqID != null) {
            this.#internalAPIRequester.abort(this.#sitesTreeReqID);
            this.#sitesTreeReqID = null;
        }

        this.#sitesTreeReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.structural_elements.retrieve_tree_sites`, {types: ["site", "building"]}),
            (data) => {
                this.#sitesTreeElmt.load(data.data);
                this.#sitesTreeElmt.collapseAll();
            },
            this.#internalApiErrorCallback,
        );
    }

    #createDropDownMenuItemElement(menuItemText, clickCallback) {
        let menuItemLinkElmt = document.createElement("a");
        menuItemLinkElmt.classList.add("dropdown-item");
        menuItemLinkElmt.setAttribute("role", "button");
        menuItemLinkElmt.innerText = menuItemText;

        let menuItemElmt = document.createElement("li");
        menuItemElmt.appendChild(menuItemLinkElmt);

        menuItemLinkElmt.addEventListener("click", () => {
            menuItemElmt.remove();
            clickCallback();
        });

        return menuItemElmt;
    }

    #createRowElement(headerText) {
        let rowElmt = document.createElement("tr");
        rowElmt.classList.add("align-middle");

        let thElmt = document.createElement("th");
        thElmt.classList.add("text-center", "text-break");
        thElmt.setAttribute("scope", "row");
        thElmt.innerText = headerText;
        rowElmt.appendChild(thElmt);

        return rowElmt;
    }

    #createTimeseriesSetupCellElement(suffixId, tsLabel, hasTimeseries, btnModalTsSelectorClickCallback, deleteTextConfirmModal, deleteTimeseriesLinkCallback, prepareDeleteTimeseriesLinkCallback) {
        let tdElmt = document.createElement("td");
        tdElmt.id = `tsSetupCell-${suffixId}`;
        if (!hasTimeseries) {
            tdElmt.classList.add("table-warning");
        }

        if (this.#isEditable) {
            let editContainerElmt = document.createElement("div");
            editContainerElmt.classList.add("d-flex", "justify-content-between", "gap-1", "me-1");

            let btnModalTimeseriesSelectorElmt = document.createElement("button");
            btnModalTimeseriesSelectorElmt.id = `btnEditSetup-${suffixId}`;
            btnModalTimeseriesSelectorElmt.classList.add("btn", "btn-sm", "btn-link", "link-secondary", "text-decoration-none", "text-break", "mx-auto");
            btnModalTimeseriesSelectorElmt.setAttribute("data-bs-toggle", "modal");
            btnModalTimeseriesSelectorElmt.setAttribute("data-bs-target", "#selectTimeseries");
            btnModalTimeseriesSelectorElmt.innerText = tsLabel;
            btnModalTimeseriesSelectorElmt.title = "Edit selection";
            editContainerElmt.appendChild(btnModalTimeseriesSelectorElmt);

            btnModalTimeseriesSelectorElmt.addEventListener("click", btnModalTsSelectorClickCallback);

            let btnDeleteElmt = document.createElement("button");
            btnDeleteElmt.classList.add("btn", "btn-sm", "btn-outline-danger", "my-auto");
            btnDeleteElmt.id = `btnDelSetup-${suffixId}`;

            let delIconElmt = document.createElement("i");
            delIconElmt.classList.add("bi", "bi-trash");
            btnDeleteElmt.appendChild(delIconElmt);

            if (!hasTimeseries) {
                btnModalTimeseriesSelectorElmt.classList.remove("btn-link", "link-secondary", "text-decoration-none");
                btnModalTimeseriesSelectorElmt.classList.add("btn-ouline-secondary", "fst-italic");
                btnModalTimeseriesSelectorElmt.innerText = "Select a timeseries";
                btnModalTimeseriesSelectorElmt.title = btnModalTimeseriesSelectorElmt.innerText;
                btnDeleteElmt.classList.add("d-none", "invisible");
            }

            // Add a modal confirm component for this item, defining an "ok" callback function to remove it.
            let modalConfirm = new ModalConfirm(
                tdElmt.id,
                deleteTextConfirmModal,
                () => {
                    if (this.#deleteReqIDByTab[this.#selectedTab] != null) {
                        this.#internalAPIRequester.abort(this.#deleteReqIDByTab[this.#selectedTab]);
                        this.#deleteReqIDByTab[this.#selectedTab] = null;
                    }

                    deleteTimeseriesLinkCallback();
                },
            );
            tdElmt.appendChild(modalConfirm);

            // Add an event listener to display a confirm message on delete button click.
            btnDeleteElmt.addEventListener("click", (event) => {
                event.preventDefault();

                prepareDeleteTimeseriesLinkCallback();

                // Display action confirmation modal.
                modalConfirm.show();
            });

            editContainerElmt.appendChild(btnDeleteElmt);
            tdElmt.appendChild(editContainerElmt);
        }
        else {
            if (data.timeseries_id == null) {
                tdElmt.classList.add("fst-italic");
            }
            tdElmt.innerText = tsLabel;
        }

        return tdElmt;
    }

    #createWeatherParamRowElement(data) {
        let rowElmt = this.#createRowElement(data.parameter_label);

        let suffixId = `weather${data.forecast ? "Forecast" : ""}-${data.parameter}`;

        let tdElmt = this.#createTimeseriesSetupCellElement(
            suffixId,
            `${data.timeseries_id != null ? `${data.timeseries.name}${data.timeseries.unit_symbol ? ` [${data.timeseries.unit_symbol}]` : ""}` : "none"}`,
            data.timeseries_id != null,
            () => {
                this.#selectTimeseriesTargetTextElmt.innerText = `${data.parameter_label.toLowerCase()} weather parameter`;
                this.#tsSelector.clearAllSelection();
                this.#updateSaveBtnState();

                // In update case, get resource etag if not known.
                this.#reloadWeatherParameterSetupForEtag(
                    data,
                    () => {
                        // Get up-to-date setup data.
                        let dataToEdit = data.forecast ? this.#forecastWeatherSetupByParam[data.parameter] : this.#weatherSetupByParam[data.parameter];
                        if (dataToEdit.timeseries_id != null) {
                            this.#tsSelector.select(dataToEdit.timeseries_id, () => { this.#updateSaveBtnState(); });
                        }
                    },
                );

                if (!data.forecast) {
                    this.#weatherParamEdited = data.parameter;
                }
                else {
                    this.#forecastWeatherParamEdited = data.parameter;
                }
            },
            `Remove <mark>${data.parameter_label}</mark> weather parameter setup`,
            () => {
                let dataToDelete = data.forecast ? this.#forecastWeatherSetupByParam[data.parameter] : this.#weatherSetupByParam[data.parameter];
                this.#deleteReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.delete(
                    app.urlFor(`api.semantics.weather.delete`, {id: dataToDelete.id}),
                    dataToDelete.etag,
                    () => {
                        dataToDelete.id = null;
                        dataToDelete.timeseries_id = null;
                        dataToDelete.timeseries = null;
                        dataToDelete.etag = null;
                        if (!dataToDelete.forecast) {
                            this.#weatherSetupByParam[dataToDelete.parameter] = dataToDelete;
                        }
                        else {
                            this.#forecastWeatherSetupByParam[dataToDelete.parameter] = dataToDelete;
                        }

                        this.#refreshSetup(dataToDelete.timeseries, suffixId);
                    },
                    this.#internalApiErrorCallback,
                    () => {
                        app.flashMessage(`${dataToDelete.parameter_label} weather parameter setup removed!`, "success", 5);
                    },
                );
            },
            () => {
                // In delete case, get resource etag if not known.
                this.#reloadWeatherParameterSetupForEtag(
                    data,
                    () => {
                        if (!data.forecast) {
                            this.#weatherParamEdited = data.parameter;
                        }
                        else {
                            this.#forecastWeatherParamEdited = data.parameter;
                        }
                    },
                );
            },
        );
        rowElmt.appendChild(tdElmt);

        return rowElmt;
    }

    #reloadWeatherParameterSetupForEtag(weatherTsData, afterEtagLoadedCallback = null) {
        let weatherData = weatherTsData.forecast ? this.#forecastWeatherSetupByParam[weatherTsData.parameter] : this.#weatherSetupByParam[weatherTsData.parameter];
        if (weatherData.id != null && weatherData.etag == null) {
            this.#internalAPIRequester.get(
                app.urlFor(`api.semantics.weather.retrieve_one`, {id: weatherData.id}),
                (data) => {
                    weatherData = data.data;
                    weatherData.etag = data.etag;
                    if (!weatherData.forecast) {
                        this.#weatherSetupByParam[weatherTsData.parameter] = weatherData;
                    }
                    else {
                        this.#forecastWeatherSetupByParam[weatherTsData.parameter] = weatherData;
                    }

                    afterEtagLoadedCallback?.();
                },
                this.#internalApiErrorCallback,
            );
        }
        else {
            afterEtagLoadedCallback?.();
        }
    }

    #loadWeatherParametersSetup() {
        this.#weatherSetupByParam = {};

        if (this.#structuralElementType == "site") {
            this.#weatherSetupHelpElmt.classList.add("d-none", "invisible");
            this.#weatherSetupTableElmt.parentElement.classList.remove("d-none", "invisible");
            this.#weatherAddParamBtnElmt.parentElement.classList.remove("d-none", "invisible");

            let tableBodyElmt = this.#weatherSetupTableElmt.querySelector("tbody");
            tableBodyElmt.innerHTML = "";
            tableBodyElmt.appendChild(new Spinner());
            this.#weatherSetupItemsCountElmt.setLoading();

            if (this.#weatherSetupGetReqID != null) {
                this.#internalAPIRequester.abort(this.#weatherSetupGetReqID);
                this.#weatherSetupGetReqID = null;
            }

            this.#weatherSetupGetReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.semantics.weather.list`, {site: this.#structuralElementId, forecast: false}),
                (data) => {
                    tableBodyElmt.innerHTML = "";
                    if (data.data.length > 0) {
                        for (let row of data.data) {
                            this.#weatherSetupByParam[row.parameter] = row;
                            let itemElmt = this.#createWeatherParamRowElement(row);
                            tableBodyElmt.appendChild(itemElmt);
                        }
                    }
                    else {
                        let trElmt = document.createElement("tr");
                        tableBodyElmt.appendChild(trElmt);
    
                        let tdElmt = document.createElement("td");
                        tdElmt.setAttribute("colspan", 2);
                        trElmt.appendChild(tdElmt);
    
                        let noItemElmt = document.createElement("p");
                        noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "pt-2", "w-100");
                        noItemElmt.innerText = "Nothing configured yet";
                        tdElmt.appendChild(noItemElmt);
                    }

                    this.#updateWeatherItemsCount();

                    let definedWeatherParamIDs = Object.keys(this.#weatherSetupByParam);
                    this.#weatherAddParamMenuElmt.innerHTML = "";
                    for (let [weatherParamID, weatherParamLabel] of Object.entries(this.#weatherParams)) {
                        if (!definedWeatherParamIDs.includes(weatherParamID)) {
                            let menuItemElmt = this.#createDropDownMenuItemElement(
                                weatherParamLabel,
                                () => {
                                    let weatherParamSetup = {
                                        "id": null,
                                        "parameter": weatherParamID,
                                        "parameter_label": weatherParamLabel,
                                        "timeseries": null,
                                        "site_id": this.#structuralElementId,
                                        "timeseries_id": null,
                                        "forecast": false,
                                    };

                                    if (Object.keys(this.#weatherSetupByParam).length <= 0) {
                                        tableBodyElmt.innerHTML = "";
                                    }
                                    let rowElmt = this.#createWeatherParamRowElement(weatherParamSetup);
                                    tableBodyElmt.appendChild(rowElmt);
    
                                    this.#weatherSetupByParam[weatherParamID] = weatherParamSetup;
    
                                    this.#updateWeatherItemsCount();
    
                                    if (this.#weatherAddParamMenuElmt.childElementCount <= 0) {
                                        this.#weatherAddParamBtnElmt.parentElement.classList.add("d-none", "invisible");
                                    }
                                },
                            );
                            this.#weatherAddParamMenuElmt.appendChild(menuItemElmt);
                        }
                    }
                },
                this.#internalApiErrorCallback,
            );
        }
        else {
            this.#weatherSetupHelpElmt.classList.remove("d-none", "invisible");
            this.#weatherSetupTableElmt.parentElement.classList.add("d-none", "invisible");
        }
    }

    #updateWeatherItemsCount() {
        let totalCount = Object.keys(this.#weatherSetupByParam).length;
        this.#weatherSetupItemsCountElmt.update({totalCount: totalCount, firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount});
    }

    #loadForecastWeatherParametersSetup() {
        this.#forecastWeatherSetupByParam = {};

        if (this.#structuralElementType == "site") {
            this.#forecastWeatherSetupHelpElmt.classList.add("d-none", "invisible");
            this.#forecastWeatherSetupTableElmt.parentElement.classList.remove("d-none", "invisible");
            this.#forecastWeatherAddParamBtnElmt.parentElement.classList.remove("d-none", "invisible");

            let tableBodyElmt = this.#forecastWeatherSetupTableElmt.querySelector("tbody");
            tableBodyElmt.innerHTML = "";
            tableBodyElmt.appendChild(new Spinner());
            this.#forecastWeatherSetupItemsCountElmt.setLoading();

            if (this.#forecastWeatherSetupGetReqID != null) {
                this.#internalAPIRequester.abort(this.#forecastWeatherSetupGetReqID);
                this.#forecastWeatherSetupGetReqID = null;
            }

            this.#forecastWeatherSetupGetReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.semantics.weather.list`, {site: this.#structuralElementId, forecast: true}),
                (data) => {
                    tableBodyElmt.innerHTML = "";
                    if (data.data.length > 0) {
                        for (let row of data.data) {
                            this.#forecastWeatherSetupByParam[row.parameter] = row;
                            let itemElmt = this.#createWeatherParamRowElement(row);
                            tableBodyElmt.appendChild(itemElmt);
                        }
                    }
                    else {
                        let trElmt = document.createElement("tr");
                        tableBodyElmt.appendChild(trElmt);
    
                        let tdElmt = document.createElement("td");
                        tdElmt.setAttribute("colspan", 2);
                        trElmt.appendChild(tdElmt);
    
                        let noItemElmt = document.createElement("p");
                        noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "pt-2", "w-100");
                        noItemElmt.innerText = "Nothing configured yet";
                        tdElmt.appendChild(noItemElmt);
                    }

                    this.#updateForecastWeatherItemsCount();

                    let definedWeatherParamIDs = Object.keys(this.#forecastWeatherSetupByParam);
                    this.#forecastWeatherAddParamMenuElmt.innerHTML = "";
                    for (let [weatherParamID, weatherParamLabel] of Object.entries(this.#weatherParams)) {
                        if (!definedWeatherParamIDs.includes(weatherParamID)) {
                            let menuItemElmt = this.#createDropDownMenuItemElement(
                                weatherParamLabel,
                                () => {
                                    let weatherParamSetup = {
                                        "id": null,
                                        "parameter": weatherParamID,
                                        "parameter_label": weatherParamLabel,
                                        "timeseries": null,
                                        "site_id": this.#structuralElementId,
                                        "timeseries_id": null,
                                        "forecast": true,
                                    };

                                    if (Object.keys(this.#forecastWeatherSetupByParam).length <= 0) {
                                        tableBodyElmt.innerHTML = "";
                                    }
                                    let rowElmt = this.#createWeatherParamRowElement(weatherParamSetup);
                                    tableBodyElmt.appendChild(rowElmt);
    
                                    this.#forecastWeatherSetupByParam[weatherParamID] = weatherParamSetup;
    
                                    this.#updateForecastWeatherItemsCount();
    
                                    if (this.#forecastWeatherAddParamMenuElmt.childElementCount <= 0) {
                                        this.#forecastWeatherAddParamBtnElmt.parentElement.classList.add("d-none", "invisible");
                                    }
                                },
                            );
                            this.#forecastWeatherAddParamMenuElmt.appendChild(menuItemElmt);
                        }
                    }
                },
                this.#internalApiErrorCallback,
            );
        }
        else {
            this.#forecastWeatherSetupHelpElmt.classList.remove("d-none", "invisible");
            this.#forecastWeatherSetupTableElmt.parentElement.classList.add("d-none", "invisible");
        }
    }

    #updateForecastWeatherItemsCount() {
        let totalCount = Object.keys(this.#forecastWeatherSetupByParam).length;
        this.#forecastWeatherSetupItemsCountElmt.update({totalCount: totalCount, firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount});
    }

    #createEnergyProdRowElement(energ7261530yID, energyName, energyProdSetup) {
        let rowElmt = this.#createRowElement(energyName);

        for (let energyProdTechSetup of Object.values(energyProdSetup)) {
            let suffixId = `energyProd-${energyProdTechSetup.energy_id}-${energyProdTechSetup.prod_tech_id}`;
            let prodTechName = this.#energyProdTechs[energyProdTechSetup.prod_tech_id];

            let tdElmt = this.#createTimeseriesSetupCellElement(
                suffixId,
                `${energyProdTechSetup.timeseries_id != null ? `${energyProdTechSetup.timeseries.name}${energyProdTechSetup.timeseries.unit_symbol ? ` [${energyProdTechSetup.timeseries.unit_symbol}]` : ""}` : "none"}`,
                energyProdTechSetup.timeseries_id != null,
                () => {
                    this.#selectTimeseriesTargetTextElmt.innerText = `${energyName.toLowerCase()} energy production of ${prodTechName.toLowerCase()} system`;
                    this.#tsSelector.clearAllSelection();
                    this.#updateSaveBtnState();

                    // In update case, get resource etag if not known.
                    this.#reloadEnergyProdSetupForEtag(
                        energyProdTechSetup.energy_id,
                        energyProdTechSetup.prod_tech_id,
                        () => {
                            let dataToEdit = this.#energyProdSetupByEnergyAndTech[energyProdTechSetup.energy_id][energyProdTechSetup.prod_tech_id];
                            if (dataToEdit.timeseries_id != null) {
                                this.#tsSelector.select(dataToEdit.timeseries_id, () => { this.#updateSaveBtnState(); });
                            }        
                        },
                    );

                    this.#energyEdited = energyProdTechSetup.energy_id;
                    this.#prodTechEdited = energyProdTechSetup.prod_tech_id;
                },
                `Remove <mark>${energyName} - ${prodTechName}</mark> energy production setup`,
                () => {
                    let dataToDelete = this.#energyProdSetupByEnergyAndTech[energyProdTechSetup.energy_id][energyProdTechSetup.prod_tech_id];
                    this.#deleteReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.delete(
                        app.urlFor(`api.semantics.energy.production.delete`, {id: dataToDelete.id, "struct_elmt_type": this.#structuralElementType}),
                        dataToDelete.etag,
                        () => {
                            dataToDelete.id = null;
                            dataToDelete.timeseries_id = null;
                            dataToDelete.timeseries = null;
                            dataToDelete.etag = null;
                            this.#energyProdSetupByEnergyAndTech[dataToDelete.energy_id][dataToDelete.prod_tech_id] = dataToDelete;

                            this.#refreshSetup(dataToDelete.timeseries, suffixId);
                        },
                        this.#internalApiErrorCallback,
                        () => {
                            app.flashMessage(`[${energyName} - ${prodTechName}] energy production setup removed!`, "success", 5);
                        },
                    );
                },
                () => {
                    // In delete case, get resource etag if not known.
                    this.#reloadEnergyProdSetupForEtag(
                        energyProdTechSetup.energy_id,
                        energyProdTechSetup.prod_tech_id,
                        () => {
                            this.#energyEdited = energyProdTechSetup.energy_id;
                            this.#prodTechEdited = energyProdTechSetup.prod_tech_id;
                        },
                    );
                },
            );

            rowElmt.appendChild(tdElmt);
        }

        return rowElmt;
    }

    #reloadEnergyProdSetupForEtag(energyID, prodTechID, afterEtagLoadedCallback = null) {
        let energyProdData = this.#energyProdSetupByEnergyAndTech[energyID][prodTechID];
        if (energyProdData.id != null && energyProdData.etag == null) {
            this.#internalAPIRequester.get(
                app.urlFor(`api.semantics.energy.production.retrieve_one`, {id: energyProdData.id, "struct_elmt_type": this.#structuralElementType}),
                (data) => {
                    energyProdData = data.data;
                    energyProdData.etag = data.etag;
                    this.#energyProdSetupByEnergyAndTech[energyID][prodTechID] = energyProdData;

                    afterEtagLoadedCallback?.();
                },
                this.#internalApiErrorCallback,
            );
        }
        else {
            afterEtagLoadedCallback?.();
        }
    }

    #buildEmptyEnergyProdTechSetup(energyID, energyName, prodTechID, prodTechName) {
        let energyProdTechSetup = {
            "id": null,
            "energy_id": energyID,
            "energy_name": energyName,
            "prod_tech_id": prodTechID,
            "prod_tech_name": prodTechName,
            "timeseries": null,
            "timeseries_id": null,
        };
        energyProdTechSetup[`${this.#structuralElementType}_id`] = this.#structuralElementId;
        return energyProdTechSetup;
    }

    #loadEnergyProductionSetup() {
        this.#energyProdSetupByEnergyAndTech = {};

        this.#energyProdSetupHelpElmt.classList.add("d-none", "invisible");
        this.#energyProdSetupTableElmt.parentElement.classList.remove("d-none", "invisible");
        this.#energyProdAddEnergyBtnElmt.parentElement.classList.remove("d-none", "invisible");

        let tableBodyElmt = this.#energyProdSetupTableElmt.querySelector("tbody");
        tableBodyElmt.innerHTML = "";
        tableBodyElmt.appendChild(new Spinner());
        this.#energyProdSetupItemsCountElmt.setLoading();

        if (this.#energyProdSetupGetReqID != null) {
            this.#internalAPIRequester.abort(this.#energyProdSetupGetReqID);
            this.#energyProdSetupGetReqID = null;
        }

        let queryArgs = {"struct_elmt_type": this.#structuralElementType};
        queryArgs[this.#structuralElementType] = this.#structuralElementId;
        this.#energyProdSetupGetReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.semantics.energy.production.list`, queryArgs),
            (data) => {
                tableBodyElmt.innerHTML = "";
                if (data.data.length > 0) {
                    for (let row of data.data) {
                        if (this.#energyProdSetupByEnergyAndTech[row.energy_id] == null) {
                            this.#energyProdSetupByEnergyAndTech[row.energy_id] = {};
                        }
                        this.#energyProdSetupByEnergyAndTech[row.energy_id][row.prod_tech_id] = row;
                    }
                    // Complete energy rows with not defined production technologies.
                    for (let [energyID, energyProdSetup] of Object.entries(this.#energyProdSetupByEnergyAndTech)) {
                        let energyName = this.#energies[energyID];
                        let definedProdTechs = Object.keys(energyProdSetup);
                        for (let [prodTechID, prodTechName] of Object.entries(this.#energyProdTechs)) {
                            if (!definedProdTechs.includes(prodTechID)) {
                                energyProdSetup[prodTechID] = this.#buildEmptyEnergyProdTechSetup(energyID, energyName, prodTechID, prodTechName);
                            }
                        }
                        let itemElmt = this.#createEnergyProdRowElement(energyID, energyName, energyProdSetup);
                        tableBodyElmt.appendChild(itemElmt);
                    }
                }
                else {
                    let trElmt = document.createElement("tr");
                    tableBodyElmt.appendChild(trElmt);

                    let tdElmt = document.createElement("td");
                    tdElmt.setAttribute("colspan", Object.keys(this.#energyEndUses).length + 1);
                    trElmt.appendChild(tdElmt);

                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "pt-2", "w-100");
                    noItemElmt.innerText = "Nothing configured yet";
                    tdElmt.appendChild(noItemElmt);
                }

                this.#updateEnergyProdItemsCount();

                let definedEnergyIDs = Object.keys(this.#energyProdSetupByEnergyAndTech);
                this.#energyProdAddEnergyMenuElmt.innerHTML = "";
                for (let [energyID, energyName] of Object.entries(this.#energies)) {
                    if (!definedEnergyIDs.includes(energyID)) {
                        let menuItemElmt = this.#createDropDownMenuItemElement(
                            energyName,
                            () => {
                                let energyProdSetup = {};
                                for (let [prodTechID, prodTechName] of Object.entries(this.#energyProdTechs)) {
                                    energyProdSetup[prodTechID] = this.#buildEmptyEnergyProdTechSetup(energyID, energyName, prodTechID, prodTechName);
                                }

                                if (Object.keys(this.#energyProdSetupByEnergyAndTech).length <= 0) {
                                    tableBodyElmt.innerHTML = "";
                                }
                                let rowElmt = this.#createEnergyProdRowElement(energyID, energyName, energyProdSetup);
                                tableBodyElmt.appendChild(rowElmt);

                                this.#energyProdSetupByEnergyAndTech[energyID] = energyProdSetup;

                                this.#updateEnergyProdItemsCount();

                                if (this.#energyProdAddEnergyMenuElmt.childElementCount <= 0) {
                                    this.#energyProdAddEnergyBtnElmt.parentElement.classList.add("d-none", "invisible");
                                }
                            },
                        );
                        this.#energyProdAddEnergyMenuElmt.appendChild(menuItemElmt);
                    }
                }
            },
            this.#internalApiErrorCallback,
        );
    }

    #updateEnergyProdItemsCount() {
        let totalCount = Object.keys(this.#energyProdSetupByEnergyAndTech).length;
        this.#energyProdSetupItemsCountElmt.update({totalCount: totalCount, firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount});
    }

    #createEnergyConsRowElement(energyID, energyName, energyConsSetup) {
        let rowElmt = this.#createRowElement(energyName);

        for (let energyConsEndUseSetup of Object.values(energyConsSetup)) {
            let suffixId = `energyCons-${energyConsEndUseSetup.energy_id}-${energyConsEndUseSetup.end_use_id}`;
            let endUseName = this.#energyEndUses[energyConsEndUseSetup.end_use_id];

            let tdElmt = this.#createTimeseriesSetupCellElement(
                suffixId,
                `${energyConsEndUseSetup.timeseries_id != null ? `${energyConsEndUseSetup.timeseries.name}${energyConsEndUseSetup.timeseries.unit_symbol ? ` [${energyConsEndUseSetup.timeseries.unit_symbol}]` : ""}` : "none"}`,
                energyConsEndUseSetup.timeseries_id != null,
                () => {
                    this.#selectTimeseriesTargetTextElmt.innerText = `${energyName.toLowerCase()} energy consumption of ${endUseName.toLowerCase()} end use`;
                    this.#tsSelector.clearAllSelection();
                    this.#updateSaveBtnState();

                    // In update case, get resource etag if not known.
                    this.#reloadEnergyConsSetupForEtag(
                        energyConsEndUseSetup.energy_id,
                        energyConsEndUseSetup.end_use_id,
                        () => {
                            let dataToEdit = this.#energyConsSetupByEnergyAndUses[energyConsEndUseSetup.energy_id][energyConsEndUseSetup.end_use_id];
                            if (dataToEdit.timeseries_id != null) {
                                this.#tsSelector.select(dataToEdit.timeseries_id, () => { this.#updateSaveBtnState(); });
                            }
                        },
                    );

                    this.#energyEdited = energyConsEndUseSetup.energy_id;
                    this.#endUseEdited = energyConsEndUseSetup.end_use_id;
                },
                `Remove <mark>${energyName} - ${endUseName}</mark> energy consumption setup`,
                () => {
                    let dataToDelete = this.#energyConsSetupByEnergyAndUses[energyConsEndUseSetup.energy_id][energyConsEndUseSetup.end_use_id];
                    this.#deleteReqIDByTab[this.#selectedTab] = this.#internalAPIRequester.delete(
                        app.urlFor(`api.semantics.energy.consumption.delete`, {id: dataToDelete.id, "struct_elmt_type": this.#structuralElementType}),
                        dataToDelete.etag,
                        () => {
                            dataToDelete.id = null;
                            dataToDelete.timeseries_id = null;
                            dataToDelete.timeseries = null;
                            dataToDelete.etag = null;
                            this.#energyConsSetupByEnergyAndUses[dataToDelete.energy_id][dataToDelete.end_use_id] = dataToDelete;

                            this.#refreshSetup(dataToDelete.timeseries, suffixId);
                        },
                        this.#internalApiErrorCallback,
                        () => {
                            app.flashMessage(`[${energyName} - ${endUseName}] energy consumption setup removed!`, "success", 5);
                        },
                    );
                },
                () => {
                    // In delete case, get resource etag if not known.
                    this.#reloadEnergyConsSetupForEtag(
                        energyConsEndUseSetup.energy_id,
                        energyConsEndUseSetup.end_use_id,
                        () => {
                            this.#energyEdited = energyConsEndUseSetup.energy_id;
                            this.#endUseEdited = energyConsEndUseSetup.end_use_id;
                        },
                    );
                },
            );

            rowElmt.appendChild(tdElmt);
        }

        return rowElmt;
    }

    #reloadEnergyConsSetupForEtag(energyID, endUseID, afterEtagLoadedCallback = null) {
        let energyConsData = this.#energyConsSetupByEnergyAndUses[energyID][endUseID];
        if (energyConsData.id != null && energyConsData.etag == null) {
            this.#internalAPIRequester.get(
                app.urlFor(`api.semantics.energy.consumption.retrieve_one`, {id: energyConsData.id, "struct_elmt_type": this.#structuralElementType}),
                (data) => {
                    energyConsData = data.data;
                    energyConsData.etag = data.etag;
                    this.#energyConsSetupByEnergyAndUses[energyID][endUseID] = energyConsData;

                    afterEtagLoadedCallback?.();
                },
                this.#internalApiErrorCallback,
            );
        }
        else {
            afterEtagLoadedCallback?.();
        }
    }

    #buildEmptyEnergyConsEndUseSetup(energyID, energyName, endUseID, endUseName) {
        let energyConsEndUseSetup = {
            "id": null,
            "energy_id": energyID,
            "energy_name": energyName,
            "end_use_id": endUseID,
            "end_use_name": endUseName,
            "timeseries": null,
            "timeseries_id": null,
        };
        energyConsEndUseSetup[`${this.#structuralElementType}_id`] = this.#structuralElementId;
        return energyConsEndUseSetup;
    }

    #loadEnergyConsumptionSetup() {
        this.#energyConsSetupByEnergyAndUses = {};

        this.#energyConsSetupHelpElmt.classList.add("d-none", "invisible");
        this.#energyConsSetupTableElmt.parentElement.classList.remove("d-none", "invisible");
        this.#energyConsAddEnergyBtnElmt.parentElement.classList.remove("d-none", "invisible");

        let tableBodyElmt = this.#energyConsSetupTableElmt.querySelector("tbody");
        tableBodyElmt.innerHTML = "";
        tableBodyElmt.appendChild(new Spinner());
        this.#energyConsSetupItemsCountElmt.setLoading();

        if (this.#energyConsSetupGetReqID != null) {
            this.#internalAPIRequester.abort(this.#energyConsSetupGetReqID);
            this.#energyConsSetupGetReqID = null;
        }

        let queryArgs = {"struct_elmt_type": this.#structuralElementType};
        queryArgs[this.#structuralElementType] = this.#structuralElementId;
        this.#energyConsSetupGetReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.semantics.energy.consumption.list`, queryArgs),
            (data) => {
                tableBodyElmt.innerHTML = "";
                if (data.data.length > 0) {
                    for (let row of data.data) {
                        if (this.#energyConsSetupByEnergyAndUses[row.energy_id] == null) {
                            this.#energyConsSetupByEnergyAndUses[row.energy_id] = {};
                        }
                        this.#energyConsSetupByEnergyAndUses[row.energy_id][row.end_use_id] = row;
                    }
                    // Complete energy rows with not defined end uses.
                    for (let [energyID, energyConsSetup] of Object.entries(this.#energyConsSetupByEnergyAndUses)) {
                        let energyName = this.#energies[energyID];
                        let definedEndUses = Object.keys(energyConsSetup);
                        for (let [endUseID, endUseName] of Object.entries(this.#energyEndUses)) {
                            if (!definedEndUses.includes(endUseID)) {
                                energyConsSetup[endUseID] = this.#buildEmptyEnergyConsEndUseSetup(energyID, energyName, endUseID, endUseName);
                            }
                        }
                        let itemElmt = this.#createEnergyConsRowElement(energyID, energyName, energyConsSetup);
                        tableBodyElmt.appendChild(itemElmt);
                    }
                }
                else {
                    let trElmt = document.createElement("tr");
                    tableBodyElmt.appendChild(trElmt);

                    let tdElmt = document.createElement("td");
                    tdElmt.setAttribute("colspan", Object.keys(this.#energyEndUses).length + 1);
                    trElmt.appendChild(tdElmt);

                    let noItemElmt = document.createElement("p");
                    noItemElmt.classList.add("fst-italic", "text-center", "text-muted", "pt-2", "w-100");
                    noItemElmt.innerText = "Nothing configured yet";
                    tdElmt.appendChild(noItemElmt);
                }

                this.#updateEnergyConsItemsCount();

                let definedEnergyIDs = Object.keys(this.#energyConsSetupByEnergyAndUses);
                this.#energyConsAddEnergyMenuElmt.innerHTML = "";
                for (let [energyID, energyName] of Object.entries(this.#energies)) {
                    if (!definedEnergyIDs.includes(energyID)) {
                        let menuItemElmt = this.#createDropDownMenuItemElement(
                            energyName,
                            () => {
                                let energyConsSetup = {};
                                for (let [endUseID, endUseName] of Object.entries(this.#energyEndUses)) {
                                    energyConsSetup[endUseID] = this.#buildEmptyEnergyConsEndUseSetup(energyID, energyName, endUseID, endUseName);
                                }

                                if (Object.keys(this.#energyConsSetupByEnergyAndUses).length <= 0) {
                                    tableBodyElmt.innerHTML = "";
                                }
                                let rowElmt = this.#createEnergyConsRowElement(energyID, energyName, energyConsSetup);
                                tableBodyElmt.appendChild(rowElmt);

                                this.#energyConsSetupByEnergyAndUses[energyID] = energyConsSetup;

                                this.#updateEnergyConsItemsCount();

                                if (this.#energyConsAddEnergyMenuElmt.childElementCount <= 0) {
                                    this.#energyConsAddEnergyBtnElmt.parentElement.classList.add("d-none", "invisible");
                                }
                            },
                        );
                        this.#energyConsAddEnergyMenuElmt.appendChild(menuItemElmt);
                    }
                }
            },
            this.#internalApiErrorCallback,
        );
    }

    #updateEnergyConsItemsCount() {
        let totalCount = Object.keys(this.#energyConsSetupByEnergyAndUses).length;
        this.#energyConsSetupItemsCountElmt.update({totalCount: totalCount, firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount});
    }

    mount() {
        this.#loadSitesTreeData();
    }
}

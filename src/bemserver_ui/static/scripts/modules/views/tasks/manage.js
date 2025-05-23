import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import "/static/scripts/modules/components/itemsCount.js";
import { ModalConfirm } from "/static/scripts/modules/components/modalConfirm.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import { CampaignStatusInfoElement } from "/static/scripts/modules/components/campaigns/statusInfo.js";
import { DateTime } from "/static/scripts/modules/tools/time.js";


export class TaskListView {

    #internalAPIRequester = null;
    #getTasksReqID = null;
    #getTaskNamesReqID = null;
    #postTaskReqID = null;
    #getTaskReqID = null;
    #updateTaskReqID = null;
    #deleteTaskReqID = null;
    #getCampaignsReqID = null;
    #getTaskOffsetUnitsReqID = null;
    #postRunOnceNewTaskReqID = null;

    #filtersCollapseElmt = null;
    #filtersCollapse = null;
    #taskStateSelectElmt = null;
    #campaignSelectElmt = null;
    #removeFiltersBtnElmt = null;
    #itemsCountElmt = null;
    #campaignInfoContainerElmt = null;
    #campaignStatusContainerElmt = null;
    #campaignDescriptionElmt = null;
    #campaignTzNameElmt = null;
    #campaignTzLabelElmt = null;
    #campaignPeriodContainerElmt = null;
    #tasksTableHeaderElmt = null;
    #tasksTableBodyElmt = null;
    #addTaskModalElmt = null;
    #addTaskModal = null;
    #addTaskCampaignElmt = null;
    #addTaskStateSwitchElmt = null;
    #addTaskNameElmt = null;
    #addTaskParametersElmt = null;
    #addTaskOffsetUnitElmt = null;
    #addTaskOffsetStartElmt = null;
    #addTaskOffsetEndElmt = null;
    #addTaskModalBtnElmt = null;
    #editTaskIdElmt = null;
    #editTaskModalElmt = null;
    #editTaskModal = null;
    #editTaskCampaignElmt = null;
    #editTaskStateSwitchElmt = null;
    #editTaskNameElmt = null;
    #editTaskParametersElmt = null;
    #editTaskOffsetUnitElmt = null;
    #editTaskOffsetStartElmt = null;
    #editTaskOffsetEndElmt = null;
    #removeTaskModalBtnElmt = null;
    #editTaskModalBtnElmt = null;
    #runOnceTaskModalBtnElmt = null;
    #runOnceTaskParametersElmt = null;
    #runOnceTaskDatetimeStartPickerElmt = null;
    #runOnceTaskDatetimeEndPickerElmt = null;
    #runOnceTaskSetTimezoneLnkContainerElmt = null;
    #runOnceTaskSetTimezoneLnkElmt = null;
    #runOnceTaskSetTimezoneContainerElmt = null;
    #runOnceTaskTimezonePickerElmt = null;
    #runOnceTaskResetTimezoneLnkElmt = null;
    #removeModalConfirmElmt = null;
    #editTabElmt = null;
    #editTab = null;
    #runOnceTabElmt = null;
    #runOnceNewTaskModalElmt = null;
    #runOnceNewTaskCampaignElmt = null;
    #runOnceNewTaskNameElmt = null;
    #runOnceNewTaskParametersElmt = null;
    #runOnceNewTaskDatetimeStartPickerElmt = null;
    #runOnceNewTaskDatetimeEndPickerElmt = null;
    #runOnceNewTaskSetTimezoneLnkContainerElmt = null;
    #runOnceNewTaskSetTimezoneLnkElmt = null;
    #runOnceNewTaskSetTimezoneContainerElmt = null;
    #runOnceNewTaskTimezonePickerElmt = null;
    #runOnceNewTaskResetTimezoneLnkElmt = null;
    #runOnceNewTaskModalBtnElmt = null;

    #availableRegisteredTasks = {};
    #selectedTask = null;
    #selectedTaskEtag = null;
    #selectedCampaign = null;
    #availableCampaigns = {};

    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();

        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#filtersCollapseElmt = document.getElementById("collapseFilters");
        this.#filtersCollapse = new bootstrap.Collapse(this.#filtersCollapseElmt, { toggle: false });
        this.#taskStateSelectElmt = document.getElementById("taskState");
        this.#campaignSelectElmt = document.getElementById("campaigns");
        this.#removeFiltersBtnElmt = document.getElementById("removeFiltersBtn");
        this.#itemsCountElmt = document.getElementById("itemsCount");
        this.#campaignInfoContainerElmt = document.getElementById("campaignInfoContainer");
        this.#campaignStatusContainerElmt = document.getElementById("campaignStatusContainer");
        this.#campaignDescriptionElmt = document.getElementById("campaignDescription");
        this.#campaignTzNameElmt = document.getElementById("campaignTzName");
        this.#campaignTzLabelElmt = document.getElementById("campaignTzLabel");
        this.#campaignPeriodContainerElmt = document.getElementById("campaignPeriodContainer");
        this.#tasksTableHeaderElmt = document.getElementById("tasksTableHeader");
        this.#tasksTableBodyElmt = document.getElementById("tasksTableBody");
        this.#addTaskModalElmt = document.getElementById("addTaskModal");
        this.#addTaskModal = new bootstrap.Modal(this.#addTaskModalElmt);
        this.#addTaskCampaignElmt = document.getElementById("addTaskCampaign");
        this.#addTaskStateSwitchElmt = document.getElementById("addTaskStateSwitch");
        this.#addTaskNameElmt = document.getElementById("addTaskName");
        this.#addTaskParametersElmt = document.getElementById("addTaskParameters");
        this.#addTaskOffsetUnitElmt = document.getElementById("addTaskOffsetUnit");
        this.#addTaskOffsetStartElmt = document.getElementById("addTaskOffsetStart");
        this.#addTaskOffsetEndElmt = document.getElementById("addTaskOffsetEnd");
        this.#addTaskModalBtnElmt = document.getElementById("addTaskModalBtn");
        this.#editTaskModalElmt = document.getElementById("editTaskModal");
        this.#editTaskModal = new bootstrap.Modal(this.#editTaskModalElmt);
        this.#editTaskIdElmt = document.getElementById("editTaskId");
        this.#editTaskCampaignElmt = document.getElementById("editTaskCampaign");
        this.#editTaskStateSwitchElmt = document.getElementById("editTaskStateSwitch");
        this.#editTaskNameElmt = document.getElementById("editTaskName");
        this.#editTaskParametersElmt = document.getElementById("editTaskParameters");
        this.#editTaskOffsetUnitElmt = document.getElementById("editTaskOffsetUnit");
        this.#editTaskOffsetStartElmt = document.getElementById("editTaskOffsetStart");
        this.#editTaskOffsetEndElmt = document.getElementById("editTaskOffsetEnd");
        this.#editTaskModalBtnElmt = document.getElementById("editTaskModalBtn");
        this.#removeTaskModalBtnElmt = document.getElementById("removeTaskModalBtn");
        this.#runOnceTaskModalBtnElmt = document.getElementById("runOnceTaskModalBtn");
        this.#runOnceTaskParametersElmt = document.getElementById("runOnceTaskParameters");
        this.#runOnceTaskDatetimeStartPickerElmt = document.getElementById("runOnceTaskDatetimeStart");
        this.#runOnceTaskDatetimeEndPickerElmt = document.getElementById("runOnceTaskDatetimeEnd");
        this.#runOnceTaskSetTimezoneLnkContainerElmt = document.getElementById("runOnceTaskSetTimezoneLnkContainer");
        this.#runOnceTaskSetTimezoneLnkElmt = document.getElementById("runOnceTaskSetTimezoneLnk");
        this.#runOnceTaskSetTimezoneContainerElmt = document.getElementById("runOnceTaskSetTimezoneContainer");
        this.#runOnceTaskTimezonePickerElmt = document.getElementById("runOnceTaskTimezonePicker");
        this.#runOnceTaskResetTimezoneLnkElmt = document.getElementById("runOnceTaskResetTimezoneLnk");
        this.#editTabElmt = document.getElementById("edit-tab");
        this.#editTab = new bootstrap.Tab(this.#editTabElmt);
        this.#runOnceTabElmt = document.getElementById("runonce-tab");
        this.#runOnceNewTaskModalElmt = document.getElementById("runOnceNewTaskModal");
        this.#runOnceNewTaskCampaignElmt = document.getElementById("runOnceNewTaskCampaign");
        this.#runOnceNewTaskNameElmt = document.getElementById("runOnceNewTaskName");
        this.#runOnceNewTaskParametersElmt = document.getElementById("runOnceNewTaskParameters");
        this.#runOnceNewTaskDatetimeStartPickerElmt = document.getElementById("runOnceNewTaskDatetimeStart");
        this.#runOnceNewTaskDatetimeEndPickerElmt = document.getElementById("runOnceNewTaskDatetimeEnd");
        this.#runOnceNewTaskSetTimezoneLnkContainerElmt = document.getElementById("runOnceNewTaskSetTimezoneLnkContainer");
        this.#runOnceNewTaskSetTimezoneLnkElmt = document.getElementById("runOnceNewTaskSetTimezoneLnk");
        this.#runOnceNewTaskSetTimezoneContainerElmt = document.getElementById("runOnceNewTaskSetTimezoneContainer");
        this.#runOnceNewTaskTimezonePickerElmt = document.getElementById("runOnceNewTaskTimezonePicker");
        this.#runOnceNewTaskResetTimezoneLnkElmt = document.getElementById("runOnceNewTaskResetTimezoneLnk");
        this.#runOnceNewTaskModalBtnElmt = document.getElementById("runOnceNewTaskModalBtn");
    }

    #initEventListeners() {
        this.#taskStateSelectElmt.addEventListener("change", () => {
            this.#updateFiltersPanelState();
            this.refresh();
        });

        this.#campaignSelectElmt.addEventListener("change", () => {
            this.#getCampaign(this.#campaignSelectElmt.value, () => { this.#updateCampaignPanel(); });

            this.#updateFiltersPanelState();
            this.refresh();
        });

        this.#removeFiltersBtnElmt.addEventListener("click", () => {
            let hasFilterChanged = false;
            if (this.#taskStateSelectElmt.value != this.#taskStateSelectElmt.getAttribute("data-default")) {
                this.#taskStateSelectElmt.value = this.#taskStateSelectElmt.getAttribute("data-default");
                hasFilterChanged = true;
            }

            if (this.#campaignSelectElmt.value != this.#campaignSelectElmt.getAttribute("data-default")) {
                this.#campaignSelectElmt.value = this.#campaignSelectElmt.getAttribute("data-default");
                hasFilterChanged = true;
            }

            this.#getCampaign(this.#campaignSelectElmt.value, () => { this.#updateCampaignPanel(); });
            this.#updateFiltersPanelState();

            if (hasFilterChanged) {
                this.refresh();
            }
        });

        this.#addTaskModalElmt.addEventListener("show.bs.modal", () => {
            let selectedCampaignId = this.#campaignSelectElmt.value != "all" ? this.#campaignSelectElmt.value : (app.campaignContext.has_campaign ? app.campaignContext.id : (this.#availableCampaigns.length > 0 ? Object.keys(this.#availableCampaigns)[0] : null));
            this.#populateCampaignSelect(this.#addTaskCampaignElmt, selectedCampaignId);
            this.#addTaskStateSwitchElmt.checked = true;
            this.#populateTaskNameSelect(this.#addTaskNameElmt);
            this.#addTaskParametersElmt.value = this.#availableRegisteredTasks["scheduled_tasks"][this.#addTaskNameElmt.value]["default_parameters"];

            // Disabled only if selected campaign == filter.
            if (this.#campaignSelectElmt.value == selectedCampaignId) {
                this.#addTaskCampaignElmt.setAttribute("disabled", true);
            }
            else {
                this.#addTaskCampaignElmt.removeAttribute("disabled");
            }

            this.#addTaskOffsetUnitElmt.selectedIndex = 0;
            this.#addTaskOffsetStartElmt.value = null;
            this.#addTaskOffsetEndElmt.value = null;
        });

        this.#addTaskNameElmt.addEventListener("change", () => {
            this.#addTaskParametersElmt.value = this.#availableRegisteredTasks["scheduled_tasks"][this.#addTaskNameElmt.value]["default_parameters"];
        });

        this.#addTaskModalBtnElmt.addEventListener("click", () => {
            if (!this.#addTaskOffsetStartElmt.validity.valid || !this.#addTaskOffsetEndElmt.validity.valid) return;

            this.#createTask(() => {
                this.#addTaskModal.hide();
                this.#updateTaskList();
            });
        });

        this.#removeTaskModalBtnElmt.addEventListener("click", (event) => {
            if (this.#selectedTask == null || this.#selectedTaskEtag == null) return;

            let confirmMessage = `Remove <mark>${this.#selectedTask.task_name}</mark> task (# ${this.#selectedTask.id})`;

            if (this.#removeModalConfirmElmt == null) {
                this.#removeModalConfirmElmt = new ModalConfirm(
                    event.target.id,
                    confirmMessage,
                    () => {
                        this.#removeTask(() => {
                            this.#removeModalConfirmElmt.hide();
                            this.#editTaskModal.hide();
                            this.#updateTaskList();
                        });
                    },
                    () => {
                        app.flashMessage(`Operation canceled.`, "info", 5);
                        this.#editTaskModalElmt.focus();
                    },
                );
                document.body.appendChild(this.#removeModalConfirmElmt);
            }
            else {
                this.#removeModalConfirmElmt.message = confirmMessage;
            }

            this.#removeModalConfirmElmt.show();
        });

        this.#editTaskModalElmt.addEventListener("show.bs.modal", () => {
            let taskCampaign = this.#availableCampaigns[this.#selectedTask.campaign_id];

            this.#editTaskIdElmt.textContent = `# ${this.#selectedTask.id}`;
            this.#editTaskCampaignElmt.textContent = taskCampaign.name;
            this.#editTaskStateSwitchElmt.checked = this.#selectedTask.is_enabled;
            this.#editTaskNameElmt.textContent = this.#selectedTask.task_name;
            this.#editTaskParametersElmt.value = this.#selectedTask.parameters;

            this.#editTaskOffsetUnitElmt.textContent = this.#selectedTask.offset_unit;
            this.#editTaskOffsetStartElmt.textContent = this.#selectedTask.start_offset;
            this.#editTaskOffsetEndElmt.textContent = this.#selectedTask.end_offset;

            this.#runOnceTaskParametersElmt.value = this.#selectedTask.parameters;

            this.#runOnceTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceTaskDatetimeStartPickerElmt.reset();
            // this.#runOnceTaskDatetimeStartPickerElmt.date = null;
            // this.#runOnceTaskDatetimeStartPickerElmt.time = "00:00";
            this.#runOnceTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceTaskDatetimeEndPickerElmt.reset();
            // this.#runOnceTaskDatetimeEndPickerElmt.date = null;
            // this.#runOnceTaskDatetimeEndPickerElmt.time = "00:00";
            this.#runOnceTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#updateRunOnceTaskSetTimezoneVisibility(false);

            this.#editTab.show();
        });

        this.#editTaskModalElmt.addEventListener("hide.bs.modal", () => {
            this.#selectedTask = null;
            this.#selectedTaskEtag = null;
        });

        this.#editTaskModalBtnElmt.addEventListener("click", () => {
            this.#updateTask(() => {
                this.#updateTaskList();
                this.#editTaskModal.hide();
            });
        });

        this.#editTabElmt.addEventListener("show.bs.tab", () => {
            this.#removeTaskModalBtnElmt.removeAttribute("disabled");
            this.#editTaskModalBtnElmt.removeAttribute("disabled");
            this.#editTaskModalBtnElmt.classList.remove("d-none", "invisible");
            this.#runOnceTaskModalBtnElmt.setAttribute("disabled", true);
            this.#runOnceTaskModalBtnElmt.classList.add("d-none", "invisible");
        });

        this.#runOnceTabElmt.addEventListener("show.bs.tab", () => {
            this.#removeTaskModalBtnElmt.setAttribute("disabled", true);
            this.#editTaskModalBtnElmt.setAttribute("disabled", true);
            this.#editTaskModalBtnElmt.classList.add("d-none", "invisible");
            this.#runOnceTaskModalBtnElmt.removeAttribute("disabled");
            this.#runOnceTaskModalBtnElmt.classList.remove("d-none", "invisible");
        });

        this.#runOnceTaskSetTimezoneLnkElmt.addEventListener("click", () => {
            this.#updateRunOnceTaskSetTimezoneVisibility(true);
        });

        this.#runOnceTaskTimezonePickerElmt.addEventListener("tzChange", (event) => {
            this.#runOnceTaskDatetimeStartPickerElmt.tzName = event.detail.tzName;
            this.#runOnceTaskDatetimeEndPickerElmt.tzName = event.detail.tzName;
        });

        this.#runOnceTaskResetTimezoneLnkElmt.addEventListener("click", () => {
            this.#updateRunOnceTaskTimezone();
        });

        this.#runOnceNewTaskModalElmt.addEventListener("show.bs.modal", () => {
            let selectedCampaignId = this.#campaignSelectElmt.value != "all" ? this.#campaignSelectElmt.value : (app.campaignContext.has_campaign ? app.campaignContext.id : Object.keys(this.#availableCampaigns)[0]);
            this.#populateCampaignSelect(this.#runOnceNewTaskCampaignElmt, selectedCampaignId);

            let taskCampaign = this.#availableCampaigns[selectedCampaignId];

            this.#runOnceNewTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceNewTaskDatetimeStartPickerElmt.reset();
            // this.#runOnceNewTaskDatetimeStartPickerElmt.date = null;
            // this.#runOnceNewTaskDatetimeStartPickerElmt.time = "00:00";
            this.#runOnceNewTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceNewTaskDatetimeEndPickerElmt.reset();
            // this.#runOnceNewTaskDatetimeEndPickerElmt.date = null;
            // this.#runOnceNewTaskDatetimeEndPickerElmt.time = "00:00";
            this.#runOnceNewTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#updateRunOnceNewTaskSetTimezoneVisibility(false);
            this.#populateTaskNameSelect(this.#runOnceNewTaskNameElmt, "async");

            this.#runOnceNewTaskParametersElmt.value = this.#availableRegisteredTasks["async_tasks"][this.#runOnceNewTaskNameElmt.value]["default_parameters"];
        });

        this.#runOnceNewTaskCampaignElmt.addEventListener("change", () => {
            this.#updateRunOnceNewTaskTimezone();
        });

        this.#runOnceNewTaskNameElmt.addEventListener("change", () => {
            this.#runOnceNewTaskParametersElmt.value = this.#availableRegisteredTasks["async_tasks"][this.#runOnceNewTaskNameElmt.value]["default_parameters"];
        });

        this.#runOnceNewTaskSetTimezoneLnkElmt.addEventListener("click", () => {
            this.#updateRunOnceNewTaskSetTimezoneVisibility(true);
        });

        this.#runOnceNewTaskTimezonePickerElmt.addEventListener("tzChange", (event) => {
            this.#runOnceNewTaskDatetimeStartPickerElmt.tzName = event.detail.tzName;
            this.#runOnceNewTaskDatetimeEndPickerElmt.tzName = event.detail.tzName;
        });

        this.#runOnceNewTaskResetTimezoneLnkElmt.addEventListener("click", () => {
            this.#updateRunOnceNewTaskTimezone();
        });

        this.#runOnceNewTaskModalBtnElmt.addEventListener("click", () => {
            if (!this.#runOnceNewTaskDatetimeStartPickerElmt.isValid || !this.#runOnceNewTaskDatetimeEndPickerElmt.isValid) return;

            this.#runOnceNewTask();
        });
    }

    #updateFiltersPanelState() {
        this.#updateSelectFilter(this.#taskStateSelectElmt);
        this.#updateSelectFilter(this.#campaignSelectElmt);

        let hasFilters = (
            this.#taskStateSelectElmt.value != this.#taskStateSelectElmt.getAttribute("data-default")
            || this.#campaignSelectElmt.value != this.#campaignSelectElmt.getAttribute("data-default")
        );
        if (hasFilters) {
            this.#filtersCollapse.show();
        }
        else {
            this.#filtersCollapse.hide();
        }
    }

    #updateSelectFilter(selectFilterElmt) {
        if (selectFilterElmt.value == selectFilterElmt.getAttribute("data-default")) {
            selectFilterElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
        }
        else {
            selectFilterElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
        }
    }

    #updateCampaignPanel() {
        if (this.#selectedCampaign == null) {
            this.#campaignInfoContainerElmt.classList.add("d-none", "invisible");
            return;
        }
        else {
            this.#campaignInfoContainerElmt.classList.remove("d-none", "invisible");
        }

        let campaignStatusInfoElmt = new CampaignStatusInfoElement({ renderStyle: "bullet", status: this.#selectedCampaign["state"], label: this.#selectedCampaign["name"] });
        this.#campaignStatusContainerElmt.innerHTML = "";
        this.#campaignStatusContainerElmt.appendChild(campaignStatusInfoElmt);

        let campaignTzName = this.#selectedCampaign["timezone_info"]["name"];

        this.#campaignDescriptionElmt.textContent = this.#selectedCampaign["description"];
        this.#campaignTzNameElmt.textContent = campaignTzName;
        this.#campaignTzLabelElmt.textContent = this.#selectedCampaign["timezone_info"]["area"]["label"];

        this.#campaignPeriodContainerElmt.innerHTML = "";

        if (this.#selectedCampaign["start_time"] != null) {
            let isOngoing = this.#selectedCampaign["state"] == "ongoing";
            let dtStart = DateTime.fromISO(this.#selectedCampaign["start_time"], { zone: campaignTzName });

            let campaignStartContainerElmt = document.createElement("div");
            campaignStartContainerElmt.classList.add("d-flex", "justify-content-xl-end", "align-items-center", "gap-2");
            if (!isOngoing) {
                campaignStartContainerElmt.classList.add("text-muted");
            }
            this.#campaignPeriodContainerElmt.appendChild(campaignStartContainerElmt);

            let campaignStartIconElmt = document.createElement("i");
            campaignStartIconElmt.classList.add("bi", "bi-play");
            if (isOngoing) {
                campaignStartIconElmt.classList.add("text-success");
            }
            campaignStartContainerElmt.appendChild(campaignStartIconElmt);

            let campaignStartElmt = document.createElement("small");
            if (isOngoing) {
                campaignStartElmt.classList.add("text-success", "text-opacity-75");
            }
            campaignStartElmt.textContent = dtStart.toISO({ suppressMilliseconds: true });
            campaignStartContainerElmt.appendChild(campaignStartElmt);
        }

        if (this.#selectedCampaign["end_time"] != null) {
            let isClosed = this.#selectedCampaign["state"] == "closed";
            let dtEnd = DateTime.fromISO(this.#selectedCampaign["end_time"], { zone: campaignTzName });

            let campaignEndContainerElmt = document.createElement("div");
            campaignEndContainerElmt.classList.add("d-flex", "justify-content-xl-end", "align-items-center", "gap-2");
            if (!isClosed) {
                campaignEndContainerElmt.classList.add("text-muted");
            }
            this.#campaignPeriodContainerElmt.appendChild(campaignEndContainerElmt);

            let campaignEndIconElmt = document.createElement("i");
            campaignEndIconElmt.classList.add("bi", "bi-stop");
            if (isClosed) {
                campaignEndIconElmt.classList.add("text-danger");
            }
            campaignEndContainerElmt.appendChild(campaignEndIconElmt);

            let campaignEndElmt = document.createElement("small");
            if (isClosed) {
                campaignEndElmt.classList.add("text-danger", "text-opacity-75");
            }
            campaignEndElmt.textContent = dtEnd.toISO({ suppressMilliseconds: true });
            campaignEndContainerElmt.appendChild(campaignEndElmt);
        }
    }

    #updateRunOnceTaskSetTimezoneVisibility(isVisible) {
        if (isVisible) {
            this.#runOnceTaskSetTimezoneLnkContainerElmt.classList.add("d-none", "invisible");
            this.#runOnceTaskSetTimezoneContainerElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#runOnceTaskSetTimezoneLnkContainerElmt.classList.remove("d-none", "invisible");
            this.#runOnceTaskSetTimezoneContainerElmt.classList.add("d-none", "invisible");
        }
    }

    #updateRunOnceNewTaskSetTimezoneVisibility(isVisible) {
        if (isVisible) {
            this.#runOnceNewTaskSetTimezoneLnkContainerElmt.classList.add("d-none", "invisible");
            this.#runOnceNewTaskSetTimezoneContainerElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#runOnceNewTaskSetTimezoneLnkContainerElmt.classList.remove("d-none", "invisible");
            this.#runOnceNewTaskSetTimezoneContainerElmt.classList.add("d-none", "invisible");
        }
    }

    #updateRunOnceTaskTimezone() {
        let taskCampaign = this.#availableCampaigns[this.#selectedTask.campaign_id];
        this.#runOnceTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
        this.#runOnceTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
        this.#runOnceTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
    }

    #updateRunOnceNewTaskTimezone() {
        let taskCampaign = this.#availableCampaigns[this.#runOnceNewTaskCampaignElmt.value];
        this.#runOnceNewTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
        this.#runOnceNewTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
        this.#runOnceNewTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
    }

    #updateTaskList() {
        if (this.#getTasksReqID != null) {
            this.#internalAPIRequester.abort(this.#getTasksReqID);
            this.#getTasksReqID = null;
        }

        this.#itemsCountElmt.setLoading();
        this.#tasksTableBodyElmt.innerHTML = "";
        let loadingContainerElmt = document.createElement("tr");
        let loadingElmt = document.createElement("td");
        loadingElmt.classList.add("text-center", "p-4");
        loadingElmt.setAttribute("colspan", 4);
        loadingElmt.appendChild(new Spinner());
        loadingContainerElmt.appendChild(loadingElmt);
        this.#tasksTableBodyElmt.appendChild(loadingContainerElmt);

        let tableColumns = [].slice.call(this.#tasksTableHeaderElmt.rows[0].cells);

        let filters = {
            "task_state": this.#taskStateSelectElmt.value,
            "campaign": this.#campaignSelectElmt.value,
        };

        this.#getTasksReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.retrieve_list`, filters),
            (data) => {
                let tasks = data.data;

                this.#tasksTableBodyElmt.innerHTML = "";
                if (tasks.length > 0) {
                    for (let task of tasks) {
                        let rowElmt = document.createElement("tr");
                        rowElmt.setAttribute("role", "button");
                        rowElmt.setAttribute("title", `Edit ${task.task_name} task (# ${task.id})`);
                        this.#tasksTableBodyElmt.appendChild(rowElmt);

                        rowElmt.addEventListener("click", () => {
                            this.#getTask(task["id"], () => {
                                this.#editTaskModal.show();
                            });
                        });

                        for (let col of tableColumns) {
                            let cellElmt = document.createElement("td");
                            if (col.classList.contains("d-none", "invisible")) {
                                cellElmt.classList.add("d-none", "invisible");
                            }
                            let attrName = col.getAttribute("data-name");
                            if (attrName == "task_state") {
                                let badgeStateElmt = document.createElement("span");
                                badgeStateElmt.classList.add("badge", "rounded-pill", task.is_enabled ? "text-bg-success" : "text-bg-warning");
                                badgeStateElmt.textContent = task[attrName];
                                cellElmt.appendChild(badgeStateElmt);
                            }
                            else if (attrName == "campaign_id") {
                                cellElmt.textContent = this.#availableCampaigns[task[attrName]].name;
                            }
                            else {
                                cellElmt.textContent = task[attrName];
                            }
                            rowElmt.appendChild(cellElmt);
                        }
                    }
                }
                else {
                    let noItemRowElmt = document.createElement("tr");
                    this.#tasksTableBodyElmt.appendChild(noItemRowElmt);

                    let noItemCellElmt = document.createElement("td");
                    noItemCellElmt.classList.add("p-4");
                    noItemCellElmt.setAttribute("colspan", tableColumns.length);
                    noItemRowElmt.appendChild(noItemCellElmt);

                    let noItemContainerElmt = document.createElement("div");
                    noItemContainerElmt.classList.add("d-flex", "justify-content-center", "align-items-center", "gap-2", "text-muted");
                    noItemCellElmt.appendChild(noItemContainerElmt);

                    let noItemIconElmt = document.createElement("i");
                    noItemIconElmt.classList.add("bi", "bi-slash-circle", "fs-3");
                    noItemContainerElmt.appendChild(noItemIconElmt);

                    let noItemElmt = document.createElement("span");
                    noItemElmt.classList.add("fst-italic");
                    noItemElmt.textContent = "No items";
                    noItemContainerElmt.appendChild(noItemElmt);
                }

                let totalCount = tasks.length;
                this.#itemsCountElmt.update({totalCount: totalCount, firstItem: totalCount > 0 ? 1 : 0, lastItem: totalCount});
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #populateTaskNameSelect(selectElement, taskType = "scheduled") {
        selectElement.innerHTML = "";
        for (let taskName of Object.keys(this.#availableRegisteredTasks[`${taskType}_tasks`])) {
            let optElmt = document.createElement("option");
            optElmt.value = taskName;
            optElmt.text = taskName;
            selectElement.appendChild(optElmt);
        }
    }

    #populateCampaignSelect(selectElement, defaultSelectedElement = null, addAllOption = false) {
        selectElement.innerHTML = "";
        if (addAllOption) {
            let optElmt = document.createElement("option");
            optElmt.value = "all";
            optElmt.text = "All";
            if (optElmt.value == defaultSelectedElement) {
                optElmt.setAttribute("selected", true);
            }
            selectElement.appendChild(optElmt);
        }

        for (let campaign of Object.values(this.#availableCampaigns)) {
            let optElmt = document.createElement("option");
            optElmt.value = campaign.id;
            optElmt.text = campaign.name;
            if (optElmt.value == defaultSelectedElement) {
                optElmt.setAttribute("selected", true);
            }
            selectElement.appendChild(optElmt);
        }
    }

    #populateTaskOffsetUnitSelect(data) {
        this.#addTaskOffsetUnitElmt.innerHTML = "";
        for (let offsetUnit of data) {
            let optElmt = document.createElement("option");
            optElmt.value = offsetUnit;
            optElmt.text = offsetUnit;
            this.#addTaskOffsetUnitElmt.appendChild(optElmt);
        }
    }

    #loadAvailableRegisteredTasks(successCallback = null) {
        this.#availableRegisteredTasks = {};

        if (this.#getTaskNamesReqID != null) {
            this.#internalAPIRequester.abort(this.#getTaskNamesReqID);
            this.#getTaskNamesReqID = null;
        }

        this.#getTaskNamesReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.retrieve_registered`),
            (data) => {
                this.#availableRegisteredTasks = data;

                successCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #getTask(taskId, successCallback = null) {
        if (this.#getTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#getTaskReqID);
            this.#getTaskReqID = null;
        }

        this.#getTaskReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.get`, { id: taskId }),
            (data) => {
                this.#selectedTask = data.data;
                this.#selectedTaskEtag = data.etag;

                successCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #createTask(successCallback = null) {
        if (this.#postTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#postTaskReqID);
            this.#postTaskReqID = null;
        }

        let payload = {
            campaign_id: this.#addTaskCampaignElmt.value,
            task_name: this.#addTaskNameElmt.value,
            is_enabled: this.#addTaskStateSwitchElmt.checked,
            parameters: this.#addTaskParametersElmt.value,
            offset_unit: this.#addTaskOffsetUnitElmt.value,
            start_offset: this.#addTaskOffsetStartElmt.value,
            end_offset: this.#addTaskOffsetEndElmt.value,
        };

        this.#postTaskReqID = this.#internalAPIRequester.post(
            app.urlFor(`api.tasks.create`),
            payload,
            (data) => {
                app.flashMessage(`Task ${data.data.task_name} (# ${data.data.id}) created.`, "info", 5);

                successCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #updateTask(successCallback = null) {
        if (this.#selectedTask == null || this.#selectedTaskEtag == null) return;

        if (this.#updateTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#updateTaskReqID);
            this.#updateTaskReqID = null;
        }

        let payload = {
            is_enabled: this.#editTaskStateSwitchElmt.checked,
            parameters: this.#editTaskParametersElmt.value,
        };

        this.#updateTaskReqID = this.#internalAPIRequester.put(
            app.urlFor(`api.tasks.update`, { id: this.#selectedTask.id }),
            payload,
            this.#selectedTaskEtag,
            (data) => {
                this.#selectedTask = data.data;
                this.#selectedTaskEtag = data.etag;

                app.flashMessage(`${this.#selectedTask.task_name} task (# ${this.#selectedTask.id}) is now updated!`, "success", 5);

                successCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #removeTask(successCallback = null) {
        if (this.#selectedTask == null || this.#selectedTaskEtag == null) return;

        app.flashMessage(`Removing ${this.#selectedTask.task_name} task.`, "info", 5);

        if (this.#deleteTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#deleteTaskReqID);
            this.#deleteTaskReqID = null;
        }

        this.#deleteTaskReqID = this.#internalAPIRequester.delete(
            app.urlFor(`api.tasks.delete`, { id: this.#selectedTask.id }),
            this.#selectedTaskEtag,
            (data) => {
                if (data.success) {
                    app.flashMessage(`${this.#selectedTask.task_name} task is now removed!`, "success", 5);

                    successCallback?.();
                }
                else {
                    app.flashMessage(`An error occured while removing ${this.#selectedTask.task_name} task!`, "error");
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #getCampaign(campaignId, successCallback = null) {
        this.#selectedCampaign = this.#availableCampaigns[campaignId];
        successCallback?.();
    }

    #getCampaigns(successCallback = null) {
        this.#availableCampaigns = {};

        if (this.#getCampaignsReqID != null) {
            this.#internalAPIRequester.abort(this.#getCampaignsReqID);
            this.#getCampaignsReqID = null;
        }

        this.#getCampaignsReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.campaigns.retrieve_list`),
            (data) => {
                for (let campaign of data.data) {
                    this.#availableCampaigns[campaign.id] = campaign;
                }

                successCallback?.();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #getTaskOffsetUnits(successCallback = null) {
        if (this.#getTaskOffsetUnitsReqID != null) {
            this.#internalAPIRequester.abort(this.#getTaskOffsetUnitsReqID);
            this.#getTaskOffsetUnitsReqID = null;
        }

        this.#getTaskOffsetUnitsReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.retrieve_offset_units`),
            (data) => {
                successCallback?.(data);
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #runOnceNewTask(successCallback = null) {
        if (this.#postRunOnceNewTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#postRunOnceNewTaskReqID);
            this.#postRunOnceNewTaskReqID = null;
        }

        let tzName = this.#runOnceNewTaskTimezonePickerElmt.tzName;
        let fmt = "yyyy-MM-dd HH:mm";
        let dtStart = DateTime.fromFormat(`${this.#runOnceNewTaskDatetimeStartPickerElmt.date} ${this.#runOnceNewTaskDatetimeStartPickerElmt.time}`, fmt, { zone: tzName, setZone: true });
        let dtEnd = DateTime.fromFormat(`${this.#runOnceNewTaskDatetimeEndPickerElmt.date} ${this.#runOnceNewTaskDatetimeEndPickerElmt.time}`, fmt, { zone: tzName, setZone: true });

        let payload = {
            "task_name": this.#runOnceNewTaskNameElmt.value,
            "campaign_id": this.#runOnceNewTaskCampaignElmt.value,
            "parameters": this.#runOnceNewTaskParametersElmt.value,
            "start_time": dtEnd.toISO(),
            "end_time": dtStart.toISO(),
        };

        this.#postRunOnceNewTaskReqID = this.#internalAPIRequester.post(
            app.urlFor(`api.tasks.run_once`),
            payload,
            (data) => {
                if (data.success) {
                    app.flashMessage(`${payload.task_name} task launched async!`, "success", 5);

                    successCallback?.();
                }
                else {
                    app.flashMessage(`An error occured while launching async ${payload.task_name} task!`, "error");
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    refresh() {
        this.#updateTaskList();
    }

    mount() {
        this.#loadAvailableRegisteredTasks();

        this.#getTaskOffsetUnits((data) => {
            this.#populateTaskOffsetUnitSelect(data);
        });

        let selectedCampaignId = app.campaignContext.has_campaign ? app.campaignContext.id : "all";

        this.#getCampaigns(() => {
            this.#populateCampaignSelect(this.#campaignSelectElmt, selectedCampaignId, true);
            this.#getCampaign(selectedCampaignId);
            this.#updateCampaignPanel();

            this.#updateFiltersPanelState();
            this.refresh();
        });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TaskListView();
    view.mount();
});

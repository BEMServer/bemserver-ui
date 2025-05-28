import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import "/static/scripts/modules/components/itemsCount.js";
import { ModalConfirm } from "/static/scripts/modules/components/modalConfirm.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import "/static/scripts/modules/components/time/tzPicker.js";
import { CampaignStatusInfoElement } from "/static/scripts/modules/components/campaigns/statusInfo.js";
import { DateTime } from "/static/scripts/modules/tools/time.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";


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
    #postRunOnceTaskReqID = null;
    #postRunOnceNewTaskReqID = null;

    #filtersCollapseElmt = null;
    #filtersCollapse = null;
    #taskStateFilterElmt = null;
    #campaignFilterElmt = null;
    #taskNameFilterElmt = null;
    #removeFiltersBtnElmt = null;
    #itemsCountElmt = null;
    #campaignInfoContainerElmt = null;
    #campaignInfoInnerContainerElmt = null;
    #campaignStatusContainerElmt = null;
    #campaignIsContextContainerElmt = null;
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
    #addTaskParametersErrorElmt = null;
    #addTaskScheduleContainerElmt = null;
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
    #editTaskStateContainerElmt = null;
    #editTaskParametersElmt = null;
    #editTaskParametersErrorElmt = null;
    #editTaskScheduleContainerElmt = null;
    #editTaskOffsetUnitElmt = null;
    #editTaskOffsetStartElmt = null;
    #editTaskOffsetEndElmt = null;
    #removeTaskModalBtnElmt = null;
    #editTaskModalBtnElmt = null;
    #runOnceTaskModalBtnElmt = null;
    #runOnceTaskParametersElmt = null;
    #runOnceTaskParametersErrorElmt = null;
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
    #runOnceNewTaskModal = null;
    #runOnceNewTaskCampaignElmt = null;
    #runOnceNewTaskNameElmt = null;
    #runOnceNewTaskParametersElmt = null;
    #runOnceNewTaskParametersErrorElmt = null;
    #runOnceNewTaskDatetimeStartPickerElmt = null;
    #runOnceNewTaskDatetimeEndPickerElmt = null;
    #runOnceNewTaskSetTimezoneLnkContainerElmt = null;
    #runOnceNewTaskSetTimezoneLnkElmt = null;
    #runOnceNewTaskSetTimezoneContainerElmt = null;
    #runOnceNewTaskTimezonePickerElmt = null;
    #runOnceNewTaskResetTimezoneLnkElmt = null;
    #runOnceNewTaskModalBtnElmt = null;
    #legendNotScheduledBadgeContainerElmt = null;
    #legendNotRegisteredBadgeContainerElmt = null;

    #availableRegisteredTasks = [];
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
        this.#taskStateFilterElmt = document.getElementById("taskState");
        this.#campaignFilterElmt = document.getElementById("campaigns");
        this.#taskNameFilterElmt = document.getElementById("taskNameFilter");
        this.#removeFiltersBtnElmt = document.getElementById("removeFiltersBtn");
        this.#itemsCountElmt = document.getElementById("itemsCount");
        this.#campaignInfoContainerElmt = document.getElementById("campaignInfoContainer");
        this.#campaignInfoInnerContainerElmt = document.getElementById("campaignInfoInnerContainer");
        this.#campaignStatusContainerElmt = document.getElementById("campaignStatusContainer");
        this.#campaignIsContextContainerElmt = document.getElementById("campaignIsContextContainer");
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
        this.#addTaskParametersErrorElmt = document.getElementById("addTaskParametersError");
        this.#addTaskScheduleContainerElmt = document.getElementById("addTaskScheduleContainer");
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
        this.#editTaskStateContainerElmt = document.getElementById("editTaskStateContainer");
        this.#editTaskParametersElmt = document.getElementById("editTaskParameters");
        this.#editTaskParametersErrorElmt = document.getElementById("editTaskParametersError");
        this.#editTaskScheduleContainerElmt = document.getElementById("editTaskScheduleContainer");
        this.#editTaskOffsetUnitElmt = document.getElementById("editTaskOffsetUnit");
        this.#editTaskOffsetStartElmt = document.getElementById("editTaskOffsetStart");
        this.#editTaskOffsetEndElmt = document.getElementById("editTaskOffsetEnd");
        this.#editTaskModalBtnElmt = document.getElementById("editTaskModalBtn");
        this.#removeTaskModalBtnElmt = document.getElementById("removeTaskModalBtn");
        this.#runOnceTaskModalBtnElmt = document.getElementById("runOnceTaskModalBtn");
        this.#runOnceTaskParametersElmt = document.getElementById("runOnceTaskParameters");
        this.#runOnceTaskParametersErrorElmt = document.getElementById("runOnceTaskParametersError");
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
        this.#runOnceNewTaskModal = new bootstrap.Modal(this.#runOnceNewTaskModalElmt);
        this.#runOnceNewTaskCampaignElmt = document.getElementById("runOnceNewTaskCampaign");
        this.#runOnceNewTaskNameElmt = document.getElementById("runOnceNewTaskName");
        this.#runOnceNewTaskParametersElmt = document.getElementById("runOnceNewTaskParameters");
        this.#runOnceNewTaskParametersErrorElmt = document.getElementById("runOnceNewTaskParametersError");
        this.#runOnceNewTaskDatetimeStartPickerElmt = document.getElementById("runOnceNewTaskDatetimeStart");
        this.#runOnceNewTaskDatetimeEndPickerElmt = document.getElementById("runOnceNewTaskDatetimeEnd");
        this.#runOnceNewTaskSetTimezoneLnkContainerElmt = document.getElementById("runOnceNewTaskSetTimezoneLnkContainer");
        this.#runOnceNewTaskSetTimezoneLnkElmt = document.getElementById("runOnceNewTaskSetTimezoneLnk");
        this.#runOnceNewTaskSetTimezoneContainerElmt = document.getElementById("runOnceNewTaskSetTimezoneContainer");
        this.#runOnceNewTaskTimezonePickerElmt = document.getElementById("runOnceNewTaskTimezonePicker");
        this.#runOnceNewTaskResetTimezoneLnkElmt = document.getElementById("runOnceNewTaskResetTimezoneLnk");
        this.#runOnceNewTaskModalBtnElmt = document.getElementById("runOnceNewTaskModalBtn");
        this.#legendNotScheduledBadgeContainerElmt = document.getElementById("legendNotScheduledBadgeContainer");
        this.#legendNotRegisteredBadgeContainerElmt = document.getElementById("legendNotRegisteredBadgeContainer");
    }

    #initEventListeners() {
        this.#taskStateFilterElmt.addEventListener("change", () => {
            this.#updateFiltersPanelState();
            this.refresh();
        });

        this.#campaignFilterElmt.addEventListener("change", () => {
            this.#getCampaign(this.#campaignFilterElmt.value, () => { this.#updateCampaignPanel(); });

            this.#updateFiltersPanelState();
            this.refresh();
        });

        this.#taskNameFilterElmt.addEventListener("change", () => {
            this.#updateFiltersPanelState();
            this.refresh();
        });

        this.#removeFiltersBtnElmt.addEventListener("click", () => {
            let hasFilterChanged = false;
            if (this.#taskStateFilterElmt.value != this.#taskStateFilterElmt.getAttribute("data-default")) {
                this.#taskStateFilterElmt.value = this.#taskStateFilterElmt.getAttribute("data-default");
                hasFilterChanged = true;
            }

            if (this.#campaignFilterElmt.value != this.#campaignFilterElmt.getAttribute("data-default")) {
                this.#campaignFilterElmt.value = this.#campaignFilterElmt.getAttribute("data-default");
                hasFilterChanged = true;
            }

            if (this.#taskNameFilterElmt.value != this.#taskNameFilterElmt.getAttribute("data-default")) {
                this.#taskNameFilterElmt.value = this.#taskNameFilterElmt.getAttribute("data-default");
                hasFilterChanged = true;
            }

            this.#getCampaign(this.#campaignFilterElmt.value, () => { this.#updateCampaignPanel(); });
            this.#updateFiltersPanelState();

            if (hasFilterChanged) {
                this.refresh();
            }
        });

        this.#addTaskModalElmt.addEventListener("show.bs.modal", () => {
            let selectedCampaignId = this.#campaignFilterElmt.value != "all" ? this.#campaignFilterElmt.value : (app.campaignContext.has_campaign ? app.campaignContext.id : (this.#availableCampaigns.length > 0 ? Object.keys(this.#availableCampaigns)[0] : null));
            this.#populateCampaignSelect(this.#addTaskCampaignElmt, selectedCampaignId);
            this.#addTaskStateSwitchElmt.checked = true;
            this.#populateTaskNameSelect(this.#addTaskNameElmt);

            this.#updateAddTaskModalWithRegisteredTaskDefaults(this.#addTaskNameElmt.value);

            // Disabled only if selected campaign == filter.
            if (this.#campaignFilterElmt.value == selectedCampaignId) {
                this.#addTaskCampaignElmt.setAttribute("disabled", true);
            }
            else {
                this.#addTaskCampaignElmt.removeAttribute("disabled");
            }

            this.#addTaskOffsetUnitElmt.selectedIndex = 0;
            this.#addTaskOffsetStartElmt.removeAttribute("max");
            this.#addTaskOffsetStartElmt.value = null;
            this.#addTaskOffsetEndElmt.removeAttribute("min");
            this.#addTaskOffsetEndElmt.value = null;

            this.#updateAddTaskModalBtnState();
        });

        this.#addTaskNameElmt.addEventListener("change", () => {
            this.#updateAddTaskModalWithRegisteredTaskDefaults(this.#addTaskNameElmt.value);
        });

        this.#addTaskModalBtnElmt.addEventListener("click", () => {
            this.#createTask(() => {
                this.#addTaskModal.hide();
                this.#updateTaskList();
            });
        });

        this.#addTaskOffsetStartElmt.addEventListener("input", debounce(() => {
            this.#addTaskOffsetEndElmt.setAttribute("min", this.#addTaskOffsetStartElmt.value);
            this.#updateAddTaskModalBtnState();
        }, 300));

        this.#addTaskOffsetEndElmt.addEventListener("input", debounce(() => {
            this.#addTaskOffsetStartElmt.setAttribute("max", this.#addTaskOffsetEndElmt.value);
            this.#updateAddTaskModalBtnState();
        }, 300));

        this.#addTaskParametersElmt.addEventListener("input", debounce(() => {
            this.#updateAddTaskModalBtnState();
        }, 400));

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

            this.#updateEditTaskModalWithRegisteredTaskDefaults(this.#selectedTask.task_name);

            this.#editTaskStateContainerElmt.innerHTML = "";
            if (!this.#selectedTask["is_registered"]) {
                let badgeNotRegisteredElmt = this.#createNotRegisteredBadgeElement();
                this.#editTaskStateContainerElmt.appendChild(badgeNotRegisteredElmt);
            }

            this.#editTaskIdElmt.textContent = `# ${this.#selectedTask.id}`;
            this.#editTaskCampaignElmt.textContent = taskCampaign.name;
            this.#editTaskStateSwitchElmt.checked = this.#selectedTask.is_enabled;
            this.#editTaskNameElmt.textContent = this.#selectedTask.task_name;
            this.#editTaskParametersElmt.value = this.#selectedTask.parameters;

            this.#editTaskOffsetUnitElmt.value = this.#selectedTask.offset_unit;
            this.#editTaskOffsetStartElmt.value = this.#selectedTask.start_offset;
            this.#editTaskOffsetEndElmt.value = this.#selectedTask.end_offset;
            this.#editTaskOffsetStartElmt.setAttribute("max", this.#selectedTask.end_offset);
            this.#editTaskOffsetEndElmt.setAttribute("min", this.#selectedTask.start_offset);

            this.#runOnceTaskParametersElmt.value = this.#selectedTask.parameters;

            this.#runOnceTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceTaskDatetimeStartPickerElmt.reset();
            this.#runOnceTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceTaskDatetimeEndPickerElmt.reset();
            this.#runOnceTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#updateRunOnceTaskSetTimezoneVisibility(false);

            this.#updateEditTaskModalBtnState();

            this.#editTab.show();
            this.#updateRunOnceTabState();
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
            this.#updateEditTaskModalBtnState();
            this.#editTaskModalBtnElmt.classList.remove("d-none", "invisible");
            this.#runOnceTaskModalBtnElmt.setAttribute("disabled", true);
            this.#runOnceTaskModalBtnElmt.classList.add("d-none", "invisible");
        });

        this.#editTaskOffsetStartElmt.addEventListener("input", debounce(() => {
            this.#editTaskOffsetEndElmt.setAttribute("min", this.#editTaskOffsetStartElmt.value);
            this.#updateEditTaskModalBtnState();
        }, 300));

        this.#editTaskOffsetEndElmt.addEventListener("input", debounce(() => {
            this.#editTaskOffsetStartElmt.setAttribute("max", this.#editTaskOffsetEndElmt.value);
            this.#updateEditTaskModalBtnState();
        }, 300));

        this.#editTaskParametersElmt.addEventListener("input", debounce(() => {
            this.#updateEditTaskModalBtnState();
        }, 400));

        this.#runOnceTabElmt.addEventListener("show.bs.tab", () => {
            this.#removeTaskModalBtnElmt.setAttribute("disabled", true);
            this.#editTaskModalBtnElmt.setAttribute("disabled", true);
            this.#editTaskModalBtnElmt.classList.add("d-none", "invisible");
            this.#updateRunOnceTaskModalBtnState();
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

        this.#runOnceTaskDatetimeStartPickerElmt.addEventListener("datetimeChange", () => {
            this.#updateRunOnceTaskModalBtnState();
        });

        this.#runOnceTaskDatetimeEndPickerElmt.addEventListener("datetimeChange", () => {
            this.#updateRunOnceTaskModalBtnState();
        });

        this.#runOnceTaskDatetimeStartPickerElmt.addEventListener("dateChange", () => {
            this.#runOnceTaskDatetimeEndPickerElmt.dateMin = this.#runOnceTaskDatetimeStartPickerElmt.date;
        });

        this.#runOnceTaskDatetimeEndPickerElmt.addEventListener("dateChange", () => {
            this.#runOnceTaskDatetimeStartPickerElmt.dateMax = this.#runOnceTaskDatetimeEndPickerElmt.date;
        });

        this.#runOnceTaskParametersElmt.addEventListener("input", debounce(() => {
            this.#updateRunOnceTaskModalBtnState();
        }, 400));

        this.#runOnceTaskModalBtnElmt.addEventListener("click", () => {
            this.#runOnceTask(() => {
                this.#editTaskModal.hide();
            });
        });

        this.#runOnceNewTaskModalElmt.addEventListener("show.bs.modal", () => {
            let selectedCampaignId = this.#campaignFilterElmt.value != "all" ? this.#campaignFilterElmt.value : (app.campaignContext.has_campaign ? app.campaignContext.id : Object.keys(this.#availableCampaigns)[0]);
            this.#populateCampaignSelect(this.#runOnceNewTaskCampaignElmt, selectedCampaignId);

            let taskCampaign = this.#availableCampaigns[selectedCampaignId];

            this.#runOnceNewTaskTimezonePickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceNewTaskDatetimeStartPickerElmt.reset();
            this.#runOnceNewTaskDatetimeStartPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#runOnceNewTaskDatetimeEndPickerElmt.reset();
            this.#runOnceNewTaskDatetimeEndPickerElmt.tzName = taskCampaign["timezone_info"]["name"];
            this.#updateRunOnceNewTaskSetTimezoneVisibility(false);
            this.#populateTaskNameSelect(this.#runOnceNewTaskNameElmt);

            this.#updateRunOnceNewTaskModalWithRegisteredTaskDefaults(this.#runOnceNewTaskNameElmt.value);

            this.#updateRunOnceNewTaskModalBtnState();
        });

        this.#runOnceNewTaskCampaignElmt.addEventListener("change", () => {
            this.#updateRunOnceNewTaskTimezone();
        });

        this.#runOnceNewTaskNameElmt.addEventListener("change", () => {
            this.#updateRunOnceNewTaskModalWithRegisteredTaskDefaults(this.#runOnceNewTaskNameElmt.value);
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

        this.#runOnceNewTaskDatetimeStartPickerElmt.addEventListener("datetimeChange", () => {
            this.#updateRunOnceNewTaskModalBtnState();
        });

        this.#runOnceNewTaskDatetimeEndPickerElmt.addEventListener("datetimeChange", () => {
            this.#updateRunOnceNewTaskModalBtnState();
        });

        this.#runOnceNewTaskDatetimeStartPickerElmt.addEventListener("dateChange", () => {
            this.#runOnceNewTaskDatetimeEndPickerElmt.dateMin = this.#runOnceNewTaskDatetimeStartPickerElmt.date;
        });

        this.#runOnceNewTaskDatetimeEndPickerElmt.addEventListener("dateChange", () => {
            this.#runOnceNewTaskDatetimeStartPickerElmt.dateMax = this.#runOnceNewTaskDatetimeEndPickerElmt.date;
        });

        this.#runOnceNewTaskParametersElmt.addEventListener("input", debounce(() => {
            this.#updateRunOnceNewTaskModalBtnState();
        }, 400));

        this.#runOnceNewTaskModalBtnElmt.addEventListener("click", () => {
            this.#runOnceNewTask(() => {
                this.#runOnceNewTaskModal.hide();
            });
        });
    }

    #isStringValidJson(value, jsonValidCallback = null, jsonInvalidCallback = null) {
        let result = false;
        try {
            JSON.parse(value);
            result = true;
            jsonValidCallback?.();
        }
        catch (error) {
            jsonInvalidCallback?.(error);
        }
        return result;
    }

    #isAddTaskValid(parametersJsonValidCallback = null, parametersJsonInvalidCallback = null) {
        let isJsonParametersValid = this.#isStringValidJson(this.#addTaskParametersElmt.value, parametersJsonValidCallback, parametersJsonInvalidCallback);
        return (
            this.#addTaskOffsetStartElmt.validity.valid && this.#addTaskOffsetEndElmt.validity.valid
            && isJsonParametersValid
        );
    }

    #isEditTaskValid(parametersJsonValidCallback = null, parametersJsonInvalidCallback = null) {
        let isJsonParametersValid = this.#isStringValidJson(this.#editTaskParametersElmt.value, parametersJsonValidCallback, parametersJsonInvalidCallback);
        return (
            this.#selectedTask != null && this.#selectedTaskEtag != null
            && this.#editTaskOffsetStartElmt.validity.valid && this.#editTaskOffsetEndElmt.validity.valid
            && isJsonParametersValid
        );
    }

    #isRunOnceTaskValid(parametersJsonValidCallback = null, parametersJsonInvalidCallback = null) {
        let isJsonParametersValid = this.#isStringValidJson(this.#runOnceTaskParametersElmt.value, parametersJsonValidCallback, parametersJsonInvalidCallback);
        return (
            this.#runOnceTaskDatetimeStartPickerElmt.isValid && this.#runOnceTaskDatetimeEndPickerElmt.isValid
            && isJsonParametersValid
        );
    }

    #isRunOnceNewTaskValid(parametersJsonValidCallback = null, parametersJsonInvalidCallback = null) {
        let isJsonParametersValid = this.#isStringValidJson(this.#runOnceNewTaskParametersElmt.value, parametersJsonValidCallback, parametersJsonInvalidCallback);
        return (
            this.#runOnceNewTaskDatetimeStartPickerElmt.isValid && this.#runOnceNewTaskDatetimeEndPickerElmt.isValid
            && isJsonParametersValid
        );
    }

    #updateAddTaskModalWithRegisteredTaskDefaults(taskName) {
        let registeredTask = this.#getRegisteredTask(taskName);
        if (registeredTask != null) {
            this.#addTaskParametersElmt.value = registeredTask["default_parameters"];
            this.#populateTaskSchedule(this.#addTaskScheduleContainerElmt, registeredTask["schedule"]);
        }
        else {
            this.#addTaskParametersElmt.value = null;
            this.#populateTaskSchedule(this.#addTaskScheduleContainerElmt, {});
        }
    }

    #updateAddTaskModalBtnState() {
        if (this.#isAddTaskValid(
            () => {
                this.#addTaskParametersElmt.classList.remove("app-input-invalid");
                this.#addTaskParametersErrorElmt.textContent = "";
                this.#addTaskParametersErrorElmt.classList.add("d-none", "invisible");
            },
            (error) => {
                this.#addTaskParametersElmt.classList.add("app-input-invalid");
                this.#addTaskParametersErrorElmt.textContent = error;
                this.#addTaskParametersErrorElmt.classList.remove("d-none", "invisible");
            },
        )) {
            this.#addTaskModalBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#addTaskModalBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateEditTaskModalWithRegisteredTaskDefaults(taskName) {
        let registeredTask = this.#getRegisteredTask(taskName);
        if (registeredTask != null) {
            this.#populateTaskSchedule(this.#editTaskScheduleContainerElmt, registeredTask["schedule"]);
        }
        else {
            this.#populateTaskSchedule(this.#editTaskScheduleContainerElmt, {});
        }
    }

    #updateEditTaskModalBtnState() {
        if (this.#isEditTaskValid(
            () => {
                this.#editTaskParametersElmt.classList.remove("app-input-invalid");
                this.#editTaskParametersErrorElmt.textContent = "";
                this.#editTaskParametersErrorElmt.classList.add("d-none", "invisible");
            },
            (error) => {
                this.#editTaskParametersElmt.classList.add("app-input-invalid");
                this.#editTaskParametersErrorElmt.textContent = error;
                this.#editTaskParametersErrorElmt.classList.remove("d-none", "invisible");
            },
        )) {
            this.#editTaskModalBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#editTaskModalBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateRunOnceTabState() {
        let registeredTaskNames = this.#availableRegisteredTasks.map((registeredTask) => { return registeredTask.name; });
        if (!registeredTaskNames.includes(this.#selectedTask.task_name)) {
            this.#runOnceTabElmt.classList.add("disabled");
            this.#runOnceTabElmt.setAttribute("aria-disabled", true);
        }
        else {
            this.#runOnceTabElmt.classList.remove("disabled");
            this.#runOnceTabElmt.removeAttribute("aria-disabled");
        }
    }

    #updateRunOnceTaskModalBtnState() {
        if (this.#isRunOnceTaskValid(
            () => {
                this.#runOnceTaskParametersElmt.classList.remove("app-input-invalid");
                this.#runOnceTaskParametersErrorElmt.textContent = "";
                this.#runOnceTaskParametersErrorElmt.classList.add("d-none", "invisible");
            },
            (error) => {
                this.#runOnceTaskParametersElmt.classList.add("app-input-invalid");
                this.#runOnceTaskParametersErrorElmt.textContent = error;
                this.#runOnceTaskParametersErrorElmt.classList.remove("d-none", "invisible");
            },
        )) {
            this.#runOnceTaskModalBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#runOnceTaskModalBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateRunOnceNewTaskModalWithRegisteredTaskDefaults(taskName) {
        let registeredTask = this.#getRegisteredTask(taskName);
        if (registeredTask != null) {
            this.#runOnceNewTaskParametersElmt.value = registeredTask["default_parameters"];
        }
        else {
            this.#runOnceNewTaskParametersElmt.value = null;
        }
    }

    #updateRunOnceNewTaskModalBtnState() {
        if (this.#isRunOnceNewTaskValid(
            () => {
                this.#runOnceNewTaskParametersElmt.classList.remove("app-input-invalid");
                this.#runOnceNewTaskParametersErrorElmt.textContent = "";
                this.#runOnceNewTaskParametersErrorElmt.classList.add("d-none", "invisible");
            },
            (error) => {
                this.#runOnceNewTaskParametersElmt.classList.add("app-input-invalid");
                this.#runOnceNewTaskParametersErrorElmt.textContent = error;
                this.#runOnceNewTaskParametersErrorElmt.classList.remove("d-none", "invisible");
            },
        )) {
            this.#runOnceNewTaskModalBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#runOnceNewTaskModalBtnElmt.setAttribute("disabled", true);
        }
    }

    #updateFiltersPanelState() {
        this.#updateSelectFilter(this.#taskStateFilterElmt);
        this.#updateSelectFilter(this.#campaignFilterElmt);
        this.#updateSelectFilter(this.#taskNameFilterElmt);

        let hasFilters = (
            this.#taskStateFilterElmt.value != this.#taskStateFilterElmt.getAttribute("data-default")
            || this.#campaignFilterElmt.value != this.#campaignFilterElmt.getAttribute("data-default")
            || this.#taskNameFilterElmt.value != this.#taskNameFilterElmt.getAttribute("data-default")
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
        if (this.#selectedCampaign == null || app.campaignContext.has_campaign && app.campaignContext.id == this.#selectedCampaign?.id) {
            this.#campaignInfoContainerElmt.classList.add("d-none", "invisible");
            return;
        }
        else {
            this.#campaignInfoContainerElmt.classList.remove("d-none", "invisible");
        }

        let campaignStatusInfoElmt = new CampaignStatusInfoElement({ renderStyle: "bullet", status: this.#selectedCampaign["state"], label: this.#selectedCampaign["name"] });
        this.#campaignStatusContainerElmt.innerHTML = "";
        this.#campaignStatusContainerElmt.appendChild(campaignStatusInfoElmt);

        if (app.campaignContext.has_campaign && app.campaignContext.id == this.#selectedCampaign.id) {
            this.#campaignInfoInnerContainerElmt.classList.add("border-start", "border-5", "border-top-0", "border-end-0", "border-bottom-0", "app-campaign-selected");
            this.#campaignIsContextContainerElmt.classList.remove("d-none", "invisible");
        }
        else {
            this.#campaignInfoInnerContainerElmt.classList.remove("border-start", "border-5", "border-top-0", "border-end-0", "border-bottom-0", "app-campaign-selected");
            this.#campaignIsContextContainerElmt.classList.add("d-none", "invisible");
        }

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

        let filters = {
            "task_state": this.#taskStateFilterElmt.value,
            "campaign": this.#campaignFilterElmt.value,
            "task_name": this.#taskNameFilterElmt.value,
        };

        this.#getTasksReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.retrieve_list`, filters),
            (data) => {
                let tasks = data.data.map((task) => {
                    return this.#extendTaskData(task);
                });

                this.#populateTaskList(tasks);
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    #extendTaskData(task) {
        let registeredTask = this.#getRegisteredTask(task.task_name);
        task["is_registered"] = registeredTask != null;
        task["is_scheduled"] = registeredTask != null ? Object.keys(registeredTask["schedule"]).length > 0 : false;
        return task;
    }

    #getRegisteredTask(taskName) {
        for (let registeredTask of this.#availableRegisteredTasks) {
            if (registeredTask.name == taskName) {
                return registeredTask;
            }
        }
        return null;
    }

    #populateTaskList(tasks) {
        let tableColumns = [].slice.call(this.#tasksTableHeaderElmt.rows[0].cells);
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
                    if (attrName == "is_enabled") {
                        let badgeStateElmt = document.createElement("span");
                        badgeStateElmt.classList.add("badge", "rounded-pill", task.is_enabled ? "text-bg-success" : "text-bg-secondary");
                        badgeStateElmt.textContent = task.is_enabled ? "enabled" : "disabled";
                        cellElmt.appendChild(badgeStateElmt);
                    }
                    else if (attrName == "campaign_id") {
                        cellElmt.textContent = this.#availableCampaigns[task[attrName]].name;
                    }
                    else if (attrName == "task_state") {
                        let cellInnerContainerElmt = document.createElement("div");
                        cellInnerContainerElmt.classList.add("d-flex", "align-items-stretch", "gap-2");
                        cellElmt.appendChild(cellInnerContainerElmt);
                        if (!task["is_registered"]) {
                            let badgeNotRegisteredElmt = this.#createNotRegisteredBadgeElement();
                            cellInnerContainerElmt.appendChild(badgeNotRegisteredElmt);
                        }
                        else if (!task["is_scheduled"]) {
                            let badgeNotScheduledElmt = this.#createNotScheduledBadgeElement();
                            cellInnerContainerElmt.appendChild(badgeNotScheduledElmt);
                        }
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
    }

    #createNotRegisteredBadgeElement() {
        let badgeNotRegisteredElmt = document.createElement("span");
        badgeNotRegisteredElmt.classList.add("badge", "rounded-pill", "text-bg-danger");
        badgeNotRegisteredElmt.textContent = "not registered";
        return badgeNotRegisteredElmt;
    }

    #createNotScheduledBadgeElement() {
        let badgeNotScheduledElmt = document.createElement("span");
        badgeNotScheduledElmt.classList.add("badge", "rounded-pill", "text-bg-warning");
        badgeNotScheduledElmt.textContent = "not scheduled";
        return badgeNotScheduledElmt;
    }

    #populateTaskSchedule(containerElement, scheduleData) {
        containerElement.innerHTML = "";
        if (Object.keys(scheduleData).length > 0) {
            let scheduleTableContainerElmt = document.createElement("div");
            scheduleTableContainerElmt.classList.add("table-responsive");
            containerElement.appendChild(scheduleTableContainerElmt);

            let scheduleTableElmt = document.createElement("table");
            scheduleTableElmt.classList.add("table", "table-sm", "table-borderless");
            scheduleTableContainerElmt.appendChild(scheduleTableElmt);

            let scheduleTableBodyElmt = document.createElement("tbody");
            scheduleTableElmt.appendChild(scheduleTableBodyElmt);

            for (let [scheduleName, scheduleInfo] of Object.entries(scheduleData)) {
                let scheduleRowElmt = document.createElement("tr");
                scheduleTableBodyElmt.appendChild(scheduleRowElmt);

                let scheduleCellNameElmt = document.createElement("td");
                scheduleCellNameElmt.classList.add("w-25");
                scheduleCellNameElmt.textContent = scheduleName;
                scheduleRowElmt.appendChild(scheduleCellNameElmt);

                let scheduleCellInfoElmt = document.createElement("td");
                scheduleCellInfoElmt.textContent = scheduleInfo;
                scheduleRowElmt.appendChild(scheduleCellInfoElmt);
            }
        }
        else {
            let badgeNotScheduledElmt = this.#createNotScheduledBadgeElement();
            containerElement.appendChild(badgeNotScheduledElmt);
        }
    }

    #populateTaskNameSelect(selectElement, addAllOption = false) {
        let registeredTaskNames = this.#availableRegisteredTasks.map((registeredTask) => { return registeredTask.name; });

        let defaultSelectedElement = selectElement.getAttribute("data-default");

        selectElement.innerHTML = "";
        if (addAllOption) {
            let optElmt = document.createElement("option");
            optElmt.value = "all";
            optElmt.text = "All tasks";
            if (optElmt.value == defaultSelectedElement) {
                optElmt.setAttribute("selected", true);
            }
            selectElement.appendChild(optElmt);
        }
        for (let registeredTaskName of registeredTaskNames) {
            let optElmt = document.createElement("option");
            optElmt.value = registeredTaskName;
            optElmt.text = registeredTaskName;
            if (optElmt.value == defaultSelectedElement) {
                optElmt.setAttribute("selected", true);
            }
            selectElement.appendChild(optElmt);
        }
    }

    #populateCampaignSelect(selectElement, defaultSelectedElement = null, addAllOption = false) {
        selectElement.innerHTML = "";
        if (addAllOption) {
            let optElmt = document.createElement("option");
            optElmt.value = "all";
            optElmt.text = "All campaigns";
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

        if (app.campaignContext.has_campaign && app.campaignContext.id == this.#selectedCampaign?.id) {
            selectElement.setAttribute("disabled", true);
        }
        else {
            selectElement.removeAttribute("disabled");
        }
    }

    #populateTaskOffsetUnitSelect(selectElement, data) {
        selectElement.innerHTML = "";
        for (let offsetUnit of data) {
            let optElmt = document.createElement("option");
            optElmt.value = offsetUnit;
            optElmt.text = offsetUnit;
            selectElement.appendChild(optElmt);
        }
    }

    #loadAvailableRegisteredTasks(successCallback = null) {
        this.#availableRegisteredTasks = [];

        if (this.#getTaskNamesReqID != null) {
            this.#internalAPIRequester.abort(this.#getTaskNamesReqID);
            this.#getTaskNamesReqID = null;
        }

        this.#getTaskNamesReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.tasks.retrieve_registered`),
            (data) => {
                this.#availableRegisteredTasks = data.map((registeredTask) => {
                    registeredTask["default_parameters"] = JSON.stringify(registeredTask["default_parameters"]);
                    return registeredTask;
                });

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
                this.#selectedTask = this.#extendTaskData(data.data);
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

        if (!this.#isAddTaskValid(null, (error) => {
            app.flashMessage(error, "error");
        })) return;

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
        if (this.#updateTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#updateTaskReqID);
            this.#updateTaskReqID = null;
        }

        if (!this.#isEditTaskValid(null, (error) => {
            app.flashMessage(error, "error");
        })) return;

        let payload = {
            is_enabled: this.#editTaskStateSwitchElmt.checked,
            parameters: this.#editTaskParametersElmt.value,
            offset_unit: this.#editTaskOffsetUnitElmt.value,
            start_offset: this.#editTaskOffsetStartElmt.value,
            end_offset: this.#editTaskOffsetEndElmt.value,
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
        if (this.#deleteTaskReqID != null) {
            this.#internalAPIRequester.abort(this.#deleteTaskReqID);
            this.#deleteTaskReqID = null;
        }

        if (this.#selectedTask == null || this.#selectedTaskEtag == null) return;

        app.flashMessage(`Removing ${this.#selectedTask.task_name} task.`, "info", 5);

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

    #runOnceTask(successCallback = null) {
        if (!this.#isRunOnceTaskValid(null, (error) => {
            app.flashMessage(error, "error");
        })) return;

        let tzName = this.#runOnceTaskTimezonePickerElmt.tzName;
        let fmt = "yyyy-MM-dd HH:mm";
        let dtStart = DateTime.fromFormat(`${this.#runOnceTaskDatetimeStartPickerElmt.date} ${this.#runOnceTaskDatetimeStartPickerElmt.time}`, fmt, { zone: tzName, setZone: true });
        let dtEnd = DateTime.fromFormat(`${this.#runOnceTaskDatetimeEndPickerElmt.date} ${this.#runOnceTaskDatetimeEndPickerElmt.time}`, fmt, { zone: tzName, setZone: true });

        let payload = {
            "task_name": this.#selectedTask.task_name,
            "campaign_id": this.#selectedTask.campaign_id,
            "parameters": this.#runOnceTaskParametersElmt.value,
            "start_time": dtStart.toISO(),
            "end_time": dtEnd.toISO(),
        };

        this.#postRunOnceTaskReqID = this.#postRunTask(
            payload,
            this.#postRunOnceTaskReqID,
            () => {
                app.flashMessage(`${this.#selectedTask.task_name} (#${this.#selectedTask.id}) task launched async!`, "success");
                successCallback?.();
            },
            () => {
                app.flashMessage(`An error occured while launching async ${this.#selectedTask.task_name} (#${this.#selectedTask.id}) task!`, "error");
            },
        );
    }

    #runOnceNewTask(successCallback = null) {
        if (!this.#isRunOnceNewTaskValid(null, (error) => {
            app.flashMessage(error, "error");
        })) return;

        let tzName = this.#runOnceNewTaskTimezonePickerElmt.tzName;
        let fmt = "yyyy-MM-dd HH:mm";
        let dtStart = DateTime.fromFormat(`${this.#runOnceNewTaskDatetimeStartPickerElmt.date} ${this.#runOnceNewTaskDatetimeStartPickerElmt.time}`, fmt, { zone: tzName, setZone: true });
        let dtEnd = DateTime.fromFormat(`${this.#runOnceNewTaskDatetimeEndPickerElmt.date} ${this.#runOnceNewTaskDatetimeEndPickerElmt.time}`, fmt, { zone: tzName, setZone: true });

        let payload = {
            "task_name": this.#runOnceNewTaskNameElmt.value,
            "campaign_id": this.#runOnceNewTaskCampaignElmt.value,
            "parameters": this.#runOnceNewTaskParametersElmt.value,
            "start_time": dtStart.toISO(),
            "end_time": dtEnd.toISO(),
        };

        this.#postRunOnceNewTaskReqID = this.#postRunTask(
            payload,
            this.#postRunOnceNewTaskReqID,
            () => {
                app.flashMessage(`New ${payload.task_name} task launched async!`, "success");
                successCallback?.();
            },
            () => {
                app.flashMessage(`An error occured while launching async a new ${payload.task_name} task!`, "error");
            },
        );
    }

    #postRunTask(payload, reqId, successCallback = null, failureCallback = null) {
        if (reqId != null) {
            this.#internalAPIRequester.abort(reqId);
            reqId = null;
        }

        return this.#internalAPIRequester.post(
            app.urlFor(`api.tasks.run_once`),
            payload,
            (data) => {
                if (data.success) {
                    successCallback?.();
                }
                else {
                    failureCallback?.();
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
        this.#legendNotScheduledBadgeContainerElmt.innerHTML = "";
        this.#legendNotScheduledBadgeContainerElmt.appendChild(this.#createNotScheduledBadgeElement());
        this.#legendNotRegisteredBadgeContainerElmt.innerHTML = "";
        this.#legendNotRegisteredBadgeContainerElmt.appendChild(this.#createNotRegisteredBadgeElement());

        this.#loadAvailableRegisteredTasks(() => {
            this.#populateTaskNameSelect(this.#taskNameFilterElmt, true);
        });

        this.#getTaskOffsetUnits((data) => {
            this.#populateTaskOffsetUnitSelect(this.#addTaskOffsetUnitElmt, data);
            this.#populateTaskOffsetUnitSelect(this.#editTaskOffsetUnitElmt, data);
        });

        let selectedCampaignId = app.campaignContext.has_campaign ? app.campaignContext.id : "all";

        this.#getCampaigns(() => {
            this.#getCampaign(selectedCampaignId);
            this.#populateCampaignSelect(this.#campaignFilterElmt, selectedCampaignId, true);
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

import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import { TimeseriesChartExplore, TimeseriesChartSeriesOptions, SeriesYAxisPositions, SeriesTypes, SeriesLineStyles } from "/static/scripts/modules/components/charts/tsChartExplore.js";
import "/static/scripts/modules/components/time/datetimePicker.js";
import { debounce } from "/static/scripts/modules/tools/utils.js";


class TimeSeriesDataExploreStatesView {

    #internalAPIRequester = null;
    #tsDataGetByDataStateReqIDs = [];

    #chartContainerElmt = null;

    #timeseriesElmt = null;
    #periodTypeElmt = null;
    #periodCustomElmt = null;
    #periodStartDatetimeElmt = null;
    #periodEndDatetimeElmt = null;
    #tsDataStates1SelectElmt = null;
    #tsDataStates2SelectElmt = null;

    #chartExplore = null;
    #tsSelector = null;

    #endDateCustomBackup = null;
    #endTimeCustomBackup = null;

    #periodTypeLoaded = null;
    #tsSeriesOptionsByDataState = {};
    #previousTsDataStateId1 = null;
    #previousTsDataStateId2 = null;

    constructor() {
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorExploreStates");
        this.#chartContainerElmt = document.getElementById("chartContainer");

        this.#tsDataStates1SelectElmt = document.getElementById("data_states_1");
        this.#tsDataStates2SelectElmt = document.getElementById("data_states_2");
        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodCustomElmt = document.getElementById("periodCustom");
        this.#periodStartDatetimeElmt = document.getElementById("start_datetime");
        this.#periodEndDatetimeElmt = document.getElementById("end_datetime");
        this.#timeseriesElmt = document.getElementById("timeseries");
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("clearSelection", (event) => {
            event.preventDefault();

            this.#chartExplore.clearAll();
            this.#tsSeriesOptionsByDataState = {};
            this.#updateSelectedTimeseriesInfo();
            this.#updateUrlParams();
        });

        this.#tsSelector.addEventListener("removeItem", (event) => {
            let tsID = event.detail.timeseries.id;
            for (let tsDataStateID of Object.keys(this.#tsSeriesOptionsByDataState)) {
                if (this.#tsSeriesOptionsByDataState[tsDataStateID][tsID] != null) {
                    let seriesID = this.#tsSeriesOptionsByDataState[tsDataStateID][tsID].seriesID;
                    this.#chartExplore.removeSeries(seriesID);
                    delete this.#tsSeriesOptionsByDataState[tsDataStateID][tsID];
                }
            }
            this.#updateSelectedTimeseriesInfo();
            this.#updateUrlParams();
        });

        this.#tsSelector.addEventListener("closePanel", () => {
            let curTsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "").slice().sort();
            let newTsIDs = this.#tsSelector.selectedItems.map(ts => ts.id.toString()).slice().sort();

            let needUpdate = JSON.stringify(curTsIDs) != JSON.stringify(newTsIDs);
            if (needUpdate) {
                let tsIDsToRemove = curTsIDs.filter(curTsID => !newTsIDs.includes(curTsID));
                for (let tsID of tsIDsToRemove) {
                    for (let tsDataStateID of Object.keys(this.#tsSeriesOptionsByDataState)) {
                        let seriesID = this.#tsSeriesOptionsByDataState[tsDataStateID][tsID].seriesID;
                        this.#chartExplore.removeSeries(seriesID);
                        delete this.#tsSeriesOptionsByDataState[tsDataStateID][tsID];
                    }
                }

                this.#timeseriesElmt.value = newTsIDs.join();

                this.#addTimeseries(this.#tsSelector.selectedItems);
            }
        });

        this.#periodTypeElmt.addEventListener("change", () => {
            this.#updatePeriodCustomState();
            if (this.#periodTypeElmt.value != this.#periodTypeLoaded) {
                this.#loadChartSeries();
            }
        });

        this.#periodStartDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodEndDatetimeElmt.dateMin = this.#periodStartDatetimeElmt.date;
            this.#loadChartSeries();
        }, 1000));

        this.#periodEndDatetimeElmt.addEventListener("datetimeChange", debounce(() => {
            this.#periodStartDatetimeElmt.dateMax = this.#periodEndDatetimeElmt.date;
            this.#loadChartSeries();
        }, 1000));

        this.#tsDataStates1SelectElmt.addEventListener("change", () => {
            let selectedOpt1Elmt = this.#tsDataStates1SelectElmt.options[this.#tsDataStates1SelectElmt.selectedIndex];
            let selectedOpt2Elmt = this.#tsDataStates2SelectElmt.options[this.#tsDataStates2SelectElmt.selectedIndex];

            // If new first selected timeseries data state is the same as the second, change it (with the next available found).
            for (let optElmt of this.#tsDataStates2SelectElmt.options) {
                if (this.#previousTsDataStateId2 == selectedOpt1Elmt.value && this.#previousTsDataStateId2 == selectedOpt2Elmt.value) {
                    optElmt.selected = true;
                    selectedOpt2Elmt = optElmt;
                }

                if (optElmt.value != selectedOpt1Elmt.value) {
                    optElmt.removeAttribute("disabled");
                }
                else {
                    optElmt.setAttribute("disabled", true);
                }
            }

            let newTsDataState1 = {
                id: selectedOpt1Elmt.value,
                name: selectedOpt1Elmt.text,
                styleOpts: { style: SeriesLineStyles.solid },
            };
            let newTsDataState2 = {
                id: selectedOpt2Elmt.value,
                name: selectedOpt2Elmt.text,
                styleOpts: { style: SeriesLineStyles.dashed },
            };

            let updatedTsIDs = [];
            let updatedTsDataStateIDs = [];
            // If needed, add new chart series for first selected timeseries data state.
            if (!(newTsDataState1.id in this.#tsSeriesOptionsByDataState)) {
                this.#tsSeriesOptionsByDataState[newTsDataState1.id] = {};

                for (let tsData of this.#tsSelector.selectedItems) {
                    let seriesColor = this.#chartExplore.getNextColor();

                    let tsChartSeriesOpts = new TimeseriesChartSeriesOptions(tsData, newTsDataState1, seriesColor, SeriesYAxisPositions.left, SeriesTypes.line, newTsDataState1.styleOpts);

                    let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
                    this.#chartExplore.addSeries(chartSeriesParams);

                    this.#tsSeriesOptionsByDataState[newTsDataState1.id][tsData.id] = tsChartSeriesOpts;

                    if (!updatedTsIDs.includes(tsData.id)) {
                        updatedTsIDs.push(tsData.id);
                    }
                }

                if (!updatedTsDataStateIDs.includes(newTsDataState1.id)) {
                    updatedTsDataStateIDs.push(newTsDataState1.id);
                }
            }
            // If needed, add new chart series for second selected timeseries data state.
            if (!(newTsDataState2.id in this.#tsSeriesOptionsByDataState)) {
                this.#tsSeriesOptionsByDataState[newTsDataState2.id] = {};

                for (let tsData of this.#tsSelector.selectedItems) {
                    let seriesColor = this.#chartExplore.getNextColor();

                    let tsChartSeriesOpts = new TimeseriesChartSeriesOptions(tsData, newTsDataState2, seriesColor, SeriesYAxisPositions.left, SeriesTypes.line, newTsDataState2.styleOpts);

                    let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
                    this.#chartExplore.addSeries(chartSeriesParams);

                    this.#tsSeriesOptionsByDataState[newTsDataState2.id][tsData.id] = tsChartSeriesOpts;

                    if (!updatedTsIDs.includes(tsData.id)) {
                        updatedTsIDs.push(tsData.id);
                    }
                }

                if (!updatedTsDataStateIDs.includes(newTsDataState2.id)) {
                    updatedTsDataStateIDs.push(newTsDataState2.id);
                }
            }

            let tsDataStateIDsToRemove = [];
            // Remove previous tsDataState1 if is not the same as new tsDataState1 or new tsDataState2.
            if (this.#previousTsDataStateId1 != newTsDataState1.id && this.#previousTsDataStateId1 != newTsDataState2.id) {
                tsDataStateIDsToRemove.push(this.#previousTsDataStateId1);
            }
            // Remove previous tsDataState2 if is not the same as new tsDataState1 or new tsDataState2.
            if (this.#previousTsDataStateId2 != newTsDataState1.id && this.#previousTsDataStateId2 != newTsDataState2.id) {
                tsDataStateIDsToRemove.push(this.#previousTsDataStateId2);
            }
            for (let tsDataStateIDToRemove of tsDataStateIDsToRemove) {
                for (let seriesOption of Object.values(this.#tsSeriesOptionsByDataState[tsDataStateIDToRemove])) {
                    let seriesID = seriesOption.seriesID;
                    this.#chartExplore.removeSeries(seriesID);
                }
                delete this.#tsSeriesOptionsByDataState[tsDataStateIDToRemove];
            }

            this.#previousTsDataStateId1 = newTsDataState1.id;
            this.#previousTsDataStateId2 = newTsDataState2.id;

            if (updatedTsIDs.length > 0 && updatedTsDataStateIDs.length > 0) {
                this.#loadChartSeries(updatedTsIDs, updatedTsDataStateIDs);
            }
        });

        this.#tsDataStates2SelectElmt.addEventListener("change", () => {
            let newTsDataState2 = {
                id: this.#tsDataStates2SelectElmt.value,
                name: this.#tsDataStates2SelectElmt.options[this.#tsDataStates2SelectElmt.selectedIndex].text,
                styleOpts: { style: SeriesLineStyles.dashed },
            };

            // Add new series for selected timeseries data state.
            let updatedTsIDs = [];
            this.#tsSeriesOptionsByDataState[newTsDataState2.id] = {};
            for (let tsData of this.#tsSelector.selectedItems) {
                let seriesColor = this.#chartExplore.getNextColor();

                let tsChartSeriesOpts = new TimeseriesChartSeriesOptions(tsData, newTsDataState2, seriesColor, SeriesYAxisPositions.left, SeriesTypes.line, newTsDataState2.styleOpts);

                let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
                this.#chartExplore.addSeries(chartSeriesParams);

                this.#tsSeriesOptionsByDataState[newTsDataState2.id][tsData.id] = tsChartSeriesOpts;

                if (!updatedTsIDs.includes(tsData.id)) {
                    updatedTsIDs.push(tsData.id);
                }
            }

            // Remove previous tsDataState2.
            for (let seriesOption of Object.values(this.#tsSeriesOptionsByDataState[this.#previousTsDataStateId2])) {
                let seriesID = seriesOption.seriesID;
                this.#chartExplore.removeSeries(seriesID);
            }
            delete this.#tsSeriesOptionsByDataState[this.#previousTsDataStateId2];

            this.#previousTsDataStateId2 = newTsDataState2.id;

            if (updatedTsIDs.length > 0) {
                this.#loadChartSeries(updatedTsIDs, [newTsDataState2.id]);
            }
        });

        window.addEventListener("popstate", () => {
            let url = new URL(window.location);

            this.#tsDataStates1SelectElmt.value = url.searchParams.get("data_state_1");
            this.#previousTsDataStateId1 = this.#tsDataStates1SelectElmt.value;
            this.#tsDataStates2SelectElmt.value = url.searchParams.get("data_state_2");
            this.#previousTsDataStateId2 = this.#tsDataStates2SelectElmt.value;
            this.#periodTypeElmt.value = url.searchParams.get("period_type");

            if (this.#isPeriodCustom()) {
                this.#periodStartDatetimeElmt.date = url.searchParams.get("period_start_date");
                this.#periodStartDatetimeElmt.time = url.searchParams.get("period_start_time");
                this.#periodEndDatetimeElmt.date = url.searchParams.get("period_end_date");
                this.#periodEndDatetimeElmt.time = url.searchParams.get("period_end_time");
            }
            this.#updatePeriodCustomState();

            // Update timeseries selector component with (un)selected timeseries and refresh chart.
            this.#tsSelector.clearAllSelection();
            this.#tsSeriesOptionsByDataState = {};
            this.#chartExplore.clearAll();
            this.#timeseriesElmt.value = url.searchParams.get("timeseries");
            let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
            this.#tsSelector.select(tsIDs, () => { this.#addTimeseries(this.#tsSelector.selectedItems, SeriesYAxisPositions.left, SeriesTypes.line); });
        });
    }

    #updateUrlParams() {
        let url = new URL(window.location);

        url.searchParams.set("timeseries", this.#timeseriesElmt.value);
        url.searchParams.set("data_state_1", this.#tsDataStates1SelectElmt.value);
        url.searchParams.set("data_state_2", this.#tsDataStates2SelectElmt.value);
        url.searchParams.set("period_type", this.#periodTypeElmt.value);

        let doUpdateUrl = true;
        if (this.#isPeriodCustom()) {
            if (this.#periodStartDatetimeElmt.hasDatetime && this.#periodStartDatetimeElmt.isValid) {
                url.searchParams.set("period_start_date", this.#periodStartDatetimeElmt.date);
                url.searchParams.set("period_start_time", this.#periodStartDatetimeElmt.time);
            }
            else {
                // Do not update page URL because period start date is invalid.
                doUpdateUrl = false;
                url.searchParams.delete("period_start_date");
                url.searchParams.delete("period_start_time");
            }
            if (this.#periodEndDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.isValid) {
                url.searchParams.set("period_end_date", this.#periodEndDatetimeElmt.date);
                url.searchParams.set("period_end_time", this.#periodEndDatetimeElmt.time);
            }
            else {
                // Do not update page URL because period end date is invalid.
                doUpdateUrl = false;
                url.searchParams.delete("period_end_date");
                url.searchParams.delete("period_end_time");
            }
        }
        else {
            url.searchParams.delete("period_start_date");
            url.searchParams.delete("period_start_time");
            url.searchParams.delete("period_end_date");
            url.searchParams.delete("period_end_time");
        }

        // Update current page URL only when different than current one.
        if (doUpdateUrl && url.toString() != window.location) {
            window.history.pushState(null, document.title, url);
        }

        return Object.fromEntries(url.searchParams);
    }

    #isPeriodCustom() {
        return this.#periodTypeElmt.value == "custom";
    }

    #updatePeriodCustomState() {
        if (this.#isPeriodCustom()) {
            this.#periodEndDatetimeElmt.date = this.#endDateCustomBackup;
            this.#periodEndDatetimeElmt.time = this.#endTimeCustomBackup;

            this.#periodCustomElmt.classList.remove("d-none", "invisible");
            this.#periodStartDatetimeElmt.setAttribute("required", true);
            this.#periodEndDatetimeElmt.setAttribute("required", true);

            this.#periodStartDatetimeElmt.focus();
        }
        else {
            this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
            this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;

            this.#periodCustomElmt.classList.add("d-none", "invisible");
            this.#periodStartDatetimeElmt.removeAttribute("required");
            this.#periodEndDatetimeElmt.removeAttribute("required");
        }
    }

    #updateSelectedTimeseriesInfo() {
        this.#timeseriesElmt.value = Object.keys(this.#tsSeriesOptionsByDataState[this.#tsDataStates1SelectElmt.value] || []).join();
    }

    #addTimeseries(timeseriesList, seriesYAxisPosition = SeriesYAxisPositions.left, seriesType = SeriesTypes.line) {
        let tsDataStates = [
            {
                id: this.#tsDataStates1SelectElmt.value,
                name: this.#tsDataStates1SelectElmt.options[this.#tsDataStates1SelectElmt.selectedIndex].text,
                styleOpts: { style: SeriesLineStyles.solid },
            },
            {
                id: this.#tsDataStates2SelectElmt.value,
                name: this.#tsDataStates2SelectElmt.options[this.#tsDataStates2SelectElmt.selectedIndex].text,
                styleOpts: { style: SeriesLineStyles.dashed },
            },
        ];

        let addedTsIDs = [];
        for (let tsData of timeseriesList) {
            for (let tsDataState of tsDataStates) {
                if (this.#tsSeriesOptionsByDataState[tsDataState.id] == null) {
                    this.#tsSeriesOptionsByDataState[tsDataState.id] = {};
                }

                if (!Object.keys(this.#tsSeriesOptionsByDataState[tsDataState.id]).includes(tsData.id.toString())) {
                    let seriesColor = this.#chartExplore.getNextColor();

                    let tsChartSeriesOpts = new TimeseriesChartSeriesOptions(tsData, tsDataState, seriesColor, seriesYAxisPosition, seriesType, tsDataState.styleOpts);

                    let chartSeriesParams = tsChartSeriesOpts.toChartSeries();
                    this.#chartExplore.addSeries(chartSeriesParams);

                    this.#tsSeriesOptionsByDataState[tsDataState.id][tsData.id] = tsChartSeriesOpts;

                    if (!addedTsIDs.includes(tsData.id)) {
                        addedTsIDs.push(tsData.id);
                    }
                }
            }
        }

        this.#updateSelectedTimeseriesInfo();

        if (addedTsIDs.length > 0) {
            // Get timeseries data and draw chart.
            this.#loadChartSeries(addedTsIDs);
        }
    }

    #hasPeriodSelected() {
        return !this.#isPeriodCustom() || (this.#periodStartDatetimeElmt.hasDatetime && this.#periodStartDatetimeElmt.isValid && this.#periodEndDatetimeElmt.hasDatetime && this.#periodEndDatetimeElmt.isValid);
    }

    #loadChartSeries(tsIDs, updatedTsDataStateIDs = null) {
        for (let tsDataGetReqID of this.#tsDataGetByDataStateReqIDs) {
            this.#internalAPIRequester.abort(tsDataGetReqID);
            tsDataGetReqID = null;
        }
        this.#tsDataGetByDataStateReqIDs = [];

        if (tsIDs == null) {
            tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
        }
        if (tsIDs.length > 0 && this.#hasPeriodSelected()) {
            this.#updateUrlParams();

            for (let [tsDataStateId, seriesOptions] of Object.entries(this.#tsSeriesOptionsByDataState)) {
                // If updatedTsDataStateIDs is null, update all data states.
                if (updatedTsDataStateIDs != null && !updatedTsDataStateIDs.includes(tsDataStateId)) {
                    continue;
                }

                let urlParams = {
                    timeseries: tsIDs,
                    data_state: tsDataStateId,
                    period: this.#periodTypeElmt.value,
                };
                if (this.#isPeriodCustom()) {
                    urlParams.start_date = this.#periodStartDatetimeElmt.date;
                    urlParams.start_time = this.#periodStartDatetimeElmt.time;
                    urlParams.end_date = this.#periodEndDatetimeElmt.date;
                    urlParams.end_time = this.#periodEndDatetimeElmt.time;
                }

                this.#chartExplore.showLoading();

                this.#tsDataGetByDataStateReqIDs.push(
                    this.#internalAPIRequester.get(
                        app.urlFor(`api.timeseries.data.retrieve_multiple_data`, urlParams),
                        (data) => {
                            // Iterate over each requested timeseries ID (instead of data from internal API response).
                            // The main reason is that, in some cases (and especially with no aggregation requested), data can be empty and therefore chart series are not updated.
                            for (let tsID of tsIDs) {
                                // Get timeseries data or empty structure if not in data from internal API response.
                                let tsData = data[tsID.toString()] || {};
                                // Update timeseries chart series.
                                let seriesID = seriesOptions[tsID].seriesID;
                                this.#chartExplore.updateSeriesData(seriesID, tsData);
                            }
                            this.#periodTypeLoaded = this.#periodTypeElmt.value;

                            this.#chartExplore.hideLoading();
                        },
                        (error) => {
                            app.flashMessage(error.toString(), "error");

                            this.#chartExplore.hideLoading();
                        },
                    )
                );
            }
        }
    }

    mount() {
        this.#endDateCustomBackup = this.#periodEndDatetimeElmt.date;
        this.#endTimeCustomBackup = this.#periodEndDatetimeElmt.time;
        this.#updatePeriodCustomState();

        this.#previousTsDataStateId1 = this.#tsDataStates1SelectElmt.value;
        this.#previousTsDataStateId2 = this.#tsDataStates2SelectElmt.value;

        this.#chartExplore = new TimeseriesChartExplore(this.#chartContainerElmt);

        // Update timeseries selector component with selected timeseries and update chart.
        let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
        this.#tsSelector.select(tsIDs, () => { this.#addTimeseries(this.#tsSelector.selectedItems); });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeSeriesDataExploreStatesView();
    view.mount();
});

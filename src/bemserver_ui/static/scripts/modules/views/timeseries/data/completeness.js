import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { TimeseriesChartCompleteness } from "/static/scripts/modules/components/charts/tsChartCompleteness.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


class TimeSeriesDataCompletenessView {

    #internalAPIRequester = null;
    #tsDataCompletenessReqID = null;
    #getWeeksReqID = null;

    #chartContainerElmt = null;

    #tsDataStatesSelectElmt = null;
    #periodTypeElmt = null;
    #periodYearElmt = null;
    #periodMonthElmt = null;
    #periodWeekElmt = null;
    #periodDayElmt = null;
    #tzNameElmt = null;
    #timeseriesElmt = null;

    #chartCompleteness = null;
    #tsSelector = null;

    constructor() {
        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorCompleteness");
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#chartContainerElmt = document.getElementById("chartContainer");

        this.#tsDataStatesSelectElmt = document.getElementById("data_states");
        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodYearElmt = document.getElementById("periodYear");
        this.#periodMonthElmt = document.getElementById("periodMonth");
        this.#periodWeekElmt = document.getElementById("periodWeek");
        this.#periodDayElmt = document.getElementById("periodDay");
        this.#tzNameElmt = document.getElementById("tzname");
        this.#timeseriesElmt = document.getElementById("timeseries");
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("clearSelection", (event) => {
            event.preventDefault();

            this.#timeseriesElmt.value = "";
            this.#refreshChart(this.#updateUrlParams());
        });

        this.#tsSelector.addEventListener("removeItem", (event) => {
            if (!this.#tsSelector.isOpened) {
                event.preventDefault();

                let curTsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "").slice().sort();
                if (curTsIDs.includes(event.detail.timeseries.id.toString())) {
                    this.#timeseriesElmt.value = this.#tsSelector.selectedItems.map(ts => ts.id).join();
                    this.#refreshChart(this.#updateUrlParams());
                }
            }
        });

        this.#tsSelector.addEventListener("closePanel", () => {
            let curTsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "").slice().sort();
            let newTsIDs = this.#tsSelector.selectedItems.map(ts => ts.id.toString()).slice().sort();

            let needUpdate = JSON.stringify(curTsIDs) != JSON.stringify(newTsIDs);
            if (needUpdate) {
                this.#timeseriesElmt.value = newTsIDs.join();
                this.#refreshChart(this.#updateUrlParams());
            }
        });

        this.#periodTypeElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePeriodSelect();
            this.#refreshChart(this.#updateUrlParams());
        });

        this.#periodYearElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateWeeks(() => {
                this.#updateDay();
                this.#refreshChart(this.#updateUrlParams());
            });
        });

        this.#periodMonthElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateWeeks(() => {
                this.#updateDay();
                this.#refreshChart(this.#updateUrlParams());
            });
        });

        this.#periodWeekElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateDay();
            this.#refreshChart(this.#updateUrlParams());
        });

        this.#periodDayElmt.addEventListener("change", (event) => {
            event.preventDefault();

            // TODO: update year, month, weeks?

            this.#refreshChart(this.#updateUrlParams());
        });

        this.#tsDataStatesSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#refreshChart(this.#updateUrlParams());
        });

        window.addEventListener("popstate", () => {
            let url = new URL(window.location);

            this.#tsDataStatesSelectElmt.value = url.searchParams.get("data_state");
            this.#periodTypeElmt.value = url.searchParams.get("period_type");

            if (this.#periodTypeElmt.value.startsWith("Year-") || this.#periodTypeElmt.value.startsWith("Month-")) {
                this.#periodYearElmt.value = url.searchParams.get("period_year");
            }
    
            if (this.#periodTypeElmt.value.startsWith("Month-")) {
                this.#periodMonthElmt.value = url.searchParams.get("period_month");
            }
    
            if (this.#periodTypeElmt.value.startsWith("Week-")) {
                this.#periodWeekElmt.value = url.searchParams.get("period_week");
            }
    
            if (this.#periodTypeElmt.value.startsWith("Day-")) {
                this.#periodDayElmt.value = url.searchParams.get("period_day");
            }

            // Update timeseries selector component with (un)selected timeseries and refresh chart.
            this.#tsSelector.clearAllSelection();
            this.#timeseriesElmt.value = url.searchParams.get("timeseries");
            let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
            this.#tsSelector.select(tsIDs, () => { this.#refreshChart(Object.fromEntries(url.searchParams)); });
        });
    }

    // Get the weeks from internal API and update the list in UI.
    #updateWeeks(afterUpdateCallback = null) {
        this.#periodWeekElmt.innerHTML = "";

        let urlParams = {
            year: this.#periodYearElmt.value,
            month: this.#periodMonthElmt.value,
        };

        if (this.#getWeeksReqID != null) {
            this.#internalAPIRequester.abort(this.#getWeeksReqID);
            this.#getWeeksReqID = null;
        }
        this.#getWeeksReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.analysis.parameters.month_weeks`, urlParams),
            (data) => {
                for (let [isoweek, weekInfo] of Object.entries(data)) {
                    let weekStartDate = new Date(Date.parse(weekInfo["start"]));
                    let weekEndDate = new Date(Date.parse(weekInfo["end"]));;

                    let optionElmt = document.createElement("option");
                    optionElmt.value = isoweek;
                    optionElmt.innerText = `${isoweek} (${weekStartDate.toLocaleString(navigator.languages, { dateStyle: "short" })} | ${weekEndDate.toLocaleString(navigator.languages, { dateStyle: "short" })})`;
                    this.#periodWeekElmt.appendChild(optionElmt);
                }

                // Select the first week in list.
                this.#periodWeekElmt.selectedIndex = 0;
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
            () => {
                afterUpdateCallback?.();
            },
        );
    }

    #updateDay() {
        let date = new Date(Date.UTC(this.#periodYearElmt.value, Parser.parseIntOrDefault(this.#periodMonthElmt.value, 1) - 1, 1));
        this.#periodDayElmt.value = date.toISOString().substring(0, 10);
    }

    #updatePeriodSelect() {
        this.#periodYearElmt.classList.add("d-none", "invisible");
        this.#periodMonthElmt.classList.add("d-none", "invisible");
        this.#periodWeekElmt.classList.add("d-none", "invisible");
        this.#periodDayElmt.classList.add("d-none", "invisible");

        if (this.#periodTypeElmt.value.startsWith("Year-")) {
            this.#periodYearElmt.classList.remove("d-none", "invisible");
        }
        else if (this.#periodTypeElmt.value.startsWith("Month-")) {
            this.#periodYearElmt.classList.remove("d-none", "invisible");
            this.#periodMonthElmt.classList.remove("d-none", "invisible");
        }
        else if (this.#periodTypeElmt.value.startsWith("Week-")) {
            this.#periodYearElmt.classList.remove("d-none", "invisible");
            this.#periodMonthElmt.classList.remove("d-none", "invisible");
            this.#periodWeekElmt.classList.remove("d-none", "invisible");
        }
        else if (this.#periodTypeElmt.value.startsWith("Day-")) {
            this.#periodDayElmt.classList.remove("d-none", "invisible");
        }
    }

    #updateUrlParams() {
        let url = new URL(window.location);

        url.searchParams.set("timeseries", this.#timeseriesElmt.value);
        url.searchParams.set("data_state", this.#tsDataStatesSelectElmt.value);
        url.searchParams.set("period_type", this.#periodTypeElmt.value);

        // Depending on selected period type, ingore some parameters.
        if (this.#periodTypeElmt.value.startsWith("Year-") || this.#periodTypeElmt.value.startsWith("Month-")) {
            url.searchParams.set("period_year", this.#periodYearElmt.value);
        }
        if (this.#periodTypeElmt.value.startsWith("Month-")) {
            url.searchParams.set("period_month", this.#periodMonthElmt.value);
        }
        if (this.#periodTypeElmt.value.startsWith("Week-")) {
            url.searchParams.set("period_week", this.#periodWeekElmt.value);
        }
        if (this.#periodTypeElmt.value.startsWith("Day-")) {
            url.searchParams.set("period_day", this.#periodDayElmt.value);
        }

        // Update current page URL.
        window.history.pushState(null, document.title, url);

        return Object.fromEntries(url.searchParams);
    }

    #isValid() {
        let hasPeriodSelected = false;
        if (this.#periodTypeElmt.value.startsWith("Year-")) {
            hasPeriodSelected = this.#periodYearElmt.selectedIndex != -1;
        }
        else if (this.#periodTypeElmt.value.startsWith("Month-")) {
            hasPeriodSelected = this.#periodYearElmt.selectedIndex != -1 && this.#periodMonthElmt.selectedIndex != -1;
        }
        else if (this.#periodTypeElmt.value.startsWith("Week-")) {
            hasPeriodSelected = this.#periodWeekElmt.selectedIndex != -1;
        }
        else if (this.#periodTypeElmt.value.startsWith("Day-")) {
            hasPeriodSelected = this.#periodDayElmt.value != null;
        }

        return this.#tsSelector.selectedItems.length > 0 && hasPeriodSelected;
    }

    #refreshChartSize() {
        let nbSeries = this.#chartCompleteness != null ? this.#chartCompleteness.seriesCount : 0;

        let chartContainerHeight = (nbSeries * 25) + 140;
        if (chartContainerHeight < 400) {
            chartContainerHeight = 400;
        }
        this.#chartContainerElmt.style.height = `${chartContainerHeight}px`;

        this.#chartCompleteness.resize();
    }

    #refreshChart(urlParams) {
        if (this.#chartCompleteness == null) {
            this.#chartCompleteness = new TimeseriesChartCompleteness(this.#chartContainerElmt);
        }
        else {
            this.#chartCompleteness.clear();
        }

        this.#chartCompleteness.showLoading();

        if (this.#tsDataCompletenessReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataCompletenessReqID);
            this.#tsDataCompletenessReqID = null;
        }

        let shouldDisplayTime = this.#periodTypeElmt.value.endsWith("-Hourly");

        if (this.#isValid()) {
            this.#tsDataCompletenessReqID = this.#internalAPIRequester.get(
                app.urlFor(`api.analysis.completeness.retrieve_completeness`, urlParams),
                (data) => {
                    data.period = this.#periodTypeElmt.options[this.#periodTypeElmt.selectedIndex].text;
                    data.datastate_name = this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text;
                    this.#chartCompleteness.load(data, shouldDisplayTime, this.#tzNameElmt.value);
                },
                (error) => {
                    app.flashMessage(error.toString(), "error");
                },
                () => {
                    this.#refreshChartSize();
                    this.#chartCompleteness.hideLoading();
                },
            );
        }
        else {
            this.#refreshChartSize();
            this.#chartCompleteness.hideLoading();
        }
    }

    mount() {
        this.#updatePeriodSelect();

        // Update timeseries selector component with selected timeseries and update chart.
        let tsIDs = (this.#timeseriesElmt.value.split(",") || []).filter(x => x != "");
        this.#tsSelector.select(tsIDs, () => { this.#refreshChart(this.#updateUrlParams()); });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeSeriesDataCompletenessView();
    view.mount();
});

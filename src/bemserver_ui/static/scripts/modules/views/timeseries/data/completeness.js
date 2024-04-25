import { app } from "/static/scripts/app.js";
import { InternalAPIRequest } from "/static/scripts/modules/tools/fetcher.js";
import { TimeseriesChartCompleteness } from "/static/scripts/modules/components/charts/tsChartCompleteness.js";
import { Spinner } from "/static/scripts/modules/components/spinner.js";
import { TimeseriesSelector } from "/static/scripts/modules/components/timeseries/selector.js";
import { TimeCalendar } from "/static/scripts/modules/tools/time.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


class TimeSeriesDataCompletenessView {

    #internalAPIRequester = null;
    #tsDataStatesReqID = null;
    #tsDataCompletenessReqID = null;

    #chartContainerElmt = null;
    #loadBtnElmt = null;

    #tsDataStatesSelectElmt = null;
    #periodTypeElmt = null;
    #periodYearElmt = null;
    #periodMonthElmt = null;
    #periodWeekElmt = null;
    #periodDayElmt = null;
    #tzNameElmt = null;

    #chartCompleteness = null;

    #yearRef = null;
    #monthRef = null;
    #maxPastYears = 20;

    #tsSelector = null;

    constructor() {
        let date = new Date();
        this.#yearRef = date.getUTCFullYear();
        this.#monthRef = date.getUTCMonth() + 1;

        this.#tsSelector = TimeseriesSelector.getInstance("tsSelectorCompleteness");
        this.#internalAPIRequester = new InternalAPIRequest();

        this.#cacheDOM();
        this.#initElements();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#chartContainerElmt = document.getElementById("chartContainer");
        this.#loadBtnElmt = document.getElementById("loadBtn");

        this.#tsDataStatesSelectElmt = document.getElementById("data_states");
        this.#periodTypeElmt = document.getElementById("periodType");
        this.#periodYearElmt = document.getElementById("periodYear");
        this.#periodMonthElmt = document.getElementById("periodMonth");
        this.#periodWeekElmt = document.getElementById("periodWeek");
        this.#periodDayElmt = document.getElementById("periodDay");
        this.#tzNameElmt = document.getElementById("tzname");
    }

    #initElements() {
        this.#updatePeriodSelect();
        this.#initYears();
        this.#updateWeeks();
        this.#updateLoadBtnState();
    }

    #initEventListeners() {
        this.#tsSelector.addEventListener("toggleItem", (event) => {
            event.preventDefault();

            this.#updateLoadBtnState();
        });

        this.#periodTypeElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updatePeriodSelect();
            this.#updateLoadBtnState();
        });

        this.#periodYearElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateWeeks();
            this.#updateLoadBtnState();
        });

        this.#periodMonthElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateWeeks();
            this.#updateLoadBtnState();
        });

        this.#periodDayElmt.addEventListener("change", (event) => {
            event.preventDefault();

            this.#updateLoadBtnState();
        });

        this.#loadBtnElmt.addEventListener("click", (event) => {
            event.preventDefault();

            this.refreshChart();
        });
    }

    #initYears() {
        this.#periodYearElmt.innerHTML = "";
        for (let offsetPastYear = 0 ; offsetPastYear < this.#maxPastYears ; offsetPastYear++) {
            let year = this.#yearRef - offsetPastYear;
            let optionElmt = document.createElement("option");
            optionElmt.value = year.toString();
            optionElmt.innerText = year.toString();
            optionElmt.selected = year == this.#yearRef;
            this.#periodYearElmt.appendChild(optionElmt);
        }
    }

    #updateWeeks() {
        this.#periodWeekElmt.innerHTML = "";

        let baseYear = Parser.parseIntOrDefault(this.#periodYearElmt.value, this.#yearRef);
        let baseMonth = Parser.parseIntOrDefault(this.#periodMonthElmt.value, this.#monthRef) - 1; // Month number goes from 0 to 11

        let periodStartDate = new Date(Date.UTC(baseYear, baseMonth, 1));
        let periodEndDate = new Date(Date.UTC(baseYear, baseMonth + 1, 1));
        let baseDate = new Date(Date.UTC(baseYear, baseMonth, 1));

        let dowOffset = 1; // We want weeks to start on monday.
        let [weekStartDate, weekEndDate] = TimeCalendar.getWeek(baseDate, dowOffset);
        let weekNumber = TimeCalendar.getWeekNumber(baseDate, dowOffset);

        do {
            let optionElmt = document.createElement("option");
            optionElmt.value = `${weekStartDate.toISOString().substring(0, 10)}_${weekEndDate.toISOString().substring(0, 10)}`;
            optionElmt.innerText = `W${weekNumber} (${weekStartDate.toLocaleString(navigator.languages, { dateStyle: "short" })} | ${weekEndDate.toLocaleString(navigator.languages, { dateStyle: "short" })})`;
            this.#periodWeekElmt.appendChild(optionElmt);

            baseDate.setDate(baseDate.getDate() + 7);
            [weekStartDate, weekEndDate] = TimeCalendar.getWeek(baseDate, dowOffset);
            weekNumber = TimeCalendar.getWeekNumber(baseDate, dowOffset);
        }
        while (TimeCalendar.isWeekInRange(periodStartDate, periodEndDate, weekStartDate, weekEndDate));
    }

    #updateLoadBtnState() {
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

        if (this.#tsSelector.selectedItems.length > 0 && hasPeriodSelected) {
            this.#loadBtnElmt.removeAttribute("disabled");
        }
        else {
            this.#loadBtnElmt.setAttribute("disabled", true);
        }
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

    #loadTsDataStates() {
        this.#tsDataStatesSelectElmt.innerHTML = "";
        let loadingOptionElmt = document.createElement("option");
        loadingOptionElmt.value = "None";
        loadingOptionElmt.innerText = "loading...";
        this.#tsDataStatesSelectElmt.appendChild(loadingOptionElmt);

        if (this.#tsDataStatesReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataStatesReqID);
            this.#tsDataStatesReqID = null;
        }

        this.#tsDataStatesReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.timeseries.datastates.retrieve_list`),
            (data) => {
                this.#tsDataStatesSelectElmt.innerHTML = "";
                for (let option of data.data) {
                    let optionElmt = document.createElement("option");
                    optionElmt.value = option.id;
                    optionElmt.innerText = option.name;
                    this.#tsDataStatesSelectElmt.appendChild(optionElmt);
                }
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
        );
    }

    refreshChart() {
        if (this.#chartCompleteness == null) {
            this.#chartCompleteness = new TimeseriesChartCompleteness(this.#chartContainerElmt);
        }

        this.#chartCompleteness.showLoading();

        let loadBtnInnerBackup = this.#loadBtnElmt.innerHTML;
        this.#loadBtnElmt.innerHTML = "";
        this.#loadBtnElmt.appendChild(new Spinner({ useSmallSize: true, useSecondaryColor: true }));
        this.#loadBtnElmt.setAttribute("disabled", "true");

        let urlParams = {
            timeseries: this.#tsSelector.selectedItems.map(ts => ts.id),
            data_state: this.#tsDataStatesSelectElmt.value,
            period_type: this.#periodTypeElmt.value,
            period_year: this.#periodYearElmt.value,
            period_month: this.#periodMonthElmt.value,
            period_week: this.#periodWeekElmt.value,
            period_day: this.#periodDayElmt.value,
        };

        if (this.#tsDataCompletenessReqID != null) {
            this.#internalAPIRequester.abort(this.#tsDataCompletenessReqID);
            this.#tsDataCompletenessReqID = null;
        }

        this.#tsDataCompletenessReqID = this.#internalAPIRequester.get(
            app.urlFor(`api.analysis.completeness.retrieve_completeness`, urlParams),
            (data) => {
                let chartContainerHeight = (Object.entries(data["timeseries"]).length * 25) + 140;
                if (chartContainerHeight < 400) {
                    chartContainerHeight = 400;
                }
                this.#chartContainerElmt.style.height = `${chartContainerHeight}px`;

                data.period = this.#periodTypeElmt.options[this.#periodTypeElmt.selectedIndex].text;
                data.datastate_name = this.#tsDataStatesSelectElmt.options[this.#tsDataStatesSelectElmt.selectedIndex].text;
                let shouldDisplayTime = this.#periodTypeElmt.value.endsWith("-Hourly");
                this.#chartCompleteness.load(data, shouldDisplayTime, this.#tzNameElmt.value);

                this.#chartCompleteness.resize();
            },
            (error) => {
                app.flashMessage(error.toString(), "error");
            },
            () => {
                this.#loadBtnElmt.innerHTML = loadBtnInnerBackup;
                this.#loadBtnElmt.removeAttribute("disabled");

                this.#chartCompleteness.hideLoading();
            },
        );
    }

    mount() {
        this.#loadTsDataStates();
    }
}


document.addEventListener("DOMContentLoaded", () => {
    let view = new TimeSeriesDataCompletenessView();
    view.mount();
});

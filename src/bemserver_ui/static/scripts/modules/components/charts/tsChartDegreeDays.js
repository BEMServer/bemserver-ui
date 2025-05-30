import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { DateTime, TimeSettings } from "/static/scripts/modules/tools/time.js";


export class TimeseriesChartDegreeDays extends ChartBase {

    #degreeDayTypeColors = {
        "heating": "#ee6666",
        "cooling": "#73c0de",
    };

    constructor(chartContainerElmt, initOptions = null) {
        super(chartContainerElmt, initOptions);

        this.#initChartOptions();
    }

    #initChartOptions() {
        this.setOption({
            title: {
                left: "center",
                text: "Data completeness",
                subtextStyle: {
                    fontSize: 14,
                },
            },
            grid: {
                top: 60,
                bottom: 90,
            },
            xAxis: [
                {
                    type: "time",
                },
            ],
            yAxis: [
                {
                    type: "value",
                },
            ],
            legend: [
                {
                    type: "scroll",
                    bottom: 0,
                },
            ],
            dataZoom: [
                {
                    type: "slider",
                    bottom: 50,
                },
                {
                    type: "inside",
                },
            ],
            // Trick to prevent echarts from converting timestamps to navigator local time.
            useUTC: true,
        });
    }

    #optionToContent(opt, unit, tzName = "UTC", timeDisplayMode = "iso", compareMode = false) {
        let timestamps = opt.series[0].data.map((serieData) => {
            if (compareMode) {
                return serieData[0];
            }
            else {
                return this.#formatTime(serieData[0], tzName, timeDisplayMode);
            }
        });

        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("m-2", "me-3");

        let subtitleElmt = document.createElement("h6");
        subtitleElmt.classList.add("ms-4");
        subtitleElmt.innerText = opt.title[0].subtext;
        mainContainerElmt.appendChild(subtitleElmt);

        let tableContainerElmt = document.createElement("div");
        tableContainerElmt.classList.add("table-responsive");

        let tableElmt = document.createElement("table");
        tableElmt.classList.add("table", "table-sm", "table-hover", "table-bordered", "caption-top", "user-select-all");
        let tableCaptionElmt = document.createElement("caption");
        tableCaptionElmt.classList.add("fst-italic", "text-muted", "text-end");
        tableCaptionElmt.innerText = `${timestamps.length.toString()} rows`;
        tableElmt.appendChild(tableCaptionElmt);
        let tableHeadElmt = document.createElement("thead");
        let tableHeadTrElmt = document.createElement("tr");
        tableHeadTrElmt.classList.add("align-middle");
        let tableHeadTimestampElmt = document.createElement("th");
        tableHeadTimestampElmt.setAttribute("scope", "col");
        tableHeadTimestampElmt.innerText = "Timestamp";
        tableHeadTrElmt.appendChild(tableHeadTimestampElmt);
        for (let serie of opt.series) {
            let tableHeadThElmt = document.createElement("th");
            tableHeadThElmt.setAttribute("scope", "col");
            if (compareMode) {
                tableHeadThElmt.innerText = `${serie.name}${unit ? ` [${unit}]`: ""}`;
            }
            else {
                tableHeadThElmt.innerText = serie.name;
            }
            tableHeadTrElmt.appendChild(tableHeadThElmt);
        }
        tableHeadElmt.appendChild(tableHeadTrElmt);
        tableElmt.appendChild(tableHeadElmt);
        let tableBodyElmt = document.createElement("tbody");
        tableBodyElmt.classList.add("table-group-divider");
        for (let [index, timestamp] of timestamps.entries()) {
            let tableTrElmt = document.createElement("tr");
            let tableCellTimestampElmt = document.createElement("td");
            tableCellTimestampElmt.innerText = timestamp;
            tableTrElmt.appendChild(tableCellTimestampElmt);
            for (let serie of opt.series) {
                let tableCellElmt = document.createElement("td");
                tableCellElmt.innerText = Parser.parseFloatOrDefault(serie.data[index][1], Number.NaN, 2).toString();
                tableTrElmt.appendChild(tableCellElmt);
            }
            tableBodyElmt.appendChild(tableTrElmt);
        }
        tableElmt.appendChild(tableBodyElmt);

        tableContainerElmt.appendChild(tableElmt);
        mainContainerElmt.appendChild(tableContainerElmt);
        return mainContainerElmt;
    }

    #tooltipFormatter(params, unit, tzName = "UTC", timeDisplayMode = "iso", compareMode = false) {
        let tooltipContainerElmt = document.createElement("div");

        let ulElmt = document.createElement("ul");
        ulElmt.classList.add("list-unstyled", "mx-2", "mt-2", "mb-0");

        for (let [index, serieParams] of params.entries()) {
            if (index == 0) {
                let timeElmt = document.createElement("h6");
                if (compareMode) {
                    timeElmt.textContent = serieParams.value[0];
                }
                else {
                    timeElmt.textContent = this.#formatTime(serieParams.value[0], tzName, timeDisplayMode);
                }
                tooltipContainerElmt.appendChild(timeElmt);
            }

            let liElmt = document.createElement("li");
            liElmt.classList.add("d-flex", "justify-content-between", "gap-4");
            ulElmt.appendChild(liElmt);

            let serieNameElmt = document.createElement("div");
            serieNameElmt.classList.add("d-flex", "align-items-center", "gap-1");
            serieNameElmt.innerHTML = `${serieParams.marker}<span>${serieParams.seriesName}</span>`;

            let serieValueContainerElmt = document.createElement("div");
            serieValueContainerElmt.classList.add("d-flex", "gap-1");

            let serieValueElmt = document.createElement("span");
            serieValueElmt.classList.add("fw-bold");
            serieValueElmt.innerText = Parser.parseFloatOrDefault(serieParams.value[1], Number.NaN, 2).toString();
            serieValueContainerElmt.appendChild(serieValueElmt);

            let serieValueUnitElmt = document.createElement("small");
            serieValueUnitElmt.innerText = unit;
            serieValueContainerElmt.appendChild(serieValueUnitElmt);

            liElmt.appendChild(serieNameElmt);
            liElmt.appendChild(serieValueContainerElmt);
        }

        tooltipContainerElmt.appendChild(ulElmt);
        return tooltipContainerElmt;
    }

    #formatTime(time, tzName, displayMode) {
        // Set back chart timestamps in the desired timezone.
        let dt = DateTime.fromMillis(time, { zone: "UTC" });
        dt = dt.setZone(tzName, { keepLocalTime: true });

        if (displayMode == "year") {
            return dt.year.toString();
        }
        else if (displayMode == "month") {
            return `${dt.year.toString()}-${dt.month.toString().padStart(2, "0")}`;
        }
        else if (displayMode == "date") {
            return dt.toISODate();
        }

        return dt.toISO({ suppressMilliseconds: true });
    }

    load(degreeDaysData, degreeDaysType, degreeDaysBase, degreeDaysBaseUnit, unit, tzName = "UTC", timeDisplayMode = "iso", compareMode = false, categories = null) {
        TimeSettings.defaultZone = tzName;

        let dataSeries = [];
        if (!compareMode) {
            dataSeries.push({
                id: `${degreeDaysType}-${degreeDaysBase}`,
                name: `${degreeDaysType} degree days (base ${degreeDaysBase.toString()}${degreeDaysBaseUnit ? ` ${degreeDaysBaseUnit}`: ""})`,
                type: "bar",
                data: Object.entries(degreeDaysData).map(([timestamp, value]) => {
                    // Trick to get around the inability of echarts to manage timezones...
                    // X-axis time line is shown in UTC, keeping local time.
                    let dt = DateTime.fromISO(timestamp, { zone: tzName });
                    dt = dt.setZone("UTC", { keepLocalTime: true });

                    return [
                        dt.ts,
                        Parser.parseFloatOrDefault(value, Number.NaN, 2),
                    ];
                }),
                emphasis: {
                    focus: "series",
                },
                itemStyle: {
                    color: this.#degreeDayTypeColors[degreeDaysType],
                },
            });
        }
        else {
            dataSeries = Object.entries(degreeDaysData).map(([time, periodData]) => {
                return {
                    id: `${time}-${degreeDaysType}-${degreeDaysBase}`,
                    name: time.toString(),
                    type: "bar",
                    data: Object.entries(periodData).map(([period, value]) => {
                        let category = categories != null ? categories[period] : period;
                        return [category, Parser.parseFloatOrDefault(value, Number.NaN, 2)];
                    }),
                    emphasis: {
                        focus: "series",
                    },
                };
            });
        }

        let chartTitle = `${compareMode ? "compare " : ""}${degreeDaysType} degree days (${unit})`;

        let options = {
            title: {
                text: chartTitle,
                subtext: `base ${degreeDaysBase.toString()}${degreeDaysBaseUnit ? ` ${degreeDaysBaseUnit}`: ""}`,
            },
            toolbox: {
                feature: {
                    dataView: {
                        lang: [
                            chartTitle,
                            "Close",
                            "Refresh",
                        ],
                        optionToContent: (opt) => { return this.#optionToContent(opt, unit, tzName, timeDisplayMode, compareMode); },
                    },
                },
            },
            tooltip: {
                formatter: (params) => { return this.#tooltipFormatter(params, unit, tzName, timeDisplayMode, compareMode); },
            },
            yAxis: {
                name: unit,
            },
            series: dataSeries,
        };

        if (compareMode) {
            options.xAxis = [
                {
                    type: "category",
                    axisTick: {
                        alignWithLabel: true,
                    },
                },
            ];
        }

        this.setOption(options);
    }
}

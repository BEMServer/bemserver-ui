import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { DateTime, TimeSettings } from "/static/scripts/modules/tools/time.js";


export class TimeseriesChartWeather extends ChartBase {

    #energyUseColors = {
        "Air temperature": "#0880A4",
        "Relative humidity": "#7C4F00",
        "Direct normal solar radiation": "#EF1919",
        "Surface solar radiation": "#E38028",
        "Air temperature forecast": "#0880A4",
        "Relative humidity forecast": "#7C4F00",
        "Direct normal solar radiation forecast": "#EF1919",
        "Surface solar radiation forecast": "#E38028",
    };

    #showTsInfoCallback = null;


    constructor(chartContainerElmt, initOptions = null) {
        super(chartContainerElmt, initOptions);

        this.#initChartOptions();
    }

    #initChartOptions() {
        this.setOption({
            title: {
                left: "center",
            },
            grid: {
                top: 70,
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
                    position: "left",
                    scale: true,
                },
                {
                    type: "value",
                    position: "right",
                    scale: true,
                },
            ],
            legend: [
                {
                    data: [],
                    width: "45%",
                    bottom: 0,
                    left: 0,
                    type: "scroll",
                },
                {
                    data: [],
                    width: "45%",
                    bottom: 0,
                    right: 0,
                    type: "scroll",
                }
            ],
            toolbox: [
                {
                    feature: {
                        myTSInfo: {
                            show: true,
                            title: "Timeseries Information",
                            icon: "image:///static/images/icons/book-text.svg",
                            onclick: () => { this.#showTsInfoCallback?.(); },
                        },
                    },
                },
            ],
            tooltip: {
                axisPointer: {
                    type: "cross",
                },
                valueFormatter: (value) => {
                    return Parser.parseFloatOrDefault(value, Number.NaN, 2);
                },
            },
            dataZoom: [
                {
                    type: "slider",
                    bottom: 50,
                },
                {
                    type: "inside",
                },
            ],
        });
    }

    #optionToContent(opt, tzName = "UTC", timeDisplayMode = "iso") {
        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("m-2", "me-3");

        if (opt.series.length > 0) {
            // Get a merged list of all series timestamps.
            let seriesTimestamps = opt.series.map((seriesInfo) => {
                return seriesInfo.data.map((seriesData) => {
                    return this.#formatTime(seriesData[0], tzName, timeDisplayMode);
                });
            });
            let timestamps = Array.from(new Set([].concat(...seriesTimestamps)));

            // Ensure that the timestamps are ordered (from the older to the newest).
            timestamps = timestamps.sort();
            
            let subtitleElmt = document.createElement("h5");
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
                tableHeadThElmt.innerText = serie.name;
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
                    tableCellElmt.textContent = (index in serie.data) ? Parser.parseFloatOrDefault(serie.data[index][1], Number.NaN, 2) : "-";
                    tableTrElmt.appendChild(tableCellElmt);
                }
                tableBodyElmt.appendChild(tableTrElmt);
            }
            tableElmt.appendChild(tableBodyElmt);

            tableContainerElmt.appendChild(tableElmt);
            mainContainerElmt.appendChild(tableContainerElmt);
        }
        else {
            let noDataElmt = document.createElement("p");
            noDataElmt.classList.add("fst-italic", "text-center", "text-muted");
            noDataElmt.innerText = "No data";
            mainContainerElmt.appendChild(noDataElmt);
        }

        return mainContainerElmt;
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

    load(name, dataset, tzName = "UTC", timeDisplayMode = "iso", tsInfoCallback = null) {
        TimeSettings.defaultZone = tzName;

        this.#showTsInfoCallback = tsInfoCallback;

        let listUnit = {0: [], 1: []};
        let dataLegend = {0: [], 1: []};
        let dataSeries = [];
        for (let [_parameter, serieParams] of Object.entries(dataset)) {
            for (let [_settings, value] of Object.entries(serieParams)) {
                if (Object.values(value.data).length > 0) {
                    let serie = {
                        name: `${value.name}${value.timeseries.unit_symbol != null ? ` [${value.timeseries.unit_symbol}]` : ""}`,
                        type: "line",
                        data: Object.entries(value.data).map(([date, value]) => {
                            // Trick to get around the inability of echarts to manage timezones...
                            // X-axis time line is shown in UTC, keeping local time.
                            let dt = DateTime.fromISO(date, { zone: tzName });
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
                            color: this.#energyUseColors[value.name],
                        },
                        lineStyle: {
                            type: value.name.includes("forecast") ? "dashed" : "solid",
                        },
                        yAxisIndex: value.yAxis,
                        symbol: "path://",
                        connectNulls: true,
                    };
                    dataSeries.push(serie);

                    if (value.timeseries.unit_symbol != null && !listUnit[value.yAxis].includes(value.timeseries.unit_symbol)) {
                        listUnit[value.yAxis].push(value.timeseries.unit_symbol);
                    }

                    dataLegend[value.yAxis].push(serie.name);
                }
            }
        }

        let options = {
            title: {
                text: name,
            },
            toolbox: {
                feature: {
                    dataView: {
                        optionToContent: (opt) => { return this.#optionToContent(opt, tzName, timeDisplayMode); },
                    },
                },
            },
            yAxis: [
                {
                    name: listUnit[0].join(", "),
                },
                {
                    name: listUnit[1].join(", "),
                },
            ],
            series: dataSeries,
            legend: [
                {
                    data: dataLegend[0],
                },
                {
                    data: dataLegend[1],
                },
            ],
        };

        if (options.legend[1].data.length == 0) {
            options.legend[0].left = "center";
            options.legend[0].width = "auto";
        };

        this.setOption(options);
    }
}

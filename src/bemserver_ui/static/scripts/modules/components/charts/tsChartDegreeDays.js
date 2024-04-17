import "https://cdn.jsdelivr.net/npm/echarts@5.4.2/dist/echarts.min.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


export class TimeseriesChartDegreeDays extends HTMLDivElement {

    #chart = null;

    #initOptions = {
        height: 500,
        width: "auto",
    };
    #theme = null;

    #defaultTitle = "Degree days";
    #defaultOptions = {
        title: {
            left: "center",
            text: this.#defaultTitle,
            subtextStyle: {
                fontSize: 14,
            },
        },
        grid: {
            left: 20,
            right: 20,
            bottom: 90,
            containLabel: true,
        },
        toolbox: {
            feature: {
                dataView: {
                    readOnly: true,
                    buttonColor: "#95c11a",
                },
                saveAsImage: {},
            },
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
            },
        },
        legend: {
            type: "scroll",
            bottom: 0,
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
        series: [],
        useUTC: false,
    };

    #degreeDayTypeColors = {
        "heating": "#ee6666",
        "cooling": "#73c0de",
    };

    #compareMode = false;

    constructor(options = null, theme = null, compareMode = false) {
        super();

        this.#initOptions = options || this.#initOptions;
        this.#theme = theme;
        this.#compareMode = compareMode;

        if (this.#compareMode) {
            this.#defaultOptions.xAxis[0].type = "category";
        }
    }

    #initEventListeners() {
        window.addEventListener("resize", () => {
            this.resize();
        });

        window.addEventListener("unload", () => {
            this.dispose();
        });
    }

    #optionToContent(opt, unit, timeFormat) {
        let timestamps = opt.series[0].data.map((serieData) => {
            if (this.#compareMode) {
                return serieData[0];
            }
            else {
                return echarts.time.format(serieData[0], timeFormat);
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
            if (this.#compareMode) {
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

    #tooltipFormatter(params, unit, timeFormat) {
        let tooltipContainerElmt = document.createElement("div");

        let ulElmt = document.createElement("ul");
        ulElmt.classList.add("list-unstyled", "mx-2", "mt-2", "mb-0");

        for (let [index, serieParams] of params.entries()) {
            if (index == 0) {
                let timeElmt = document.createElement("h6");
                if (this.#compareMode) {
                    timeElmt.innerText = serieParams.value[0];
                }
                else {
                    timeElmt.innerText = echarts.time.format(serieParams.value[0], timeFormat);
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

    connectedCallback() {
        this.#chart = echarts.init(this, this.#theme, this.#initOptions);
        this.#chart.setOption(this.#defaultOptions);

        this.#initEventListeners();
    }

    resize() {
        this.#chart.resize();
    }

    dispose() {
        this.#chart.dispose();
    }

    showLoading() {
        this.#chart.showLoading();
    }

    hideLoading() {
        this.#chart.hideLoading();
    }

    load(degreeDaysData, degreeDaysType, degreeDaysBase, degreeDaysBaseUnit, unit, timeFormat) {
        this.hideLoading();

        let options = this.#chart.getOption();

        options.title[0].text = `${this.#compareMode ? "compare " : ""}${degreeDaysType} degree days (${unit})`;
        options.title[0].subtext = `base ${degreeDaysBase.toString()}${degreeDaysBaseUnit ? ` ${degreeDaysBaseUnit}`: ""}`;
        options.toolbox[0].feature.dataView.lang[0] = options.title[0].text;
        options.toolbox[0].feature.dataView.optionToContent = (opt) => { return this.#optionToContent(opt, unit, timeFormat); };
        options.tooltip[0].formatter = (params) => { return this.#tooltipFormatter(params, unit, timeFormat); };

        options.yAxis[0].name = unit;

        options.series.length = 0;
        if (!this.#compareMode) {
            options.series.push({
                id: `${degreeDaysType}-${degreeDaysBase}`,
                name: `${degreeDaysType} degree days (base ${degreeDaysBase.toString()}${degreeDaysBaseUnit ? ` ${degreeDaysBaseUnit}`: ""})`,
                type: "bar",
                data: Object.entries(degreeDaysData).map(([timestamp, value]) => {
                    return [timestamp, Parser.parseFloatOrDefault(value, Number.NaN, 2)];
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
            options.xAxis[0].axisTick.alignWithLabel = true;

            options.series = Object.entries(degreeDaysData).map(([time, periodData]) => {
                return {
                    id: `${time}-${degreeDaysType}-${degreeDaysBase}`,
                    name: time.toString(),
                    type: "bar",
                    data: Object.entries(periodData).map(([period, value]) => {
                        return [period, Parser.parseFloatOrDefault(value, Number.NaN, 2)];
                    }),
                    emphasis: {
                        focus: "series",
                    },
                };
            });
        }

        // Fix for bug, see: https://github.com/apache/incubator-echarts/issues/6202
        this.#chart.clear();

        this.#chart.setOption(options);
    }
}


if (window.customElements.get("app-ts-chart-degree-days") == null) {
    window.customElements.define("app-ts-chart-degree-days", TimeseriesChartDegreeDays, { extends: "div" });
}

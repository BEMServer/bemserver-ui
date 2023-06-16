import "https://cdn.jsdelivr.net/npm/echarts@5.4.1/dist/echarts.min.js";
import { Parser } from "../../tools/parser.js";


export class TimeseriesChartWeather extends HTMLDivElement {

    #chart = null;

    #initOptions = {
        height: 500,
        width: "auto",
    };
    #theme = null;

    #defaultOptions = {
        title: {
            left: "center",
            text: "",
        },
        grid: {
            left: "3%",
            right: "5%",
            bottom: 90,
            containLabel: true,
        },
        toolbox: {
            feature: {
                myTSInfo: {
                    show: true,
                    title: "Weather parameters timeseries",
                    icon: "path://M 12 2 C 6.4771525 2 2 6.4771525 2 12 C 2 17.522847 6.4771525 22 12 22 C 17.522847 22 22 17.522847 22 12 C 22 6.4771525 17.522847 2 12 2 z M 12 4 C 16.418278 4 20 7.581722 20 12 C 20 16.418278 16.418278 20 12 20 C 7.581722 20 4 16.418278 4 12 C 4 7.581722 7.581722 4 12 4 z M 11 6 L 11 8 L 13 8 L 13 6 L 11 6 z M 11 9 L 11 17 L 13 17 L 13 9 L 11 9 z",
                    onclick: function () {
                        this.#showTSInfo();
                    },
                },
                dataZoom: {
                    yAxisIndex: "none",
                },
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
        dataZoom: [
            {
                type: "slider",
                bottom: 50,
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
                nameLocation: "middle",
                axisLabel: {},
                position: "left",
                scale: true,
            },
            {
                type: "value",
                nameLocation: "middle",
                axisLabel: {},
                position: "right",
                scale: true,
            },
        ],
        series: [],
        useUTC: false,
    };

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

    constructor(options = null, theme = null) {
        super();

        this.#initOptions = options || this.#initOptions;
        this.#theme = theme;
    }

    #initEventListeners() {
        window.addEventListener("resize", (event) => {
            this.resize();
        });

        window.addEventListener("unload", (event) => {
            this.dispose();
        });
    }

    #showTSInfo(tsInfoCallback = null) {
        tsInfoCallback?.();
    }

    #optionToContent(opt, dataset, timeFormat) {
        let timestamps = opt.series[0].data.map((serieData) => {
            return echarts.time.format(serieData[0], timeFormat);
        });

        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("m-2", "me-3");

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
            tableHeadThElmt.innerText = serie.name + (serie.unit ? ` (${serie.unit})`: "");
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
                if (serie.data && serie.data[index]) {
                    let tableCellElmt = document.createElement("td");
                    tableCellElmt.innerText = serie.data[index][1].toString();
                    tableTrElmt.appendChild(tableCellElmt);
                }
            }
            tableBodyElmt.appendChild(tableTrElmt);
        }
        tableElmt.appendChild(tableBodyElmt);

        tableContainerElmt.appendChild(tableElmt);
        mainContainerElmt.appendChild(tableContainerElmt);
        return mainContainerElmt;
    }

    #tooltipFormatter(params, dataset, timeFormat) {
        let tooltipContainerElmt = document.createElement("div");

        let ulElmt = document.createElement("ul");
        ulElmt.classList.add("list-unstyled", "mx-2", "mt-2", "mb-0");

        for (let [index, serieParams] of params.entries()) {
            if (index == 0) {
                let timeElmt = document.createElement("h6");
                timeElmt.innerText = echarts.time.format(serieParams.value[0], timeFormat);
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
            for (let [key, value] of Object.entries(dataset)) {
                for (let [key2, value2] of Object.entries(value)) {
                    if (value2.name == serieParams.seriesName) {
                        serieValueUnitElmt.innerText = value2.timeseries.unit_symbol;
                    }
                }
            }
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

    load(name, dataset, timeFormat, tsInfoCallback = null) {
        this.hideLoading();

        let options = this.#chart.getOption();
        let listUnit = {0: [], 1: []};

        options.legend[0].data = [];
        options.legend[1].data = [];

        options.title[0].text = `${name}`;
        
        options.toolbox[0].feature.dataView.optionToContent = (opt) => { return this.#optionToContent(opt, dataset, timeFormat); };

        options.toolbox[0].feature.myTSInfo.onclick = () => { this.#showTSInfo(tsInfoCallback); };

        options.tooltip[0].formatter = (params) => { return this.#tooltipFormatter(params, dataset, timeFormat); };

        options.series.length = 0;

        let series = [];
        for (let [_parameter, serieParams] of Object.entries(dataset)) {
            for (let [_settings, value] of Object.entries(serieParams)) {
                let chartData = Object.entries(value.data).map(([date, value]) => [date, Parser.parseFloatOrDefault(value, Number.NaN, 2)]);
                if (chartData.length > 0) {
                    let serie = {
                        name: value.name,
                        type: "line",
                        data: Object.entries(value.data).map(([date, value]) => [date, Parser.parseFloatOrDefault(value, Number.NaN, 2)]),
                        emphasis: {
                            focus: "series"
                        },
                        itemStyle: {
                            color: this.#energyUseColors[value.name]
                        },
                        lineStyle: {
                            width: 2,
                            type: value.name.includes("forecast") ? "dashed" : "solid",
                        },
                        yAxisIndex: value.yAxis,
                        unit: value.timeseries.unit_symbol,
                        symbol: "path://",
                        connectNulls: true,
                    };
                    series.push(serie);
                    if (!listUnit[value.yAxis].includes(serie.unit))
                        listUnit[value.yAxis].push(serie.unit);

                    options.legend[value.yAxis].data.push(value.name);
                }
            }
        }
        options.series = series;

        options.yAxis[0].data = options.series.map((serie) => serie.name);
        options.yAxis[0].axisLabel.formatter = (value, index) => { return `${value} (${listUnit[0]})`; };

        options.yAxis[1].data = options.series.map((serie) => serie.name);
        options.yAxis[1].axisLabel.formatter = (value, index) => { return `${value} (${listUnit[1]})`; };

        if (options.legend[1].data.length == 0) {
            options.legend[0].left = "center";
            options.legend[0].width = "auto";
        };

        options.legend[0].formatter = (name) => {
            let serie = options.series.find((serie) => serie.name == name);
            return `${name} (${serie.unit})`;
        };

        options.legend[1].formatter = (name) => {
            let serie = options.series.find((serie) => serie.name == name);
            return `${name} (${serie.unit})`;
        };
        
        // Fix for bug, see: https://github.com/apache/incubator-echarts/issues/6202
        this.#chart.clear();

        this.#chart.setOption(options);
    }
}

if (window.customElements.get("app-ts-chart-weather") == null) {
    window.customElements.define("app-ts-chart-weather", TimeseriesChartWeather, { extends: "div" });
}
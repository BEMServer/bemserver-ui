import "https://cdn.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js";
import { Parser } from "../tools/parser.js";


export class TimeseriesEnergyConsumptionChart extends HTMLDivElement {

    #chart = null;

    #initOptions = {
        height: 500,
        width: "auto",
    };
    #theme = null;

    #defaultTitle = "Energy consumption";
    #defaultOptions = {
        title: {
            left: "center",
            text: this.#defaultTitle,
            subtextStyle: {
                fontSize: 14,
            },
        },
        grid: {
            bottom: 110,
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: "none",
                },
                dataView: {
                    readOnly: true,
                    optionToContent: (opt) => { return this.#optionToContent(opt); },
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
            bottom: 10,
        },
        dataZoom: [
            {
                type: "slider",
                bottom: 50,
            },
        ],
        xAxis: [
            {
                type: "category",
            },
        ],
        yAxis: [
            {
                nameLocation: "middle",
                nameGap: 40,
            },
        ],
        series: [],
        useUTC: true,
    };

    #energyUseColors = {
        "all": "#6e8a98",
        "heating": "#ee6666",
        "cooling": "#73c0de",
        "ventilation": "#3ba272",
        "lighting": "#fac858",
        "appliances": "#9a60b4",
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

    #optionToContent(opt) {
        let axisData = opt.xAxis[0].data;
        let series = opt.series;

        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("table-responsive", "m-2", "me-3");

        let tableElmt = document.createElement("table");
        tableElmt.classList.add("table", "table-sm", "table-hover", "table-bordered", "caption-top");
        let tableCaptionElmt = document.createElement("caption");
        tableCaptionElmt.classList.add("fst-italic", "text-muted", "text-end");
        tableCaptionElmt.innerText = `${axisData.length.toString()} rows`;
        tableElmt.appendChild(tableCaptionElmt);
        let tableHeadElmt = document.createElement("thead");
        let tableHeadTrElmt = document.createElement("tr");
        let tableHeadTimestampElmt = document.createElement("th");
        tableHeadTimestampElmt.setAttribute("scope", "col");
        tableHeadTimestampElmt.innerText = "Timestamp";
        tableHeadTrElmt.appendChild(tableHeadTimestampElmt);
        for (let serie of series) {
            let tableHeadThElmt = document.createElement("th");
            tableHeadThElmt.setAttribute("scope", "col");
            tableHeadThElmt.innerText = serie.name;
            tableHeadTrElmt.appendChild(tableHeadThElmt);
        }
        tableHeadElmt.appendChild(tableHeadTrElmt);
        tableElmt.appendChild(tableHeadElmt);
        let tableBodyElmt = document.createElement("tbody");
        tableBodyElmt.classList.add("table-group-divider");
        for (let i = 0 ; i < axisData.length ; i++) {
            let tableTrElmt = document.createElement("tr");
            let tableCellTimestampElmt = document.createElement("td");
            tableCellTimestampElmt.innerText = axisData[i];
            tableTrElmt.appendChild(tableCellTimestampElmt);
            for (let j = 0 ; j < series.length ; j++) {
                let tableCellElmt = document.createElement("td");
                tableCellElmt.innerText = series[j].data[i];
                tableTrElmt.appendChild(tableCellElmt);
            }
            tableBodyElmt.appendChild(tableTrElmt);
        }
        tableElmt.appendChild(tableBodyElmt);

        mainContainerElmt.appendChild(tableElmt);
        return mainContainerElmt;
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

    load(energySource, energyUses, timestamps) {
        this.hideLoading();

        let options = this.#chart.getOption();

        options.title[0].subtext = `energy source: ${energySource}`;
        options.toolbox[0].feature.dataView.lang[0] = `Energy consumption data [${energySource}]`;

        options.series.length = 0;
        options.series = Object.entries(energyUses).map(([energyUse, consumptions]) => {
            let serie = {
                id: energyUse,
                name: energyUse,
                type: "bar",
                data: consumptions.map((consumption) => {
                    return Parser.parseFloatOrDefault(consumption, null, 2);
                }),
                emphasis: {
                    focus: "series",
                },
                itemStyle: {},
            };
            if (energyUse != "all") {
                serie.stack = energySource;
            }
            if (energyUse in this.#energyUseColors) {
                serie.itemStyle.color = this.#energyUseColors[energyUse];
            }
            return serie;
        });

        options.xAxis[0].data = timestamps;
        options.yAxis[0].data = options.series.map((serie) => {
            return serie.name;
        });

        // Fix for bug, see: https://github.com/apache/incubator-echarts/issues/6202
        this.#chart.clear();

        this.#chart.setOption(options);
    }
}


if (customElements.get("app-ts-energy-cons-chart") == null) {
    customElements.define("app-ts-energy-cons-chart", TimeseriesEnergyConsumptionChart, { extends: "div" });
}

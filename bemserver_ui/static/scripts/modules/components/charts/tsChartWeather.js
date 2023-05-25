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
            },
            {
                type: "value",
                nameLocation: "middle",
                axisLabel: {},
                position: "right",
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

    #optionToContent(opt, unit, timeFormat) {
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
            tableHeadThElmt.innerText = `${serie.name}${unit ? ` (${unit})`: ""}`;
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
            if (unit.length > 1) { serieValueUnitElmt.innerText = unit[index];}
            else { serieValueUnitElmt.innerText = unit;}
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

    load(timestamps, energy, energyUses, timeFormat, parameters) {
        this.hideLoading();

        let options = this.#chart.getOption();
        let yAxisIndex = 0;
        console.log(timeFormat);

        options.title[0].text = `${energy}`;
        options.toolbox[0].feature.dataView.optionToContent = (opt) => { return this.#optionToContent(opt, parameters.unit, timeFormat); };

        options.tooltip[0].formatter = (params) => { return this.#tooltipFormatter(params, parameters.unit, timeFormat); };
        
        options.series.length = 0;
        options.series = Object.entries(energyUses).map(([energyUse, consumptions]) => {
            if(energy == "Outdoor conditions") {
                if (energyUse.includes("Relative humidity")) {
                    yAxisIndex = 1;
                }
                else {
                    yAxisIndex = 0;
                }
                yAxisIndex == 0 ? options.legend[0].data.push(energyUse) : options.legend[1].data.push(energyUse);
                options.legend[0].formatter = (name) => {
                    return name ;
                };
                options.legend[1].formatter = (name) => {
                    return name ;
                };
            }
            else {
                options.legend[0] = {
                    type: "scroll",
                    bottom: 10,
                }
            }
            
            let serie = {
                id: energyUse,
                name: energyUse,
                type: parameters.type,
                data: timestamps.map((time, index) => {
                    return [time, Parser.parseFloatOrDefault(consumptions[index], Number.NaN, 2)];
                }),
                emphasis: {
                    focus: "series",
                },
                itemStyle: {},
                yAxisIndex: yAxisIndex,
            };

            if (energyUse in this.#energyUseColors) {
                serie.itemStyle.color = this.#energyUseColors[energyUse];
            }
            if (energyUse.includes("forecast")) {
                serie.lineStyle = {
                    type: "dashed",
                };
            }
            return serie;
        });

        options.yAxis[0].data = options.series.map((serie) => {
            return serie.name;
        });
        
        options.yAxis[0].axisLabel.formatter = `{value} ${parameters.unit[0]}`;

        options.yAxis[1].data = options.series.map((serie) => {
            return serie.name;
        });
        
        options.yAxis[1].axisLabel.formatter = `{value} ${parameters.unit[1]}`;


        // Fix for bug, see: https://github.com/apache/incubator-echarts/issues/6202
        this.#chart.clear();

        this.#chart.setOption(options);
    }
}


if (window.customElements.get("app-ts-chart-energy-cons") == null) {
    window.customElements.define("app-ts-chart-energy-cons", TimeseriesChartWeather, { extends: "div" });
}

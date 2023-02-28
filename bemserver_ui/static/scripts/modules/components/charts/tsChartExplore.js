import "https://cdn.jsdelivr.net/npm/echarts@5.4.1/dist/echarts.min.js";
import { Parser } from "../../tools/parser.js";
import { TimeDisplay } from "../../tools/time.js";


export class TimeseriesChartExplore extends HTMLDivElement {

    #chart = null;

    #initOptions = {
        height: 500,
    };
    #theme = null;

    #downloadCSVUrl = null;

    #defaultTitle = "Timeseries data";
    #defaultOptions = {
        title: {
            left: "center",
            text: this.#defaultTitle,
            subtextStyle: {
                fontSize: 14,
            },
        },
        grid: {
            left: "5%",
            right: "5%",
            bottom: 100,
            containLabel: true,
        },
        toolbox: {
            feature: {
                magicType: {
                    type: ["line", "bar"],
                    show: false,
                },
                dataZoom: {
                    yAxisIndex: "none",
                },
                dataView: {
                    readOnly: true,
                    buttonColor: "#95c11a",
                },
                saveAsImage: {},
                myDownloadCSV: {
                    show: false,
                    title: "Download as CSV",
                    icon: `image://data:image/svg+xml,
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-filetype-csv" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5ZM3.517 14.841a1.13 1.13 0 0 0 .401.823c.13.108.289.192.478.252.19.061.411.091.665.091.338 0 .624-.053.859-.158.236-.105.416-.252.539-.44.125-.189.187-.408.187-.656 0-.224-.045-.41-.134-.56a1.001 1.001 0 0 0-.375-.357 2.027 2.027 0 0 0-.566-.21l-.621-.144a.97.97 0 0 1-.404-.176.37.37 0 0 1-.144-.299c0-.156.062-.284.185-.384.125-.101.296-.152.512-.152.143 0 .266.023.37.068a.624.624 0 0 1 .246.181.56.56 0 0 1 .12.258h.75a1.092 1.092 0 0 0-.2-.566 1.21 1.21 0 0 0-.5-.41 1.813 1.813 0 0 0-.78-.152c-.293 0-.551.05-.776.15-.225.099-.4.24-.527.421-.127.182-.19.395-.19.639 0 .201.04.376.122.524.082.149.2.27.352.367.152.095.332.167.539.213l.618.144c.207.049.361.113.463.193a.387.387 0 0 1 .152.326.505.505 0 0 1-.085.29.559.559 0 0 1-.255.193c-.111.047-.249.07-.413.07-.117 0-.223-.013-.32-.04a.838.838 0 0 1-.248-.115.578.578 0 0 1-.255-.384h-.765ZM.806 13.693c0-.248.034-.46.102-.633a.868.868 0 0 1 .302-.399.814.814 0 0 1 .475-.137c.15 0 .283.032.398.097a.7.7 0 0 1 .272.26.85.85 0 0 1 .12.381h.765v-.072a1.33 1.33 0 0 0-.466-.964 1.441 1.441 0 0 0-.489-.272 1.838 1.838 0 0 0-.606-.097c-.356 0-.66.074-.911.223-.25.148-.44.359-.572.632-.13.274-.196.6-.196.979v.498c0 .379.064.704.193.976.131.271.322.48.572.626.25.145.554.217.914.217.293 0 .554-.055.785-.164.23-.11.414-.26.55-.454a1.27 1.27 0 0 0 .226-.674v-.076h-.764a.799.799 0 0 1-.118.363.7.7 0 0 1-.272.25.874.874 0 0 1-.401.087.845.845 0 0 1-.478-.132.833.833 0 0 1-.299-.392 1.699 1.699 0 0 1-.102-.627v-.495Zm8.239 2.238h-.953l-1.338-3.999h.917l.896 3.138h.038l.888-3.138h.879l-1.327 4Z"/>
</svg>`,
                    onclick: () => {
                        this.#downloadCSV();
                    },
                },
            },
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
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
                position: "left",
            },
            {
                type: "value",
                nameLocation: "middle",
                position: "right",
            },
        ],
        series: [],
        useUTC: false,
    };

    #colors = [
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de',
        '#3ba272',
        '#fc8452',
        '#9a60b4',
        '#ea7ccc'
    ];

    get colors() {
        return this.#colors;
    }

    // `theme` parameter can be "dark"
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

    connectedCallback() {
        this.#chart = echarts.init(this, this.#theme, this.#initOptions);
        this.#chart.setOption(this.#defaultOptions);

        this.#initEventListeners();
    }

    #optionToContent(opt, units, timeFormat, tzName) {
        let timestamps = opt.series[0].data.map((serieData) => {
            if (timeFormat != null) {
                return echarts.time.format(serieData[0], timeFormat);
            }
            else {
                return TimeDisplay.toLocaleString(new Date(serieData[0]), { timezone: tzName });
            }
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
        for (let [index, serie] of opt.series.entries()) {
            let tableHeadThElmt = document.createElement("th");
            tableHeadThElmt.setAttribute("scope", "col");
            if (units != null) {
                tableHeadThElmt.innerText = `${serie.name}${units[index] ? ` (${units[index]})`: ""}`;
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
                tableCellElmt.innerText = Parser.parseFloatOrDefault(serie.data[index][1], Number.NaN, 2);
                tableTrElmt.appendChild(tableCellElmt);
            }
            tableBodyElmt.appendChild(tableTrElmt);
        }
        tableElmt.appendChild(tableBodyElmt);

        tableContainerElmt.appendChild(tableElmt);
        mainContainerElmt.appendChild(tableContainerElmt);
        return mainContainerElmt;
    }

    #tooltipFormatter(params, units, timeFormat, tzName) {
        let tooltipContainerElmt = document.createElement("div");

        let ulElmt = document.createElement("ul");
        ulElmt.classList.add("list-unstyled", "mx-2", "mt-2", "mb-0");

        for (let [index, serieParams] of params.entries()) {
            if (index == 0) {
                let timeElmt = document.createElement("h6");
                if (timeFormat != null) {
                    timeElmt.innerText = echarts.time.format(serieParams.value[0], timeFormat);
                }
                else {
                    timeElmt.innerText = TimeDisplay.toLocaleString(new Date(serieParams.value[0]), { timezone: tzName });
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

            if (units != null) {
                let serieValueUnitElmt = document.createElement("small");
                serieValueUnitElmt.innerText = units[index];
                serieValueContainerElmt.appendChild(serieValueUnitElmt);
            }

            liElmt.appendChild(serieNameElmt);
            liElmt.appendChild(serieValueContainerElmt);
        }

        tooltipContainerElmt.appendChild(ulElmt);
        return tooltipContainerElmt;
    }

    #downloadCSV() {
        if (this.#downloadCSVUrl != null) {
            let link = document.createElement("a");
            link.setAttribute("href", this.#downloadCSVUrl);
            link.click();
        }
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

    load(data, parameters) {
        this.hideLoading();
        let listUnit = [];
        let listDistinctUnitByAxis = { 0: [], 1: [], };
        let yAxisIndex = 0;
        let options = this.#chart.getOption();
        options.legend[0].data = [];
        options.legend[1].data = [];

        options.title[0].subtext = parameters.subtitle;
        options.toolbox[0].feature.dataView.lang[0] = this.#defaultTitle;

        options.series.length = 0;
        options.series = data.ts_headers.filter((header) => {
            return header != "Datetime";
        }).map((header) => {
            parameters.series[header]?.position == "right" ? yAxisIndex = 1 : yAxisIndex = 0;
            yAxisIndex == 0 ? options.legend[0].data.push(header) : options.legend[1].data.push(header);

            let unitSymbol = parameters.series[header]?.symbol;
            listUnit.push(unitSymbol);
            if (unitSymbol != null && unitSymbol != "" && !listDistinctUnitByAxis[yAxisIndex].includes(unitSymbol)) {
                listDistinctUnitByAxis[yAxisIndex].push(unitSymbol);
            }

            return {
                id: header,
                name: header,
                type: parameters.series[header]?.type || "line",
                color: parameters.series[header]?.color || "#000000",
                lineStyle: {
                    width: 2,
                    type: parameters.series[header]?.style || "solid",
                },
                yAxisIndex: yAxisIndex,
                smooth: true,
                data: data.ts_data.map((row) => {
                    return [row["Datetime"], Parser.parseFloatOrDefault(row[header], Number.NaN, 2)];
                }),
            };
        });

        // Set distinct unit symbols as (left and right) Y-axis name.
        options.yAxis[0].name = listDistinctUnitByAxis[0].join(", ");
        options.yAxis[0].nameLocation = "middle";
        options.yAxis[0].nameGap = 50;
        options.yAxis[1].name = listDistinctUnitByAxis[1].join(", ");
        options.yAxis[1].nameLocation = "middle";
        options.yAxis[1].nameGap = 50;

        options.toolbox[0].feature.dataView.optionToContent = (opt) => { return this.#optionToContent(opt, listUnit, null, parameters.timezone); };
        options.tooltip[0].formatter = (params) => { return this.#tooltipFormatter(params, listUnit, null, parameters.timezone);};

        options.legend[0].formatter = (name) => {
            return name + " [" + parameters.series[name]?.symbol + "] ";
        };
        options.legend[1].formatter = (name) => {
            return name + " [" + parameters.series[name]?.symbol + "] ";
        };

        // Fix for bug, see: https://github.com/apache/incubator-echarts/issues/6202
        this.#chart.clear();

        this.#chart.setOption(options);
    }

    setDownloadCSVLink(url) {
        this.#downloadCSVUrl = url;

        let options = this.#chart.getOption();
        options.toolbox[0].feature.myDownloadCSV.show = true;
        this.#chart.setOption(options);
    }

    removeDownloadCSVLink() {
        this.#downloadCSVUrl = null;

        let options = this.#chart.getOption();
        options.toolbox[0].feature.myDownloadCSV.show = false;
        this.#chart.setOption(options);
    }
}


if (window.customElements.get("app-ts-chart-explore") == null) {
    window.customElements.define("app-ts-chart-explore", TimeseriesChartExplore, { extends: "div" });
}

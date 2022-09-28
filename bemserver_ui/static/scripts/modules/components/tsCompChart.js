import { Parser } from "../tools/parser.js";
import { TimeDisplay } from "../tools/time.js";


export class TimeseriesCompletenessChart extends HTMLDivElement {

    #chart = null;

    #initOptions = {
        height: 400,
    };
    #theme = null;

    #defaultTitle = "Data completeness";
    #defaultOptions = {
        title: {
            left: "center",
            text: this.#defaultTitle,
        },
        grid: {
            bottom: 80,
            right: 120,
        },
        toolbox: {
            feature: {
                dataZoom: {
                    yAxisIndex: "none",
                },
                saveAsImage: {},
            },
        },
        tooltip: {
            trigger: "item",
        },
        dataZoom: [
            {
                type: "slider",
            },
            {
                type: "slider",
                yAxisIndex: 0,
                zoomLock: true,
                width: 20,
                right: 100,
                bottom: 80,
                start: 0,
                end: 100,
                handleSize: 0,
                showDetail: false,
            },
            {
                type: "inside",
                id: "insideY",
                yAxisIndex: 0,
                zoomLock: true,
                start: 0,
                end: 100,
                zoomOnMouseWheel: false,
                moveOnMouseMove: true,
                moveOnMouseWheel: true,
            }
        ],
        xAxis: [
            {
                type: "category",
                splitArea: {
                    show: true,
                },
            },
        ],
        yAxis: [
            {
                type: "category",
                splitArea: {
                    show: true,
                },
                nameLocation: "middle",
                nameGap: 40,
            },
        ],
        visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: "vertical",
            inRange: {
                color: ["#dc3545", "#fd7e14", "#ffc107", "#198754"],
            },
            right: 10,
            top: "center",
        },
        series: [],
        useUTC: true,
    };

    constructor(options = null, theme = null) {
        super();

        this.#initOptions = options || this.#initOptions;
        this.#theme = theme;
    }

    #initEventListeners() {
        window.onresize = () => {
            this.#chart.resize();
        };
    }

    connectedCallback() {
        this.#chart = echarts.init(this, this.#theme, this.#initOptions);
        this.#chart.setOption(this.#defaultOptions);

        this.#initEventListeners();
    }

    showLoading() {
        this.#chart.showLoading();
    }

    hideLoading() {
        this.#chart.hideLoading();
    }

    load(data, displayTime, tzName) {
        this.hideLoading();

        let options = this.#chart.getOption();

        options.title[0].subtext = `${data.period} - ${data.datastate_name}`;

        let timestamps = data["timestamps"].map((timestamp) => {
            if (displayTime) {
                let tsDate = new Date(timestamp);
                return !isNaN(tsDate) ? TimeDisplay.toLocaleString(tsDate, { timezone: tzName }).replace(" ", "\n") : null;
            }
            else {
                return timestamp.substring(0, 10);
            }
        });

        options.series.length = 0;
        options.series = Object.entries(data["timeseries"]).map(([tsId, tsInfo], yIndex) => {
            return {
                id: tsId,
                name: tsInfo.name,
                type: "heatmap",
                data: tsInfo["ratio"].map((ratio, xIndex) => {
                    return [xIndex, yIndex, Parser.parseFloatOrDefault(ratio, 0.0, 2) * 100];
                }),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: "rgba(0, 0, 0, 1)",
                    }
                },
            };
        });

        options.tooltip[0].formatter = (p) => {
            let xIndex = p.data[0];
            let tsInfo = data["timeseries"][p.seriesId];
            let expCount = tsInfo.expected_count[xIndex];
            let interval = tsInfo.interval ? `${tsInfo.interval}s${tsInfo.undefined_interval ? " (auto)": ""}` : "no interval";

            return `<div class="hstack gap-3">
    <div class="fs-6 fw-bold">${p.seriesName}</div>
    <div class="opacity-75 ms-auto">ID #${p.seriesId}</div>
</div>
<div class="hstack gap-3 mb-2">
    <div class="fw-bold opacity-75">Interval</div>
    <div>${interval}</div>
</div>
<div class="fw-bold">${timestamps[xIndex]}<div>
<div class="hstack gap-3">
    <div class="fw-bold opacity-75">Completeness</div>
    <div class="fw-bold" style="color: ${p.color};">${p.data[2]}% (${tsInfo.count[xIndex]}/${expCount ? expCount.toFixed(0) : "?"})</div>
</div>`;
    };

        // Set the "series zoom" assuming that 25 is the minimum height (in pixel) of a serie.
        options.dataZoom[1].start = 100 * Math.max(0, 1 - (this.#chart.getHeight() / 25) / options.series.length);

        options.xAxis[0].data = timestamps;
        options.yAxis[0].data = options.series.map((serie) => {
            return serie.name;
        });

        this.#chart.setOption(options);
    }
}


if (customElements.get("app-ts-completeness-chart") == null) {
    customElements.define("app-ts-completeness-chart", TimeseriesCompletenessChart, { extends: "div" });
}
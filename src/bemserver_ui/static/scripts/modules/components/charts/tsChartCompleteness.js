import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


export class TimeseriesChartCompleteness extends ChartBase {

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
                bottom: 50,
                right: 140,
            },
            xAxis: {
                type: "category",
                axisLabel: {
                    color: "#333333",
                },
            },
            yAxis: {
                type: "category",
                nameLocation: "middle",
                axisLabel: {
                    color: "#333333",
                    width: 100,
                    overflow: "truncate",
                    hideOverlap: false,
                },
            },
            toolbox: [
                {
                    feature: {
                        dataView: {
                            show: false,
                        },
                    },
                },
            ],
            tooltip: {
                trigger: "item",
            },
            dataZoom: [
                {
                    type: "slider",
                    bottom: 10,
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
                text: ["Complete", "Empty"],
                formatter: (value) => {
                    return `${Parser.parseFloatOrDefault(value, 0.0, 0)}%`;
                }
            },
        });
    }

    #tooltipFormatter(params, timestamps, timeseriesInfo) {
        let xIndex = params.data[0];
        let timestamp = timestamps[xIndex];
        let tsInfo = timeseriesInfo[params.seriesId]
        let expCount = tsInfo.expected_count[xIndex];
        let interval = tsInfo.interval ? `${tsInfo.interval}s${tsInfo.undefined_interval ? " (auto)": ""}` : "no interval";

        let tooltipContainerElmt = document.createElement("div");

        let tooltipHeaderElmt = document.createElement("div");
        tooltipHeaderElmt.classList.add("hstack", "gap-3");
        tooltipHeaderElmt.style.maxWidth = "400px";
        tooltipContainerElmt.appendChild(tooltipHeaderElmt);

        let seriesNameElmt = document.createElement("div");
        seriesNameElmt.classList.add("fs-6", "fw-bold", "text-truncate");
        seriesNameElmt.textContent = params.seriesName;
        tooltipHeaderElmt.appendChild(seriesNameElmt);

        let seriesIdElmt = document.createElement("div");
        seriesIdElmt.classList.add("text-black", "text-opacity-50", "ms-auto");
        seriesIdElmt.textContent = `ID #${params.seriesId}`;
        tooltipHeaderElmt.appendChild(seriesIdElmt);

        let intervalContainerElmt = document.createElement("div");
        intervalContainerElmt.classList.add("hstack", "gap-3", "mb-2");
        tooltipContainerElmt.appendChild(intervalContainerElmt);

        let intervalTitleElmt = document.createElement("div");
        intervalTitleElmt.classList.add("fw-bold", "text-black", "text-opacity-50");
        intervalTitleElmt.textContent = "Interval";
        intervalContainerElmt.appendChild(intervalTitleElmt);

        let intervalValueElmt = document.createElement("div");
        intervalValueElmt.textContent = interval;
        intervalContainerElmt.appendChild(intervalValueElmt);

        let timestampElmt = document.createElement("div");
        timestampElmt.classList.add("fw-bold");
        timestampElmt.textContent = timestamp;
        tooltipContainerElmt.appendChild(timestampElmt);

        let completenessContainerElmt = document.createElement("div");
        completenessContainerElmt.classList.add("hstack", "gap-3");
        tooltipContainerElmt.appendChild(completenessContainerElmt);

        let completenessTitleElmt = document.createElement("div");
        completenessTitleElmt.classList.add("fw-bold", "text-black", "text-opacity-50");
        completenessTitleElmt.textContent = "Completeness";
        completenessContainerElmt.appendChild(completenessTitleElmt);

        let completenessValueElmt = document.createElement("div");
        completenessValueElmt.classList.add("fw-bold");
        completenessValueElmt.style.color = params.color;
        completenessValueElmt.textContent = `${params.data[2]}% (${tsInfo.count[xIndex]}/${expCount ? expCount.toFixed(0) : "?"})`;
        completenessContainerElmt.appendChild(completenessValueElmt);

        return tooltipContainerElmt;
    }

    load(data, displayTime) {
        let dataSeries = Object.entries(data["timeseries"]).map(([tsId, tsInfo], yIndex) => {
            return {
                id: tsId,
                name: tsInfo.name,
                type: "heatmap",
                data: tsInfo["ratio"].map((ratio, xIndex) => {
                    return [
                        xIndex,
                        yIndex,
                        Parser.parseFloatOrDefault(Parser.parseFloatOrDefault(ratio, 0.0, 2) * 100.0, 0.0, 0),
                    ];
                }),
                emphasis: {
                    itemStyle: {
                        borderColor: "#444444",
                        borderWidth: 1,
                    }
                },
            };
        });

        let options = {
            title: {
                subtext: `${data.period} | ${data.datastate_name}`,
            },
            series: dataSeries,
            tooltip: {
                formatter: (params) => {
                    return this.#tooltipFormatter(params, data["timestamps"], data["timeseries"]);
                },
            },
            xAxis: {
                data: data["timestamps"].map((timestamp) => {
                    return displayTime ? timestamp.replace("T", "\n") : timestamp.substring(0, 10);
                }),
            },
            yAxis: {
                data: dataSeries.map((serie) => {
                    return serie.name;
                }),
            },
        };

        this.setOption(options);
    }

    clear() {
        super.clear();
        this.showLoading();
        this.#initChartOptions();
        this.hideLoading();
    }
}

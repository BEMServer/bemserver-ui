import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { TimeDisplay } from "/static/scripts/modules/tools/time.js";


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
                    return `${value.toString()}%`;
                }
            },
            useUTC: true,
        });
    }

    load(data, displayTime, tzName) {
        let timestamps = data["timestamps"].map((timestamp) => {
            if (displayTime) {
                let tsDate = new Date(timestamp);
                return !isNaN(tsDate) ? TimeDisplay.toLocaleString(tsDate, { timezone: tzName }).replace(" ", "\n") : null;
            }
            else {
                return timestamp.substring(0, 10);
            }
        });

        let dataSeries = Object.entries(data["timeseries"]).map(([tsId, tsInfo], yIndex) => {
            return {
                id: tsId,
                name: tsInfo.name,
                type: "heatmap",
                data: tsInfo["ratio"].map((ratio, xIndex) => {
                    return [xIndex, yIndex, Parser.parseFloatOrDefault(Parser.parseFloatOrDefault(ratio, 0.0, 2) * 100.0, 0.0, 0)];
                }),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: "rgba(0, 0, 0, 1)",
                    }
                },
            };
        });

        let options = {
            title: {
                subtext: `${data.period} - ${data.datastate_name}`,
            },
            series: dataSeries,
            tooltip: {
                formatter: (p) => {
                    let xIndex = p.data[0];
                    let tsInfo = data["timeseries"][p.seriesId];
                    let expCount = tsInfo.expected_count[xIndex];
                    let interval = tsInfo.interval ? `${tsInfo.interval}s${tsInfo.undefined_interval ? " (auto)": ""}` : "no interval";

                    return `<div class="hstack gap-3" style="max-width: 400px;">
    <div class="fs-6 fw-bold text-truncate">${p.seriesName}</div>
    <div class="text-black text-opacity-50 ms-auto">ID #${p.seriesId}</div>
</div>
<div class="hstack gap-3 mb-2">
    <div class="fw-bold text-black text-opacity-50">Interval</div>
    <div>${interval}</div>
</div>
<div class="fw-bold">${timestamps[xIndex]}<div>
<div class="hstack gap-3">
    <div class="fw-bold text-black text-opacity-50">Completeness</div>
    <div class="fw-bold" style="color: ${p.color};">${p.data[2]}% (${tsInfo.count[xIndex]}/${expCount ? expCount.toFixed(0) : "?"})</div>
</div>`;
                },
            },
            xAxis: {
                data: timestamps,
            },
            yAxis: {
                data: dataSeries.map((serie) => {
                    return serie.name;
                }),
            },
        };

        this.setOption(options);
    }
}

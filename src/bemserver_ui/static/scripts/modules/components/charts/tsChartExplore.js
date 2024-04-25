import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


export class TimeseriesChartExplore extends ChartBase {

    #chartOpts = {};
    #currentSeriesIndex = 0;


    get seriesCount() {
        return this.#chartOpts.series.length;
    }


    constructor(chartContainerElmt, initOptions = null) {
        super(chartContainerElmt, initOptions);

        this.#initChartOptions();
        this.#chartOpts = this.getOption();

        this.registerEventCallback("legendselectchanged", (params) => {
            // Get series id from name.
            let seriesIndex = this.#getSeriesIndexFromName(params.name);
            let seriesID = this.#chartOpts.series[seriesIndex].id;
            let isVisible = params.selected[params.name];
    
            this.#chartOpts.series[seriesIndex].visible = isVisible;
            this.#updateYAxisName(true);
    
            let seriesVisibilityEvent = new CustomEvent(
                "seriesVisibilityChanged",
                { detail: { id: seriesID, visibility: isVisible }, bubbles: true },
            );
            this.dispatchEvent(seriesVisibilityEvent);
        });
        this.registerEventCallback("showLoadingPre", () => {
            // Hide "No data" title.
            this.#hideNoData(true);
        });
        this.registerEventCallback("hideLoadingPost", () => {
            // Show "No data" title when chart has no series.
            if (this.#chartOpts.series.length <= 0) {
                this.#showNoData(true);
            }
        });
    }

    #initChartOptions() {
        // Some IDs are use in the "normalMerge" strategy of echarts (yAxis, dataZoom...).
        this.setOption({
            title: {
                top: "middle",
                left: "center",
                text: "No data",
                subtext: "Select timeseries to display",
            },
            grid: {
                bottom: 90,
            },
            xAxis: [
                {
                    type: "time",
                },
            ],
            yAxis: [
                {
                    id: "y-axis1",
                    type: "value",
                },
                {
                    id: "y-axis2",
                    type: "value",
                    position: "right",
                },
            ],
            legend: [
                {
                    id: "legend-left",
                    type: "scroll",
                    width: "auto",
                    bottom: 0,
                    left: 0,
                    data: [],
                },
                {
                    id: "legend-right",
                    type: "scroll",
                    width: "45%",
                    bottom: 0,
                    right: 0,
                    show: false,
                    data: [],
                },
            ],
            toolbox: {
                feature: {
                    dataView: {
                        readOnly: true,
                        buttonColor: "#95c11a",
                        optionToContent: (opt) => { return this.#optionToContent(opt); },
                    },
                    saveAsImage: {},
                },
            },
            tooltip: {
                axisPointer: {
                    type: "cross",
                },
                valueFormatter: (value) => { return Parser.parseFloatOrDefault(value, Number.NaN, 2) },
            },
            dataZoom: [
                {
                    id: "dataZoom-slider",
                    type: "slider",
                    bottom: 50,
                },
                {
                    id: "dataZoom-inside",
                    type: "inside",
                },
            ],
        });
    }

    // showLoading() {
    //     // Hide "No data" title.
    //     this.#hideNoData(true);

    //     super().showLoading();
    // }

    // hideLoading() {
    //     super().hideLoading();

    //     // Show "No data" title when chart has no series.
    //     if (this.#chartOpts.series.length <= 0) {
    //         this.#showNoData(true);
    //     }
    // }

    getNextColor() {
        let chatColors = this.#chartOpts.color;
        let seriesColor = chatColors[this.#currentSeriesIndex % chatColors.length];
        this.#currentSeriesIndex += 1;
        return seriesColor;
    }

    #showNoData(applyOption = false) {
        this.#chartOpts.dataZoom[0].zoomLock = true;
        this.#chartOpts.dataZoom[1].zoomLock = true;

        if (!this.#chartOpts.title[0].show) {
            this.#chartOpts.title[0].show = true;
            if (applyOption) {
                this.#setChartOptions();
            }
        }
    }

    #hideNoData(applyOption = false) {
        this.#chartOpts.dataZoom[0].zoomLock = false;
        this.#chartOpts.dataZoom[1].zoomLock = false;

        if (this.#chartOpts.title[0].show) {
            this.#chartOpts.title[0].show = false;
            if (applyOption) {
                this.#setChartOptions();
            }
        }
    }

    #hasSeries(id) {
        let seriesIDs = this.#chartOpts.series.map((series) => { return series.id });
        return seriesIDs.includes(id);
    }

    #updateLegend(applyOption = false) {
        // Does right Y-axis has series?
        if (this.#chartOpts.series.filter((series) => series.yAxisIndex == 1).length <= 0) {
            this.#chartOpts.legend[1].show = false;
            this.#chartOpts.legend[0].width = "auto";
        }
        else {
            this.#chartOpts.legend[1].show = true;
            this.#chartOpts.legend[0].width = "45%";
        }

        if (applyOption) {
            this.#setChartOptions();
        }
    }

    #prepareSeriesData(data) {
        return Object.entries(data || {}).map(([timestamp, value]) => {
            return [timestamp, Parser.parseFloatOrDefault(value, Number.NaN, 2)];
        });
    }

    #optionToContent(opt) {
        let mainContainerElmt = document.createElement("div");
        mainContainerElmt.classList.add("m-2", "me-3");

        if (opt.series.length > 0) {
            let timestamps = opt.series[0].data.map((serieData) => {
                return echarts.time.format(serieData[0], "{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}");
            });

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
            for (let series of opt.series) {
                let tableHeadThElmt = document.createElement("th");
                tableHeadThElmt.setAttribute("scope", "col");
                tableHeadThElmt.innerText = `${series.name}${series.aggregation != null ? ` ${series.aggregation}` : ""}`;
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
                for (let series of opt.series) {
                    let tableCellElmt = document.createElement("td");
                    tableCellElmt.innerText = Parser.parseFloatOrDefault(series.data[index][1], Number.NaN, 2);
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

    #getSeriesIndex(id) {
        let seriesIDs = this.#chartOpts.series.map((series) => { return series.id.toString(); });
        return seriesIDs.indexOf(id.toString());
    }

    #getSeriesIndexFromName(name) {
        let seriesNames = this.#chartOpts.series.map((series) => { return series.name; });
        return seriesNames.indexOf(name.toString());
    }

    #updateYAxisName(applyOption = false) {
        let yAxisNames = {
            0: {
                id: "y-axis1",
                names: [],
            },
            1: {
                id: "y-axis2",
                names: [],
            },
        };
        for (let series of this.#chartOpts.series) {
            if ((series.visible == null || series.visible) && series.unitSymbol != null && !yAxisNames[series.yAxisIndex].names.includes(series.unitSymbol)) {
                yAxisNames[series.yAxisIndex].names.push(series.unitSymbol);
            }
        }
        for (let [yAxisIndex, opts] of Object.entries(yAxisNames)) {
            this.#chartOpts.yAxis[yAxisIndex].id = opts.id;
            this.#chartOpts.yAxis[yAxisIndex].name = opts.names.join(", ");
        }

        if (applyOption) {
            this.#setChartOptions();
        }
    }

    #setChartOptions() {
        // TODO: keep dataZoom values?

        this.setOption(this.#chartOpts);
    }

    addSeries(seriesParams, data = null) {
        if (!this.#hasSeries(seriesParams.id)) {
            seriesParams.data = this.#prepareSeriesData(data);
            this.#chartOpts.legend[seriesParams.yAxisIndex].data.push(seriesParams.name);
            this.#chartOpts.series.push(seriesParams);

            if (this.#chartOpts.series.length > 0) {
                this.#hideNoData();
            }

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();

            this.#currentSeriesIndex += 1;
        }
    }

    updateSeries(seriesParams, yAxisIndexChanged = false) {
        let seriesIndex = this.#getSeriesIndex(seriesParams.id);
        if (seriesIndex != -1) {
            // Update series color.
            if (seriesParams.color != null) {
                this.#chartOpts.series[seriesIndex].color = seriesParams.color;
            }
            else {
                delete this.#chartOpts.series[seriesIndex].color;
            }
            // Update series type.
            this.#chartOpts.series[seriesIndex].type = seriesParams.type;
            // Update series lineStyle.
            if (seriesParams.lineStyle != null) {
                this.#chartOpts.series[seriesIndex].lineStyle = {...this.#chartOpts.series[seriesIndex].lineStyle, ...seriesParams.lineStyle};
            }
            else {
                delete this.#chartOpts.series[seriesIndex].lineStyle;
            }
            // Update series symbol.
            if (seriesParams.symbol != null) {
                this.#chartOpts.series[seriesIndex].symbol = seriesParams.symbol;
            }
            else {
                delete this.#chartOpts.series[seriesIndex].symbol;
            }
            if (seriesParams.showSymbol != null) {
                this.#chartOpts.series[seriesIndex].showSymbol = seriesParams.showSymbol;
            }
            else {
                delete this.#chartOpts.series[seriesIndex].showSymbol;
            }

            // Update decal itemStyle.
            if (this.#chartOpts.series[seriesIndex].itemStyle == null) {
                this.#chartOpts.series[seriesIndex].itemStyle = {};
            }
            if (seriesParams.itemStyle != null && seriesParams.itemStyle.decal != null) {
                this.#chartOpts.series[seriesIndex].itemStyle.decal = seriesParams.itemStyle.decal;
            }
            else if (this.#chartOpts.series[seriesIndex].itemStyle.decal != null) {
                delete this.#chartOpts.series[seriesIndex].itemStyle.decal;
            }

            // Update stack.
            if (seriesParams.stack != null) {
                this.#chartOpts.series[seriesIndex].stack = seriesParams.stack;
            }
            else {
                delete this.#chartOpts.series[seriesIndex].stack;
            }

            // Update series Y-axis position.
            this.#chartOpts.series[seriesIndex].yAxisIndex = seriesParams.yAxisIndex;
            // When Y-axis changed, update left and right legends.
            if (yAxisIndexChanged) {
                let previousYAxisIndex = seriesParams.yAxisIndex == 0 ? 1 : 0;
                this.#chartOpts.legend[previousYAxisIndex].data = this.#chartOpts.legend[previousYAxisIndex].data.filter(serieName => serieName != seriesParams.name);
                this.#chartOpts.legend[seriesParams.yAxisIndex].data.push(seriesParams.name);
            }

            // Set series visibility.
            this.#chartOpts.series[seriesIndex].visible = seriesParams.visible;

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();
        }
    }

    updateSeriesData(id, data, options = { aggregation: null }) {
        let seriesIndex = this.#getSeriesIndex(id);
        if (seriesIndex != -1) {
            this.#chartOpts.series[seriesIndex].data = this.#prepareSeriesData(data);
            this.#chartOpts.series[seriesIndex].aggregation = options.aggregation;

            this.#setChartOptions();
        }
    }

    toggleSeriesVisibility(id) {
        if (this.#hasSeries(id)) {
            let seriesIndex = this.#getSeriesIndex(id);
            let series = this.#chartOpts.series[seriesIndex];

            let actionType = "legendToggleSelect";
            this.dispatchAction({
                type: actionType,
                name: series.name,
            });
        }
    }

    removeSeries(id) {
        if (this.#hasSeries(id)) {
            this.clear();

            let seriesIndex = this.#getSeriesIndex(id);
            let series = this.#chartOpts.series[seriesIndex];
            if (this.#chartOpts.legend[series.yAxisIndex].selected) {
                delete this.#chartOpts.legend[series.yAxisIndex].selected[series.name];
            }
            this.#chartOpts.legend[series.yAxisIndex].data = this.#chartOpts.legend[series.yAxisIndex].data.filter(seriesName => seriesName != series.name);
            this.#chartOpts.series = this.#chartOpts.series.filter(series => series.id != id);

            if (this.#chartOpts.series.length <= 0) {
                this.#showNoData();
                this.#currentSeriesIndex = 0;
            }

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();
        }
    }

    clearAll() {
        this.clear();

        this.#chartOpts.series = [];
        for (let leg of this.#chartOpts.legend) {
            leg.data = [];
            leg.selected = {};
        }
        this.#updateYAxisName();
        this.#updateLegend();
        this.#showNoData();
        this.#setChartOptions();
        this.#currentSeriesIndex = 0;
    }

    refresh() {
        this.#updateYAxisName();
        this.#updateLegend();
        this.#setChartOptions();
    }
}

import { ChartBase } from "/static/scripts/modules/components/charts/common.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";


export class TimeseriesChartExplore extends ChartBase {

    #chartOpts = {};
    #currentSeriesIndex = 0;
    #datetimeFormat = "{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}";


    get seriesCount() {
        return this.#chartOpts.series.length;
    }

    get seriesDataCount() {
        return this.#chartOpts.series.reduce((accumulator, currentSeries) => {
            return accumulator + currentSeries.data.length;
        }, 0);
    }


    constructor(chartContainerElmt, initOptions = null) {
        super(chartContainerElmt, initOptions);

        this.#initChartOptions();
        this.#chartOpts = this.getOption();

        this.registerEvent("legendselectchanged", (params) => {
            // Get series id from name.
            let seriesIndex = this.#getSeriesIndexFromName(params.name);
            let seriesID = this.#chartOpts.series[seriesIndex].id;
            let tsID = this.#chartOpts.series[seriesIndex].timeseriesID;
            let isVisible = params.selected[params.name];
    
            this.#chartOpts.series[seriesIndex].visible = isVisible;
            this.#updateYAxisName(true);
    
            let seriesVisibilityEvent = new CustomEvent(
                "seriesVisibilityChanged",
                { detail: { id: seriesID, timeseriesID: tsID, visibility: isVisible }, bubbles: true },
            );
            this.dispatchEvent(seriesVisibilityEvent);
        });
    }

    #initChartOptions() {
        // IDs are used in the "merge" strategy of echarts to update elements (yAxis, dataZoom...).
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

    showLoading() {
        // Hide "No data" title.
        this.#hideNoData(true);

        super.showLoading();
    }

    hideLoading() {
        super.hideLoading();

        // Show "No data" title when chart has no series or no data in series.
        if (this.seriesDataCount <= 0) {
            this.#showNoData(true);
        }
    }

    getNextColor() {
        let chatColors = this.#chartOpts.color;
        let seriesColor = chatColors[this.#currentSeriesIndex % chatColors.length];
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

    #hasSeries(seriesID) {
        let seriesIDs = this.#chartOpts.series.map((series) => { return series.id });
        return seriesIDs.includes(seriesID);
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
            // Get all timestamps from all series data.
            let timestamps = [];
            for (let series of opt.series) {
                for (let seriesData of series.data) {
                    let timestamp = seriesData[0];
                    if (!timestamps.includes(timestamp)) {
                        timestamps.push(timestamp);
                    }
                }
            }
            // Ensure that the timestamps are ordered (from the older to the newest).
            timestamps = timestamps.sort();

            // For each timestamp, get the data from each series. If the timestamp does not exists, the value is null.
            let data = {};
            for (let timestamp of timestamps) {
                data[timestamp] = [];
                for (let series of opt.series) {
                    let value = null;
                    for (let seriesData of series.data) {
                        if (seriesData[0] == timestamp) {
                            value = Parser.parseFloatOrDefault(seriesData[1], Number.NaN, 2);
                            break;
                        }
                        if (seriesData[0] > timestamp) {
                            break;
                        }
                    }
                    data[timestamp].push(value);
                }
            }

            // Build the table of the dataview, and fill it with the data extracted for each series.
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
                tableHeadThElmt.innerText = `${series.name}${series.aggregation != null ? ` | ${series.aggregation}` : ""}`;
                tableHeadTrElmt.appendChild(tableHeadThElmt);
            }
            tableHeadElmt.appendChild(tableHeadTrElmt);
            tableElmt.appendChild(tableHeadElmt);
            let tableBodyElmt = document.createElement("tbody");
            tableBodyElmt.classList.add("table-group-divider");
            for (let [timestamp, values] of Object.entries(data)) {
                let tableTrElmt = document.createElement("tr");
                let tableCellTimestampElmt = document.createElement("td");
                tableCellTimestampElmt.innerText = echarts.time.format(timestamp, this.#datetimeFormat);
                tableTrElmt.appendChild(tableCellTimestampElmt);
                for (let value of values) {
                    let tableCellElmt = document.createElement("td");
                    tableCellElmt.innerText = value;
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

    #getSeriesIndex(seriesID) {
        let seriesIDs = this.#chartOpts.series.map((series) => { return series.id.toString(); });
        return seriesIDs.indexOf(seriesID?.toString());
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

    hasSeries(seriesID) {
        return this.#hasSeries(seriesID);
    }

    addSeries(seriesParams, data = null) {
        if (!this.#hasSeries(seriesParams.id)) {
            seriesParams.data = this.#prepareSeriesData(data);
            this.#chartOpts.legend[seriesParams.yAxisIndex].data.push(seriesParams.name);
            this.#chartOpts.series.push(seriesParams);

            if (this.seriesDataCount > 0) {
                this.#hideNoData();
            }

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();

            this.#currentSeriesIndex += 1;
        }
        else {
            this.updateSeriesData(seriesParams.id, data);
        }
    }

    updateSeries(seriesID, seriesParams, yAxisIndexChanged = false) {
        let seriesIndex = this.#getSeriesIndex(seriesID);
        if (seriesIndex != -1) {
            this.#chartOpts.series[seriesIndex].id = seriesParams.id;

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
                this.#chartOpts.legend[previousYAxisIndex].data = this.#chartOpts.legend[previousYAxisIndex].data.filter(serieName => serieName != this.#chartOpts.series[seriesIndex].name);
                this.#chartOpts.legend[seriesParams.yAxisIndex].data.push(seriesParams.name);
            }
            else {
                // Just update series legend name.
                for (let legendIndex=0 ; legendIndex<this.#chartOpts.legend[seriesParams.yAxisIndex].data.length ; legendIndex++) {
                    if (this.#chartOpts.legend[seriesParams.yAxisIndex].data[legendIndex] == this.#chartOpts.series[seriesIndex].name) {
                        this.#chartOpts.legend[seriesParams.yAxisIndex].data[legendIndex] = seriesParams.name;
                        break;
                    }
                }
            }

            // Set series visibility.
            this.#chartOpts.series[seriesIndex].visible = seriesParams.visible;
            this.dispatchAction({
                type: seriesParams.visible ? "legendSelect" : "legendUnSelect",
                name: seriesParams.name,
            });

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();
        }
    }

    updateSeriesData(seriesID, data, options = { aggregation: null }) {
        let seriesIndex = this.#getSeriesIndex(seriesID);
        if (seriesIndex != -1) {
            this.#chartOpts.series[seriesIndex].data = this.#prepareSeriesData(data);
            this.#chartOpts.series[seriesIndex].aggregation = options.aggregation;

            this.#setChartOptions();
        }
    }

    toggleSeriesVisibility(seriesID) {
        if (this.#hasSeries(seriesID)) {
            let seriesIndex = this.#getSeriesIndex(seriesID);
            let series = this.#chartOpts.series[seriesIndex];

            let actionType = "legendToggleSelect";
            this.dispatchAction({
                type: actionType,
                name: series.name,
            });
        }
    }

    removeSeries(seriesID) {
        if (this.#hasSeries(seriesID)) {
            this.clear(true);

            let seriesIndex = this.#getSeriesIndex(seriesID);
            let series = this.#chartOpts.series[seriesIndex];
            if (this.#chartOpts.legend[series.yAxisIndex].selected) {
                delete this.#chartOpts.legend[series.yAxisIndex].selected[series.name];
            }
            this.#chartOpts.legend[series.yAxisIndex].data = this.#chartOpts.legend[series.yAxisIndex].data.filter(seriesName => seriesName != series.name);
            this.#chartOpts.series = this.#chartOpts.series.filter(series => series.id != seriesID);

            this.#updateYAxisName();
            this.#updateLegend();

            this.#setChartOptions();
        }

        if (this.#chartOpts.series.length <= 0) {
            this.clearAll();
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


// TODO: Maybe those const values could be structures as enums? and general app consts?

export const SeriesYAxisPositions = Object.freeze({
    "left": "left",
    "right": "right",
});

export const SeriesTypes = Object.freeze({
    "line": "line",
    "bar": "bar",
});

export const SeriesLineStyles = Object.freeze({
    "solid": "solid",
    "dashed": "dashed",
    "dotted": "dotted",
});

export const SeriesLineSymbols = Object.freeze({
    "emptyCircle": "empty circle",
    "circle": "circle",
    "rect": "rectangle",
    "roundRect": "rounded rectangle",
    "triangle": "triangle",
    "diamond": "diamond",
    "pin": "pin",
    "arrow": "arrow",
    "path://": "none",
});

export const SeriesBarDecals = Object.freeze({
    "none": {
        "label": "none",
        "decal": {
            symbol: "path://",
            symbolSize: 1,
            dashArrayX: 5,
            dashArrayY: 5,
            rotation: 0,
        },
    },
    "hash1": {
        "label": "hash type 1",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: [2, 5],
            rotation: Math.PI / 6,
        },
    },
    "dots": {
        "label": "dots",
        "decal": {
            symbol: "circle",
            symbolSize: 0.8,
            dashArrayX: [
                [8, 8],
                [0, 8, 8, 0],
            ],
            dashArrayY: [6, 0],
            rotation: 0,
        },
    },
    "hash2": {
        "label": "hash type 2",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: [4, 3],
            rotation: -Math.PI / 4,
            rotation: 0,
        },
    },
    "hash3": {
        "label": "hash type 3",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [
                [6, 6],
                [0, 6, 6, 0],
            ],
            dashArrayY: [6, 0],
            rotation: 0,
        },
    },
    "hash4": {
        "label": "hash type 4",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [
                [1, 0],
                [1, 6],
            ],
            dashArrayY: [1, 0, 6, 0],
            rotation: Math.PI / 4,
        },
    },
    "lines_horiz": {
        "label": "horizontal lines",
        "decal": {
            symbol: "rect",
            symbolSize: 1,
            dashArrayX: [1, 0],
            dashArrayY: 10,
            rotation: 0,
        },
    },
});


export const defaultSeriesYAxisPosition = "left";
export const defaultSeriesType = "line";
export const defaultSeriesLineStyle = "solid";
export const defaultSeriesLineSymbol = "emptyCircle";
export const defaultSeriesBarDecal = "none";


export class TimeseriesChartSeriesOptions {

    tsInfo = null;
    tsDataState = null;
    type = defaultSeriesType;
    style = defaultSeriesLineStyle;
    symbol = defaultSeriesLineSymbol;
    yAxisPosition = defaultSeriesYAxisPosition;
    decalName = defaultSeriesBarDecal;
    seriesID = null;
    show = true;

    constructor(tsInfo, tsDataState, color = null, yAxisPosition = defaultSeriesYAxisPosition, type = defaultSeriesType, options = {}) {
        // options:
        //  if type == "line", may contain "style" and "symbol" definition
        //  if type == "bar", may contain "decalName" definition

        if (!Object.keys(SeriesYAxisPositions).includes(yAxisPosition)) {
            console.warn(`Unknwon series y axis position: ${yAxisPosition}`);
        }
        if (!Object.keys(SeriesTypes).includes(type)) {
            console.warn(`Unknwon series type: ${type}`);
        }
        if (!Object.keys(SeriesLineStyles).includes(options.style)) {
            console.warn(`Unknwon series line style: ${options.style}`);
        }
        if (!Object.keys(SeriesLineSymbols).includes(options.symbol)) {
            console.warn(`Unknwon series line symbol: ${options.symbol}`);
        }
        if (!Object.keys(SeriesBarDecals).includes(options.decalName)) {
            console.warn(`Unknwon series bar decal name: ${options.decalName}`);
        }

        this.tsInfo = tsInfo;
        this.tsDataState = tsDataState;
        this.color = color;
        this.type = type;
        this.yAxisPosition = yAxisPosition;

        if (this.type == SeriesTypes.line) {
            this.style = options.style || defaultSeriesLineStyle;
            this.symbol = options.symbol || defaultSeriesLineSymbol;
        }
        this.decalName = options.decalName || defaultSeriesBarDecal;

        this.seriesID = `${this.tsInfo?.id}${this.tsDataState != null ? `_${this.tsDataState.id}` : ""}`;
    }

    toChartSeries(ignoreColor = false) {
        let seriesLabel = `${this.tsInfo?.label}${this.tsDataState != null ? ` | ${this.tsDataState.name}` : ""}`;
        let seriesUnitSymbol = this.tsInfo?.unit_symbol;

        let series = {
            id: this.seriesID,
            name: seriesLabel,
            type: this.type,
            yAxisIndex: this.yAxisPosition == SeriesYAxisPositions.left ? 0 : 1,
            data: [],
            visible: this.show,
            unitSymbol: seriesUnitSymbol,
            timeseriesID: this.tsInfo?.id,
        };
        if (!ignoreColor) {
            series.color = this.color;
        }
        if (this.type == SeriesTypes.line) {
            series.lineStyle = {
                type: this.style,
            };
            series.symbol = this.symbol;
            series.showSymbol = this.symbol != "path://";
        }
        else if (this.type == SeriesTypes.bar) {
            series.itemStyle = {
                decal: SeriesBarDecals[this.decalName].decal,
            };
        }

        return series;
    }
}

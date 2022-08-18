class TimeseriesCompletenessChart extends HTMLDivElement {

    #chart = null;

    #initOptions = {};
    #theme = null;

    #defaultTitle = "Data completeness";
    #defaultOptions = {
        grid: {
            height: "70%",
            top: "10%"
        },
        title: {
            left: "center",
            text: this.#defaultTitle,
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
        },
        xAxis: [
            {
                type: "category",
                splitArea: {
                    show: true,
                }
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
            max: 1,
            calculable: true,
            orient: "vertical",
            inRange: {
                color: ["#fb4b4b", "#c0ff33"],
            },
            right: "0%",
            top: "center",
        },
        series: [
        ],
        useUTC: false,
    };

    constructor(options = { height: 400 }, theme = null) {
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

    load(data, displayTime) {
        this.hideLoading();
        let options = this.#chart.getOption();
        let timeseries_list_names = [];
        let my_data = [];
        let max_values = [];
        let info = {};
        let timestamps = data.data["timestamps"];

        if (!displayTime) {
            timestamps = timestamps.map((timestamp) => {
                return timestamp.substring(0, 10);
            })
        }
        else {
            timestamps = timestamps.map((timestamp) => {
                return timestamp.substring(0, 10) + " " + timestamp.substring(11, 16);
            })
        }

        let values = Object.values(data.data["timeseries"])
        for (let i = 0; i < values.length; i++) {
            timeseries_list_names.push(values[i].name);
            max_values.push(values[i].expected_count);
            for (let j = 0; j < data.data["timestamps"].length; j++) {
                my_data.push([j, i, values[i].ratio[j].toFixed(2)]);
            }
            info[values[i].name] = [values[i].expected_count[0], values[i].interval.toFixed(2), values[i].undefined_interval];
            options.series.push(
                {
                    name: `Number of measurements for ${values[i].name}`,
                    type: 'heatmap',
                    data: my_data,
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: "rgba(0, 0, 0, 1)"
                        }
                    },
                }
            )
        }

        options.dataZoom = [
            {
                type: "slider",
            },
            {
                type: 'slider',
                yAxisIndex: 0,
                zoomLock: true,
                width: 10,
                right: "8%",
                top: 40,
                bottom: 80,
                start: 100*Math.max(0, 1 - 15 / timeseries_list_names.length),
                end: 100,
                handleSize: 0,
                showDetail: false
            },
            {
                type: 'inside',
                id: 'insideY',
                yAxisIndex: 0,
                zoomLock: true,
                start: 0,
                end: 100,
                zoomOnMouseWheel: false,
                moveOnMouseMove: true,
                moveOnMouseWheel: true
            }
        ],


        options.tooltip = {
            trigger: "item",
            position: 'top',
            formatter: function (p) {
                let ts_name = timeseries_list_names[p.data[1]];
                var msg = info[ts_name][2] ? " (Undefined interval time interval)" : "";
                let ratio = parseFloat(p.data[2]);
                var percentage = ratio.toFixed(2) * 100;
                var nb = Math.floor(ratio * info[ts_name][0]);
                let output = `${timestamps[p.data[0]]} <br/> ${ts_name} <br/> ${percentage} % (${nb}/${info[ts_name][0].toFixed(2)}) <br/> Interval: ${info[ts_name][1]}s${msg}`;
                return output;
            }
        };
        options.xAxis[0].data = timestamps;
        options.yAxis[0].data = timeseries_list_names;
        this.#chart.setOption(options);
    }
}


customElements.define("app-ts-completeness-chart", TimeseriesCompletenessChart, { extends: "div" });


export { TimeseriesCompletenessChart };

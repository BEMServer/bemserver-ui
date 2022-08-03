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
        dataZoom: [
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
                start: 10,
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
        let x_values = [];
        for (let ts_data of Object.values(data.data["timeseries"])) {
            timeseries_list_names.push(ts_data.name);
            max_values.push(ts_data.expected_count);
            x_values = [];
            for (let j = 0; j < data.data["timestamps"].length; j++) {
                let timestamp = data.data["timestamps"][j];
                if ( !displayTime ) {
                    timestamp = timestamp.substring(0, 10);
                }
                else {
                    timestamp = timestamp.substring(0, 10) + " " + timestamp.substring(11, 19);
                }
                x_values.push(timestamp);
                my_data.push([timestamp, ts_data.name, ts_data.ratio[j].toFixed(2)]);
            }
            info[ts_data.name] = [ts_data.expected_count[0], ts_data.interval.toFixed(2), ts_data.undefined_interval];
            options.series.push(
                {
                    name: `Number of measurements for ${ts_data.name}`,
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
        options.tooltip = {
            trigger: "item",
            position: 'top',
            formatter: function (p) {
                let start = new Date();
                let ts_name = p.data[1];
                var msg = info[ts_name][2] ? " (Undefined interval time interval)" : "";
                let ratio = parseFloat(p.data[2]);
                var percentage = ratio.toFixed(2) * 100;
                var nb = Math.floor(ratio * info[ts_name][0]);
                let output = `${p.data[0]} <br/> ${ts_name}: <br/> ${percentage} % (${nb}/${info[ts_name][0]}) <br/> Interval: ${info[ts_name][1]}s${msg}`;
                let end = new Date();
                console.log(`${end - start}ms`); 
                return output;
            }
        };
        options.xAxis[0].data = x_values;
        options.yAxis[0].data = timeseries_list_names;
        this.#chart.setOption(options);
    }
}


customElements.define("app-ts-completeness-chart", TimeseriesCompletenessChart, { extends: "div" });


export { TimeseriesCompletenessChart };

import { Parser } from "../tools/parser.js";


class TimeseriesChart extends HTMLDivElement {

    #chart = null;

    #initOptions = { height: 400 };
    #theme = null;

    #defaultTitle = "Timeseries data";
    #defaultOptions = {
        title: {
            left: "center",
            text: this.#defaultTitle,
        },
        grid: {
            bottom: 80,
        },
        toolbox: {
            feature: {
                magicType: {
                    type: ["line", "bar"],
                },
                dataZoom: {
                    yAxisIndex: "none",
                },
                saveAsImage: {},
            },
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "cross",
            },
        },
        legend: {
            left: "left",
        },
        dataZoom: [
            {
                type: "slider",
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
        series: [
            {
                type: "line",
                smooth: true,
            },
        ],
        useUTC: true,
    };

    // `theme` parameter can be "dark"
    constructor(options = { height: 400 }, theme = null, ) {
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

    load(data) {
        this.hideLoading();

        let legendName = `[${data.ts_datastate_name.toLowerCase()}] ${data.ts_name}`;
        if (data.ts_unit_symbol != null && data.ts_unit_symbol.length > 0) {
            legendName = `${legendName} [${data.ts_unit_symbol}]`;
        }

        let options = this.#chart.getOption();
        options.legend.data = [legendName];
        options.yAxis[0].name = (data.ts_unit_symbol != null && data.ts_unit_symbol.length > 0) ? `[${data.ts_unit_symbol}]` : "";
        options.series[0].name = legendName;
        options.dataset = {
            source: data.ts_data.map((row) => {
                let rowDate = new Date(row["Datetime"]);
                return [
                    !isNaN(rowDate) ? rowDate.toLocaleString(navigator.language, {timeZoneName: "short"}).replace(" ", "\n") : null,
                    Parser.parseFloatOrDefault(row[data.ts_id.toString()], null),
                ];
            }),
        };

        this.#chart.setOption(options);
    }
}


customElements.define("app-ts-chart", TimeseriesChart, { extends: "div" });


export { TimeseriesChart } ;

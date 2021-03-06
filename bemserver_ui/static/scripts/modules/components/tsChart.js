import { Parser } from "../tools/parser.js";
import { TimeDisplay } from "../tools/time.js";


class TimeseriesChart extends HTMLDivElement {

    #chart = null;

    #initOptions = { height: 400 };
    #theme = null;

    #downloadCSVUrl = null;

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

    #downloadCSV() {
        if (this.#downloadCSVUrl != null) {
            let link = document.createElement("a");
            link.setAttribute("href", this.#downloadCSVUrl);
            link.click();
        }
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
                    !isNaN(rowDate) ? TimeDisplay.toLocaleString(rowDate).replace(" ", "\n") : null,
                    Parser.parseFloatOrDefault(row[data.ts_id.toString()], null),
                ];
            }),
        };

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


customElements.define("app-ts-chart", TimeseriesChart, { extends: "div" });


export { TimeseriesChart } ;

import "https://cdn.jsdelivr.net/npm/echarts@5.6.0/dist/echarts.min.js";


export class ChartBase {

    #chart = null;
    #chartEventHandlers = {};

    #loadingOptions = {
        text: "loading...",
        color: "#95c11a",
        textColor: "#95c11a",
        fontSize: 14,
    };

    #options = {
        textStyle: {
            // Inspired by bootstrap native font stack (https://getbootstrap.com/docs/5.3/content/reboot/#native-font-stack)
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Noto Sans, Liberation Sans, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji",
        },
        grid: {
            left: 20,
            right: 20,
            bottom: 50,
            containLabel: true,
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow",
            },
        },
        series: [],
    }

    get seriesCount() {
        let options = this.getOption();
        return options.series != null ? options.series.length : 0;
    }

    constructor(chartContainerElmt, initOptions = null) {
        this.#chart = echarts.init(chartContainerElmt, null, initOptions);
        this.#chart.setOption(this.#options);

        this.#initEventListeners();
    }

    #initEventListeners() {
        window.addEventListener("resize", () => {
            this.resize();
        });

        window.addEventListener("unload", () => {
            this.dispose();
        });
    }

    getOption() {
        return this.#chart.getOption();
    }

    setOption(options, opts) {
        this.#chart.setOption(options, opts);
    }

    getChartColors() {
        return this.#chart.getOption().color;
    }

    // Inspired by https://stackoverflow.com/questions/70780091/is-there-a-way-on-echarts-to-get-the-series-colors
    getSeriesColors() {
        return this.#chart.getModel().getSeries().map(s => {
            return {
                seriesIndex: s.seriesIndex,
                seriesYAxisIndex: s.option.yAxisIndex || 0,
                seriesColor: this.#chart.getVisual({ seriesIndex: s.seriesIndex }, "color"),
            };
        });
    }

    getDom() {
        return this.#chart.getDom();
    }

    getWidth() {
        return this.#chart.getWidth();
    }

    getHeight() {
        return this.#chart.getHeight();
    }

    showLoading() {
        this.#chart.showLoading(this.#loadingOptions);
    }

    hideLoading() {
        this.#chart.hideLoading();
    }

    resize(options = null) {
        this.#chart.resize(options);
    }

    dispose() {
        this.#chart.dispose();
    }

    clear(justClear = false) {
        if (!justClear) {
            this.showLoading();
            this.#chart.clear();
            this.#chart.setOption(this.#options, true);
            this.hideLoading();
        }
        else {
            this.#chart.clear();
        }
    }

    registerEvent(eventName, handler) {
        if (handler == null) {
            console.warn(`Can not register "${eventName}" event with null handler!`);
            return;
        }

        if (Object.keys(this.#chartEventHandlers).includes(eventName)) {
            console.warn(`Can not register "${eventName}" event twice!`);
            return ;
        }

        this.#chartEventHandlers[eventName] = handler;
        this.#chart.on(eventName, handler);
    }

    unregisterEvent(eventName, handler) {
        if (!Object.keys(this.#chartEventHandlers).includes(eventName)) {
            console.warn(`Can not unregister unknown "${eventName}" event!`);
            return;
        }

        if (handler == null) {
            console.warn(`Can not unregister "${eventName}" event with null handler!`);
            return;
        }

        delete this.#chartEventHandlers[eventName];
        this.#chart.off(eventName, handler);
    }

    dispatchAction(params) {
        this.#chart.dispatchAction(params);
    }

    dispatchEvent(event) {
        this.#chart.getDom().dispatchEvent(event);
    }
}

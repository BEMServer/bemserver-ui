import "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";


export class ChartBase {

    #chart = null;
    #chartEventCallbacks = {};
    #showLoadingPreCallback = null;
    #hideLoadingPostCallback = null;

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

        // TODO for now, only legendselectchanged is really listened.
        this.#chart.on("legendselectchanged", (params) => {
            if (this.#chartEventCallbacks["legendselectchanged"] != null) {
                for (let eventCallback of this.#chartEventCallbacks["legendselectchanged"]) {
                    eventCallback(params);
                }
            }
        });
    }

    getOption() {
        return this.#chart.getOption();
    }

    setOption(options) {
        this.#chart.setOption(options);
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

    showLoading() {
        this.#showLoadingPreCallback?.();

        this.#chart.showLoading(this.#loadingOptions);
    }

    hideLoading() {
        this.#chart.hideLoading();

        this.#hideLoadingPostCallback?.();
    }

    resize(options = null) {
        this.#chart.resize(options);
    }

    dispose() {
        this.#chart.dispose();
    }

    clear() {
        this.showLoading();
        this.#chart.clear();
        this.#chart.setOption(this.#options, true);
        this.hideLoading();
    }

    registerEventCallback(eventName, callback) {
        if (eventName == "showLoadingPre") {
            this.#showLoadingPreCallback = callback;
        }
        else if (eventName == "hideLoadingPost") {
            this.#hideLoadingPostCallback = callback;
        }
        else {
            if (!this.#chartEventCallbacks[eventName]) {
                this.#chartEventCallbacks[eventName] = [];
            }
            this.#chartEventCallbacks[eventName].push(callback);
        }
    }

    unregisterEventCallback(eventName, callback) {
        if (eventName == "showLoadingPre") {
            this.#showLoadingPreCallback = null;
        }
        else if (eventName == "hideLoadingPost") {
            this.#hideLoadingPostCallback = null;
        }
        else {
            if (this.#chartEventCallbacks[eventName])
            {
                this.#chartEventCallbacks[eventName] = this.#chartEventCallbacks[eventName].filter(
                    (evtCallback) => {
                        return evtCallback != callback;
                    }
                );
            }
        }
    }

    dispatchAction(params) {
        this.#chart.dispatchAction(params);
    }

    dispatchEvent(event) {
        this.#chart.getDom().dispatchEvent(event);
    }
}

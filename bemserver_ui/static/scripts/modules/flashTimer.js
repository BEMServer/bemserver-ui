import { Parser } from "./tools/parser.js"


class FlashTimer {

    _delay = 7;
    _enable = true;

    _messagesContainerElmt = null;
    _alertElmts = null;

    constructor(options = {}) {
        this._delay = Parser.parseIntOrDefault(options.delay, this._delay);
        this._enable = Parser.parseBoolOrDefault(options.enable, this._enable);

        this.#cacheDOM();
    }

    #cacheDOM() {
        this._messagesContainerElmt = document.getElementById("messages");
        this._alertElmts = [].slice.call(this._messagesContainerElmt.querySelectorAll(".alert"));
    }

    bind() {
        for (let alertElmt of this._alertElmts) {
            let progressElmt = alertElmt.querySelector(".progress");
            if (!this._enable) {
                progressElmt.classList.add("d-none", "invisible");
            }
            else {
                let progressBarElmt = progressElmt.querySelector(".progress-bar");
                progressBarElmt.style.width = "100%";
                progressBarElmt.style.transition = `width ${this._delay}s linear`;

                let timeoutId = window.setTimeout(function() {
                    let bsAlert = bootstrap.Alert.getOrCreateInstance(alertElmt);
                    bsAlert.close();
                }, this._delay * 1000);

                alertElmt.addEventListener("closed.bs.alert", function() {
                    window.clearTimeout(timeoutId);
                });
            }
        }
    }
}


export { FlashTimer };

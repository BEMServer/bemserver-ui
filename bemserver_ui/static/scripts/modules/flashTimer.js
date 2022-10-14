import { Parser } from "./tools/parser.js"


export class FlashTimer {

    #delay = 7;
    #enable = true;

    #messagesContainerElmt = null;
    #alertElmts = null;

    constructor(options = {}) {
        this.#delay = Parser.parseIntOrDefault(options.delay, this.#delay);
        this.#enable = Parser.parseBoolOrDefault(options.enable, this.#enable);

        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#messagesContainerElmt = document.getElementById("messages");
        this.#alertElmts = [].slice.call(this.#messagesContainerElmt.querySelectorAll(".alert"));
    }

    bind() {
        for (let alertElmt of this.#alertElmts) {
            let progressElmt = alertElmt.querySelector(".progress");
            if (!this.#enable) {
                progressElmt.classList.add("d-none", "invisible");
            }
            else {
                let progressBarElmt = progressElmt.querySelector(".progress-bar");
                progressBarElmt.style.width = "100%";
                progressBarElmt.style.transition = `width ${this.#delay}s linear`;

                let timeoutId = window.setTimeout(() => {
                    let bsAlert = bootstrap.Alert.getOrCreateInstance(alertElmt);
                    bsAlert.close();
                }, this.#delay * 1000);

                alertElmt.addEventListener("closed.bs.alert", () => {
                    window.clearTimeout(timeoutId);
                });
            }
        }
    }
}

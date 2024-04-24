import { FlashMessage } from "/static/scripts/modules/components/flashMessage.js"


export default class MessageManager {

    #messageContainerElmt = null;

    constructor() {
        this.#cacheDOM();
    }

    #cacheDOM() {
        this.#messageContainerElmt = document.getElementById("messageContainer");
    }

    flash(message, category="message", delay=null, dismiss=true) {
        let msgElmt = new FlashMessage();
        msgElmt.setAttribute("category", category);
        msgElmt.setAttribute("message", message);
        if (delay) {
            msgElmt.setAttribute("delay", delay);
        }
        msgElmt.setAttribute("dismiss", dismiss);
        this.#messageContainerElmt.appendChild(msgElmt);
    }

    mount() {
    }
}

import { generateUUID } from "./uuid.js";
import { Parser } from "./parser.js";


class InternalAPIResponseError extends Error {
    constructor(statusCode = null, ...args) {
        super(...args);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InternalAPIResponseError);
        }

        this.name = "InternalAPIResponseError";
        this.statusCode = statusCode;
        this.date = new Date();
    }
}


export class InternalAPIRequest {

    #abortControllers = {};
    #fetchPromises = {};

    #debugMode = false;

    constructor(options = {}) {
        this.#debugMode = Parser.parseBoolOrDefault(options.debugMode, this.#debugMode);

        this.#initEventListeners();
    }

    #initEventListeners() {
        // Ensure to abort pending fetch requests before page unloads.
        // If not, Firefox throws "TypeError: NetworkError when attempting to fetch resource." error.
        window.addEventListener("beforeunload", (event) => {
            for (let abortCtrler of Object.values(this.#abortControllers)) {
                abortCtrler.abort();
            }
            this.#abortControllers = {};
        });
    }

    #executeRequest(url, params = {}, resolveCallback = null, rejectCallback = null, finallyCallback = null) {
        let reqID = generateUUID();

        let abortController = new AbortController();
        this.#abortControllers[reqID] = abortController;

        params = params || {};
        params.keepalive = true;
        params.signal = abortController.signal;

        let fetchPromise = window.fetch(url, params);
        this.#fetchPromises[reqID] = fetchPromise;

        fetchPromise.then(
            (response) => {
                let respJSON = response.json();

                if (!response.ok) {
                    if (response.status == 401) {
                        // Just reload the current page, server knows what to do.
                        document.location.reload();
                    }
                    else if (response.status == 422) {
                        // TODO: handle 422 validation errors data
                        if (this.#debugMode) {
                            console.log(respJSON.message);
                        }
                    }
                    return Promise.reject(new InternalAPIResponseError(response.status, respJSON.message));
                }

                return respJSON;
            }
        ).then(
            (data) => {
                resolveCallback?.(data);
            }
        ).catch(
            (error) => {
                if (!["AbortError"].includes(error.name)) {
                    if (rejectCallback != null) {
                        rejectCallback(error);
                    }
                    else {
                        return Promise.reject(error);
                    }
                }
                else if (this.#debugMode) {
                    console.log(url);
                    console.log(error);
                }
            }
        ).finally(
            () => {
                finallyCallback?.();
                delete this.#abortControllers[reqID];
                delete this.#fetchPromises[reqID];
            }
        );

        return reqID;
    }

    abort(requestID) {
        if (requestID in this.#abortControllers) {
            this.#abortControllers[requestID].abort();
            delete this.#abortControllers[requestID];
            delete this.#fetchPromises[requestID];
        }
    }

    getPromise(requestID) {
        return this.#fetchPromises[requestID];
    }

    get(url, resolveCallback, rejectCallback = null, finallyCallback = null) {
        return this.#executeRequest(url, null, resolveCallback, rejectCallback, finallyCallback);
    }

    post(url, payload, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        };
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }

    put(url, payload, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "ETag": etag,
            },
            body: JSON.stringify(payload),
        };
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }
}

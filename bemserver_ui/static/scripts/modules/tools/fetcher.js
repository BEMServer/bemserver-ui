import { generateUUID } from "./uuid.js";
import { Parser } from "./parser.js";


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
                if (response.ok) {
                    return response.json();
                }
                return Promise.reject(response);
            }
        ).then(
            (data) => {
                resolveCallback?.(data);
            }
        ).catch(
            (error) => {
                if (error.status == 401) {
                    // Just reload the current page, server knows what to do.
                    document.location.reload();
                }
                else if (!["AbortError"].includes(error.name)) {

                    console.log(error);

                    try {
                        error.json().then((errorJSON) => {
                            let errorMsg = errorJSON.message;
                            // TODO: handle validation errors data (422, 409)
                            if (error.status == 409) {

                            }
                            else if (error.status == 422) {
                                for (let [fieldName, fieldErrors] of Object.entries(errorJSON._validation_errors)) {
                                    errorMsg += ` (${fieldName} : ${fieldErrors})`;
                                }
                            }

                            if (rejectCallback != null) {
                                rejectCallback(errorMsg);
                            }
                            else {
                                return Promise.reject(errorMsg);
                            }
                        }).catch((innerError) => {
                            if (rejectCallback != null) {
                                rejectCallback(innerError);
                            }
                            else {
                                return Promise.reject(innerError);
                            }
                        });
                    }
                    catch {
                        if (rejectCallback != null) {
                            rejectCallback(`Internal error [${error}]`);
                        }
                        else {
                            return Promise.reject(`Internal error [${error}]`);
                        }
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

    delete(url, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = {
            method: "DELETE",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "ETag": etag,
            },
        };
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }
}

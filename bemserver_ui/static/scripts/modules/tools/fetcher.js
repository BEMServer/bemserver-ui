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

    #fetch(url, params = {}) {
        let reqID = generateUUID();

        let abortController = new AbortController();
        this.#abortControllers[reqID] = abortController;

        params = params || {};
        params.keepalive = true;
        params.signal = abortController.signal;

        let fetchPromise = window.fetch(url, params);
        this.#fetchPromises[reqID] = fetchPromise;

        return reqID;
    }

    #processRawResponse(response) {
        if (response.ok) {
            return response.json();
        }
        else if (response.status == 304) {
            // Data not modified.
            return null;
        }
        return Promise.reject(response);
    }

    #processError(error, rejectCallback = null) {
        if (this.#debugMode) {
            if (error.url) {
                let url = new URL(error.url);
                console.log(`${url.pathname}${url.search}`);
            }
            console.log(error);
        }

        if (error.status == 401) {
            // Just reload the current page, server knows what to do.
            document.location.reload();
        }
        else if (!["AbortError"].includes(error.name)) {
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
    }

    #executeRequest(url, params = {}, resolveCallback = null, rejectCallback = null, finallyCallback = null) {
        let reqID = this.#fetch(url, params);

        this.#fetchPromises[reqID].then(
            this.#processRawResponse
        ).then(
            (data) => {
                if (data != null) {
                    resolveCallback?.(data);
                }
            }
        ).catch(
            (error) => {
                this.#processError(error, rejectCallback);
            }
        ).finally(
            () => {
                finallyCallback?.();
                this.#purge(reqID);
            }
        );

        return reqID;
    }

    #purge(requestID) {
        delete this.#abortControllers[requestID];
        delete this.#fetchPromises[requestID];
    }

    abort(requestID) {
        if (requestID in this.#abortControllers) {
            this.#abortControllers[requestID].abort();
            this.#purge(requestID);
        }
    }

    getPromise(requestID) {
        return this.#fetchPromises[requestID];
    }

    // TODO: pass etag as optional arg
    get(url, resolveCallback, rejectCallback = null, finallyCallback = null) {
        // TODO: optional etag arg should be passed in headers
        return this.#executeRequest(url, null, resolveCallback, rejectCallback, finallyCallback);
    }

    // Inspired by https://gomakethings.com/waiting-for-multiple-all-api-responses-to-complete-with-the-vanilla-js-promise.all-method/#calling-multiple-apis-at-once
    gets(urls, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let reqIDs = {};
        for (let url of urls) {
            reqIDs[url] = this.#fetch(url);
        }

        Promise.all(
            Object.values(reqIDs).map((reqID) => { return this.getPromise(reqID); })
        ).then(
            (responses) => {
                return Promise.all(
                    responses.map((response) => { return this.#processRawResponse(response); })
                );
            }
        ).then(
            (data) => {
                resolveCallback?.(data);
            }
        ).catch(
            (error) => {
                this.#processError(error, rejectCallback);
            }
        ).finally(
            () => {
                finallyCallback?.();
                for (let reqID of Object.values(reqIDs)) {
                    this.#purge(reqID);
                }
            }
        );

        return reqIDs;
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

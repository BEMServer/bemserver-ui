import { generateUUID } from "/static/scripts/modules/tools/uuid.js";
import { Parser } from "/static/scripts/modules/tools/parser.js";
import { isDict } from "/static/scripts/modules/tools/dict.js";
import { FlashMessage } from "/static/scripts/modules/components/flashMessage.js";


// TODO: rework fetch use in order to better use async/await when needed


class InternalAPIRequestError {

    #statusCode = null;
    #message = null;
    #validationErrors = null;

    constructor(statusCode=500, message="Internal error", validationErrors=null) {
        this.#statusCode = statusCode;
        this.#message = message;
        this.#validationErrors = validationErrors;
    }

    toHTML() {
        let containerElmt = document.createElement("div");

        if (this.#statusCode == 422 && isDict(this.#validationErrors)) {
            let validationErrorsTitleElmt = document.createElement("p");
            validationErrorsTitleElmt.classList.add("mb-0");
            validationErrorsTitleElmt.innerText = "Validation errors";
            containerElmt.appendChild(validationErrorsTitleElmt);

            let validationErrorsElmt = FlashMessage.createValidationErrorsElement(this.#validationErrors);
            containerElmt.appendChild(validationErrorsElmt);
        }
        else {
            containerElmt.innerText = this.#message;
        }

        return containerElmt.outerHTML;
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
        window.addEventListener("beforeunload", () => {
            // TODO: manage 'keepalive' fetch parameter. If true, request should not be aborted on page unload.

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

        // TODO: Manage an event listener on signal 'abort' event, when needed.

        let fetchPromise = window.fetch(url, params);
        this.#fetchPromises[reqID] = fetchPromise;

        return reqID;
    }

    #processRawResponse(response, makeAsync = false) {
        if (response.ok) {
            let getRespJson = async () => {
                if (makeAsync) {
                    return await response.json();
                }
                else {
                    return response.json();
                }
            };

            return getRespJson();
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
            if (rejectCallback == null) {
                rejectCallback = (err) => { return Promise.reject(err); };
            }

            try {
                error.json().then((errorJSON) => {
                    let reqJSONError = new InternalAPIRequestError(error.status, errorJSON.message, errorJSON._validation_errors);
                    rejectCallback(reqJSONError.toHTML());
                }).catch((innerError) => {
                    let reqInnerError = new InternalAPIRequestError(error.status, innerError);
                    rejectCallback(reqInnerError.toHTML());
                });
            }
            catch {
                let reqInternalError = new InternalAPIRequestError(500, `Internal error [${error}]`);
                rejectCallback(reqInternalError.toHTML());
            }
        }
    }

    async #executeRequestAsync(url, params = {}, resolveCallback = null, rejectCallback = null, finallyCallback = null) {
        let reqID = this.#fetch(url, params);
        let response = await this.#fetchPromises[reqID];

        try {
            let data = await this.#processRawResponse(response, true);
            if (data != null) {
                resolveCallback?.(data);
            }
        }
        catch (error) {
            this.#processError(error, rejectCallback);
        }
        finally {
            this.#purge(reqID);
            finallyCallback?.();
        }

        return reqID;
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
        let reqIDByUrl = {};
        for (let url of urls) {
            reqIDByUrl[url] = this.#fetch(url);
        }

        Promise.all(
            Object.values(reqIDByUrl).map((reqID) => { return this.getPromise(reqID); })
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
                for (let reqID of Object.values(reqIDByUrl)) {
                    this.#purge(reqID);
                }
            }
        );

        return reqIDByUrl;
    }

    #preparePost(payload) {
        let params = {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        };
        if (payload != null) {
            params.body = JSON.stringify(payload);
        }
        return params;
    }

    async postAsync(url, payload, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = this.#preparePost(payload);
        return await this.#executeRequestAsync(url, params, resolveCallback, rejectCallback, finallyCallback);
    }

    post(url, payload, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = this.#preparePost(payload);
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }

    put(url, payload, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = {
            method: "PUT",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        };
        if (etag != null) {
            params.headers["ETag"] = etag;
        }
        if (payload != null) {
            params.body = JSON.stringify(payload);
        }
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }

    #prepareDelete(etag) {
        let params = {
            method: "DELETE",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        };
        if (etag != null) {
            params.headers["ETag"] = etag;
        }
        return params;
    }

    async deleteAsync(url, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = this.#prepareDelete(etag);
        return await this.#executeRequestAsync(url, params, resolveCallback, rejectCallback, finallyCallback);
    }

    delete(url, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
        let params = this.#prepareDelete(etag);
        return this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }
}

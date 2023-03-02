import { generateUUID } from "./uuid.js";
import { Parser } from "./parser.js";
import { isDict } from "./dict.js";


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

            if (Array.isArray(this.#validationErrors._general)) {
                for (let generalError of this.#validationErrors._general) {
                    let generalErrorElmt = document.createElement("p");
                    generalErrorElmt.classList.add("fst-italic", "mb-0");
                    generalErrorElmt.innerText = generalError;
                    containerElmt.appendChild(generalErrorElmt);
                }
                delete this.#validationErrors._general;
            }

            let validationErrorsContainerElmt = document.createElement("dl");
            validationErrorsContainerElmt.classList.add("row", "ms-2", "mb-0");
            containerElmt.appendChild(validationErrorsContainerElmt);

            for (let [index, [fieldName, fieldErrors]] of Object.entries(Object.entries(this.#validationErrors))) {
                let isLastItem = (index == Object.keys(this.#validationErrors).length - 1);

                let fieldNameElmt = document.createElement("dt");
                fieldNameElmt.classList.add("col-4");
                fieldNameElmt.innerText = fieldName;
                validationErrorsContainerElmt.appendChild(fieldNameElmt);

                let fieldErrorsElmt = document.createElement("dd");
                fieldErrorsElmt.classList.add("col-8");
                if (isLastItem) {
                    fieldErrorsElmt.classList.add("mb-0");
                }
                validationErrorsContainerElmt.appendChild(fieldErrorsElmt);

                let _fieldErrors = fieldErrors;
                if (isDict(fieldErrors)) {
                    _fieldErrors = [];
                    for (let fieldErrs of Object.values(fieldErrors)) {
                        if (Array.isArray(fieldErrs)) {
                            _fieldErrors.push(...fieldErrs);
                        }
                        else {
                            _fieldErrors.push(fieldErrs);
                        }
                    }
                }

                for (let fieldError of _fieldErrors) {
                    let fieldErrorElmt = document.createElement("p");
                    fieldErrorElmt.classList.add("fst-italic", "mb-0");
                    fieldErrorElmt.innerText = fieldError;
                    fieldErrorsElmt.appendChild(fieldErrorElmt);
                }
            }
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

    async #executeRequest(url, params = {}, resolveCallback = null, rejectCallback = null, finallyCallback = null) {
        let reqID = this.#fetch(url, params);

        await this.#fetchPromises[reqID].then(
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

    async post(url, payload, resolveCallback, rejectCallback = null, finallyCallback = null) {
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
        return await this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
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

    async delete(url, etag, resolveCallback, rejectCallback = null, finallyCallback = null) {
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
        return await this.#executeRequest(url, params, resolveCallback, rejectCallback, finallyCallback);
    }
}

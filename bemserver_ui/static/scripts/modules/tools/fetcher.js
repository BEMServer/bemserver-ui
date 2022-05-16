class Fetcher {

    #abortController = null;

    constructor() {
    }

    cancel() {
        if (this.#abortController != null) {
            this.#abortController.abort();
            this.#abortController = null;
        }
    }

    async #handleErrors(response) {
        if (!response.ok) {
            if (response.status == 401) {
                // Just reload the current page, server knows what to do.
                document.location.reload();
            }
            else if (response.status == 422) {
                // TODO: handle 422 validation errors data
            }
            let errorData = await response.json();
            errorData.status = response.status;
            throw Error(errorData.message);
        }
        return response;
    }

    async get(url) {
        this.#abortController = new AbortController();
        return window.fetch(
            url, { signal: this.#abortController.signal }
        ).then(
            (response) => this.#handleErrors(response)
        ).then(
            (response) => {
                return response.json();
            }
        );
    }

    async post(url, payload) {
        return window.fetch(
            url, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            }
        ).then(
            (response) => this.#handleErrors(response)
        ).then(
            (response) => {
                return response.json();
            }
        );
    }
}


export { Fetcher };

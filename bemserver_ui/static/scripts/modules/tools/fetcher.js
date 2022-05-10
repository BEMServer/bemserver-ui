class Fetcher {

    _abortController = null;

    constructor() {
    }

    cancel() {
        if (this._abortController != null) {
            this._abortController.abort();
            this._abortController = null;
        }
    }

    async _handleErrors(response) {
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
        this._abortController = new AbortController();
        return window.fetch(
            url, { signal: this._abortController.signal }
        ).then(
            (response) => this._handleErrors(response)
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
            (response) => this._handleErrors(response)
        ).then(
            (response) => {
                return response.json();
            }
        );
    }
}


export { Fetcher };

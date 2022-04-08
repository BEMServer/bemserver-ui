class Fetcher {

    #errorData = null;

    constructor() {

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
            this.#errorData = await response.json();
            this.#errorData.status = response.status;
            throw Error(this.#errorData.message);
        }
        return response;
    }

    async get(url) {
        this.#errorData = null;
        return window.fetch(
            url
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

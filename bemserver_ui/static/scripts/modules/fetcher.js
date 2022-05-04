class Fetcher {

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
            let errorData = await response.json();
            errorData.status = response.status;
            throw Error(errorData.message);
        }
        return response;
    }

    async get(url) {
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

    async post(url, payload) {

        // (async () => {
        //     const rawResponse = await fetch('https://httpbin.org/post', {
        //       method: 'POST',
        //       headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json'
        //       },
        //       body: JSON.stringify({a: 1, b: 'Textual content'})
        //     });
        //     const content = await rawResponse.json();
          
        //     console.log(content);
        //   })();

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

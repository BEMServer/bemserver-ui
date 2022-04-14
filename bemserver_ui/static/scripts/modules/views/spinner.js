class Spinner extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `<div class="d-flex justify-content-center my-3">
    <div class="spinner-border text-secondary" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
</div>`;
    }
}


customElements.define("app-spinner", Spinner);


export { Spinner } ;

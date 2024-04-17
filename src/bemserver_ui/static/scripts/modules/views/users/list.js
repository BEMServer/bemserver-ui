export class UsersListView {

    #formFiltersElmt = null;
    #sortInputElmt = null;
    #sortRadioElmts = null;

    constructor(filters) {
        this.filters = filters;

        this.#cacheDOM();
        this.#initEventListeners();
    }

    #cacheDOM() {
        this.#formFiltersElmt = document.getElementById("formFilters");
        this.#sortInputElmt = document.getElementById("sort");
        this.#sortRadioElmts = [].slice.call(document.querySelectorAll(`input[type="radio"][id^="sort_"]`));
    }

    #initEventListeners() {
        for (let sortRadioElmt of this.#sortRadioElmts) {
            sortRadioElmt.addEventListener("change", (event) => {
                event.preventDefault();

                let sortData = sortRadioElmt.id.split("_");
                let newSortValue = `${sortData[2].toLowerCase() == "asc" ? "+" : "-"}${sortData[1].toLowerCase()}`;
                if (this.#sortInputElmt.value != newSortValue) {
                    this.#sortInputElmt.value = newSortValue;
                    this.#formFiltersElmt.submit();
                }
            });            
        }
    }

    refresh() {
    }
}

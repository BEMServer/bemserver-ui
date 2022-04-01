class CampaignSelector {

    #selectorComponentElmt = null;
    #campaignSelectElmt = null;
    #campaignBtnOKElmt = null;
    #campaignBtnUnselectElmt = null;
    #campaignAllPropsElmt = null;
    #campaignDescriptionElmt = null;
    #campaignStartElmt = null;
    #campaignEndElmt = null;

    constructor() {
        let searchParams = new URLSearchParams(window.location.search);
        let campaignParam = searchParams.get("campaign");
        this.currentCampaign = campaignParam != null ? campaignParam : "";

        this._cacheDOM();

        this.#selectorComponentElmt.addEventListener("show.bs.offcanvas", this._onShow.bind(this), false);
        this.#campaignSelectElmt.addEventListener("change", this._onChange.bind(this), false);
        this.#campaignBtnOKElmt.addEventListener("click", this._onSelect.bind(this), false);
        this.#campaignBtnUnselectElmt.addEventListener("click", this._onUnselect.bind(this), false);

        this._onShow();
    }

    _cacheDOM() {
        this.#selectorComponentElmt = document.querySelector("div.app-campaign-selector");
        this.#campaignSelectElmt = document.getElementById("campaignSelectorSelect");
        this.#campaignBtnOKElmt = document.getElementById("campaignSelectorBtnOK");
        this.#campaignBtnUnselectElmt = document.getElementById("campaignSelectorBtnUnselect");
        this.#campaignAllPropsElmt = document.getElementById("campaignSelectedProperties");
        this.#campaignDescriptionElmt = document.getElementById("campaignSelectedDescription");
        this.#campaignStartElmt = document.getElementById("campaignSelectedStart");
        this.#campaignEndElmt = document.getElementById("campaignSelectedEnd");
    }

    _selectCampaign() {
        this.currentCampaign = this.#campaignSelectElmt.value;

        let searchParams = new URLSearchParams(window.location.search);
        if (this.#campaignSelectElmt.value != "") {
            searchParams.set("campaign", this.#campaignSelectElmt.value);
        }
        else {
            searchParams.delete("campaign");
        }

        let redirUrl = window.location.href.split("?")[0];
        if (Array.from(searchParams).length > 0) {
            redirUrl += "?" + searchParams.toString();
        }
        window.location.replace(redirUrl);
    }

    _onShow() {
        if (this.#campaignSelectElmt.value != this.currentCampaign) {
            this.#campaignSelectElmt.value = this.currentCampaign;
        }
        this._refresh();
    }

    _onSelect(event) {
        event.preventDefault();
        if (this.#campaignSelectElmt.value != this.currentCampaign) {
            this._selectCampaign();
        }
        else {
            this.hide();
        }
    }

    _onUnselect(event) {
        event.preventDefault();
        this.#campaignSelectElmt.value = "";
        this._selectCampaign();
    }

    _onChange(event) {
        event.preventDefault();
        this._refresh();
    }

    _refreshProperties() {
        if (this.#campaignSelectElmt.value == "") {
            this.#campaignAllPropsElmt.classList.add("invisible", "d-none");
        }
        else {
            this.#campaignAllPropsElmt.classList.remove("invisible", "d-none");

            let selectedOptionElmnt = this.#campaignSelectElmt.item(this.#campaignSelectElmt.selectedIndex);
            let description = selectedOptionElmnt.getAttribute("data-campaign-desc");
            let startTime = new Date(selectedOptionElmnt.getAttribute("data-campaign-start"));
            let endTime = new Date(selectedOptionElmnt.getAttribute("data-campaign-end"));

            description = description ? description : "-";
            this.#campaignDescriptionElmt.innerHTML = description;
            if (this.#campaignDescriptionElmt.scrollWidth > this.#campaignDescriptionElmt.clientWidth) {
                this.#campaignDescriptionElmt.innerHTML = `<abbr class="" title="${description}">${description}</abbr>`;
            }

            this.#campaignDescriptionElmt.setAttribute("title", this.#campaignDescriptionElmt.innerHTML);
            this.#campaignStartElmt.innerHTML = !isNaN(startTime) ? startTime.toLocaleString(navigator.language, {timeZoneName: "short"}) : "not defined";
            this.#campaignEndElmt.innerHTML = !isNaN(endTime) ? endTime.toLocaleString(navigator.language, {timeZoneName: "short"}) : "not defined";
        }
    }

    _refresh() {
        if (this.#campaignSelectElmt.value == "") {
            this.#campaignSelectElmt.classList.remove("border-info");
            if (this.currentCampaign == this.#campaignSelectElmt.value) {
                this.#campaignBtnOKElmt.classList.add("invisible", "d-none");
            }
            else {
                this.#campaignBtnOKElmt.classList.remove("invisible", "d-none");
            }
            this.#campaignBtnUnselectElmt.classList.add("invisible", "d-none");
        }
        else {
            if (this.currentCampaign == this.#campaignSelectElmt.value) {
                this.#campaignSelectElmt.classList.add("border-info");
                this.#campaignBtnOKElmt.classList.add("invisible", "d-none");
                this.#campaignBtnUnselectElmt.classList.remove("invisible", "d-none");
            }
            else {
                this.#campaignSelectElmt.classList.remove("border-info");
                this.#campaignBtnOKElmt.classList.remove("invisible", "d-none");
                this.#campaignBtnUnselectElmt.classList.add("invisible", "d-none");
            }
        }
        this._refreshProperties();
    }

    show() {
        bootstrap.Offcanvas.getOrCreateInstance(this.#selectorComponentElmt).show();
    }

    hide() {
        bootstrap.Offcanvas.getOrCreateInstance(this.#selectorComponentElmt).hide();
    }
}


export { CampaignSelector };

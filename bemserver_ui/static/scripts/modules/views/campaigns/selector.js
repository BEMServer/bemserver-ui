import { InternalAPIRequest } from "../../tools/fetcher.js";
import { flaskES6, campaignContextQueryArgName } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";
import { TimeDisplay } from "../../tools/time.js";


export class CampaignSelectorView {

    #internalAPIRequester = null;
    #campaignReqID = null;

    #selectorComponentElmt = null;
    #campaignSelectElmt = null;
    #campaignBtnViewElmt = null;
    #campaignBtnSelectElmt = null;
    #campaignBtnUnselectElmt = null;
    #campaignSelectedPropertiesElmt = null;

    constructor() {
        this.#cacheDOM();
        this.#initEventListeners();

        let searchParams = new URLSearchParams(window.location.search);
        let campaignParam = searchParams.get(campaignContextQueryArgName);
        this.currentCampaign = campaignParam != null ? campaignParam : "";

        this.#internalAPIRequester = new InternalAPIRequest();
    }

    #cacheDOM() {
        this.#selectorComponentElmt = document.querySelector("div.app-campaign-selector");
        this.#campaignSelectElmt = document.getElementById("campaignSelectorSelect");
        this.#campaignBtnViewElmt = document.getElementById("campaignSelectorBtnView");
        this.#campaignBtnSelectElmt = document.getElementById("campaignSelectorBtnSelect");
        this.#campaignBtnUnselectElmt = document.getElementById("campaignSelectorBtnUnselect");
        this.#campaignSelectedPropertiesElmt = document.getElementById("campaignSelectedProperties");
    }

    #initEventListeners() {
        this.#selectorComponentElmt.addEventListener("show.bs.offcanvas", (event) => {
            if (this.#campaignSelectElmt.value != this.currentCampaign) {
                this.#campaignSelectElmt.value = this.currentCampaign;
            }
            this.#refresh();
        });
        this.#campaignSelectElmt.addEventListener("change", (event) => {
            event.preventDefault();
            this.#refresh();
        });
        this.#campaignBtnSelectElmt.addEventListener("click", (event) => {
            event.preventDefault();
            if (this.#campaignSelectElmt.value != this.currentCampaign) {
                this.#selectCampaign();
            }
            else {
                this.hide();
            }
        });
        this.#campaignBtnUnselectElmt.addEventListener("click", (event) => {
            event.preventDefault();
            this.#campaignSelectElmt.value = "";
            this.#selectCampaign();
        });
    }

    #selectCampaign() {
        this.currentCampaign = this.#campaignSelectElmt.value;

        let searchParams = new URLSearchParams(window.location.search);
        if (this.#campaignSelectElmt.value != "") {
            searchParams.set(campaignContextQueryArgName, this.#campaignSelectElmt.value);
        }
        else {
            searchParams.delete(campaignContextQueryArgName);
        }

        let redirUrl = window.location.href.split("?")[0];
        if (Array.from(searchParams).length > 0) {
            redirUrl += "?" + searchParams.toString();
        }
        window.location.replace(redirUrl);
    }

    #getPropertiesHTML(data) {
        let ret = ``;

        if (data.description) {
            ret += `<div class="mb-2"><small id="campaignSelectedDescription" class="d-inline-block text-muted text-truncate">${data.description}</small></div>`;
        }

        ret += `<div class="mb-1"><small class="fw-bold text-${data.state == "ongoing" ? "success": "danger"} text-opacity-75">${data.state.toUpperCase()}</small></div>
<div class="hstack align-items-start gap-2"><i class="bi bi-watch"></i><div class="vstack"><small class="fw-bold text-muted">${data.timezone_info["area"]["label"]}</small><small class="fst-italic text-black text-opacity-50">${data.timezone_info["label"]}</small></div></div>`;

        let startTime = new Date(data.start_time);
        if (!isNaN(startTime)) {
            ret += `<div class="hstack gap-2${data.state == "ongoing" ? " text-success": " text-muted"}"><i class="bi bi-play${data.state == "ongoing" ? " text-success" : ""}"></i><small${data.state == "ongoing" ? ` class="text-success text-opacity-75"` : ``}>${TimeDisplay.toLocaleString(startTime, {timezone: data.timezone})}</small></div>`;
        }
        let endTime = new Date(data.end_time);
        if (!isNaN(endTime)) {
            ret += `<div class="hstack gap-2${data.state == "closed" ? " text-danger": " text-muted"}"><i class="bi bi-stop${data.state == "ongoing" ? "" : " text-danger"}"></i><small${data.state == "ongoing" ? `` : ` class="text-danger text-opacity-75"`}>${TimeDisplay.toLocaleString(endTime, {timezone: data.timezone})}</small></div>`;
        }

        return ret;
    }

    #renderProperties() {
        this.#campaignSelectedPropertiesElmt.innerHTML = "";
        this.#campaignSelectedPropertiesElmt.appendChild(new Spinner());

        if (this.#campaignSelectElmt.value == "") {
            this.#campaignSelectedPropertiesElmt.innerHTML = "";
        }
        else {
            let selectedOptionElmt = this.#campaignSelectElmt.item(this.#campaignSelectElmt.selectedIndex);

            this.#campaignBtnViewElmt.href = flaskES6.urlFor(`campaigns.view`, {id: selectedOptionElmt.value});

            if (this.#campaignReqID != null) {
                this.#internalAPIRequester.abort(this.#campaignReqID);
                this.#campaignReqID = null;
            }
            this.#campaignReqID = this.#internalAPIRequester.get(
                flaskES6.urlFor(`api.campaigns.retrieve_data`, {id: selectedOptionElmt.value}),
                (data) => {
                    this.#campaignSelectedPropertiesElmt.innerHTML = this.#getPropertiesHTML(data.data);
                    // Abbreviate description if too long.
                    let campaignDescriptionElmt = this.#campaignSelectedPropertiesElmt.querySelector("#campaignSelectedDescription");
                    if (campaignDescriptionElmt != null) {
                        if (campaignDescriptionElmt.scrollWidth > campaignDescriptionElmt.clientWidth) {
                            campaignDescriptionElmt.innerHTML = `<abbr title="${campaignDescriptionElmt.innerHTML}">${campaignDescriptionElmt.innerHTML}</abbr>`;
                        }
                    }
                },
                (error) => {
                    this.#campaignSelectedPropertiesElmt.innerHTML = `<div class="alert alert-danger" role="alert">
    <i class="bi bi-x-octagon me-2"></i>
    ${error.message}
</div>`;
                },
            );
        }
    }

    #refresh() {
        if (this.#campaignSelectElmt.value == "") {
            this.#campaignSelectElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
            this.#campaignBtnViewElmt.classList.add("invisible", "d-none");
            this.#campaignBtnViewElmt.removeAttribute("href");
            if (this.currentCampaign == this.#campaignSelectElmt.value) {
                this.#campaignBtnSelectElmt.classList.add("invisible", "d-none");
            }
            else {
                this.#campaignBtnSelectElmt.classList.remove("invisible", "d-none");
            }
            this.#campaignBtnUnselectElmt.classList.add("invisible", "d-none");
        }
        else {
            this.#campaignBtnViewElmt.classList.remove("invisible", "d-none");
            if (this.currentCampaign == this.#campaignSelectElmt.value) {
                this.#campaignSelectElmt.classList.add("border-info", "bg-info", "bg-opacity-10");
                this.#campaignBtnSelectElmt.classList.add("invisible", "d-none");
                this.#campaignBtnUnselectElmt.classList.remove("invisible", "d-none");
            }
            else {
                this.#campaignSelectElmt.classList.remove("border-info", "bg-info", "bg-opacity-10");
                this.#campaignBtnSelectElmt.classList.remove("invisible", "d-none");
                this.#campaignBtnUnselectElmt.classList.add("invisible", "d-none");
            }
        }

        this.#renderProperties();
    }

    show() {
        bootstrap.Offcanvas.getOrCreateInstance(this.#selectorComponentElmt).show();
    }

    hide() {
        bootstrap.Offcanvas.getOrCreateInstance(this.#selectorComponentElmt).hide();
    }
}

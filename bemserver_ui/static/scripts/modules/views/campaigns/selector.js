import { Fetcher } from "../../tools/fetcher.js";
import { flaskES6 } from "../../../app.js";
import { Spinner } from "../../components/spinner.js";


class CampaignSelectorView {

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
        let campaignParam = searchParams.get("campaign");
        this.currentCampaign = campaignParam != null ? campaignParam : "";
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

    #getPropertiesHTML(data) {
        let descriptionDisplayed = data.description ? data.description : "-";

        let startTime = new Date(data.start_time);
        let endTime = new Date(data.end_time);
        let startTimeDisplayed = !isNaN(startTime) ? startTime.toLocaleString(navigator.language, {timeZoneName: "short"}) : "not defined";
        let endTimeDisplayed = !isNaN(endTime) ? endTime.toLocaleString(navigator.language, {timeZoneName: "short"}) : "not defined";

        return `<div class="hstack gap-2"><small class="fw-bold">State</small><small class="text-${data.state == "ongoing" ? "success": "danger"} opacity-75">${data.state.toUpperCase()}</small></div>
<div class="vstack"><small class="fw-bold">Description</small><small id="campaignSelectedDescription" class="d-inline-block text-truncate ms-2">${descriptionDisplayed}</small></div>
<div class="hstack gap-2"><small class="fw-bold">From</small><small>${startTimeDisplayed}</small></div>
<div class="hstack gap-2"><small class="fw-bold">To</small><small>${endTimeDisplayed}</small></div>`;
    }

    #renderProperties() {
        this.#campaignSelectedPropertiesElmt.innerHTML = "";
        this.#campaignSelectedPropertiesElmt.appendChild(new Spinner());

        if (this.#campaignSelectElmt.value == "") {
            this.#campaignSelectedPropertiesElmt.innerHTML = "";
        }
        else {
            let selectedOptionElmnt = this.#campaignSelectElmt.item(this.#campaignSelectElmt.selectedIndex);

            this.#campaignBtnViewElmt.href = flaskES6.urlFor(`campaigns.view`, {id: selectedOptionElmnt.value});

            let retrieveDataUrl = flaskES6.urlFor(`api.campaigns.retrieve_data`, {id: selectedOptionElmnt.value});
            let fetcher = new Fetcher();
            fetcher.get(retrieveDataUrl).then(
                (data) => {
                    this.#campaignSelectedPropertiesElmt.innerHTML = this.#getPropertiesHTML(data.data);
                    // Abbrviate description if too long.
                    let campaignDescriptionElmt = this.#campaignSelectedPropertiesElmt.querySelector("#campaignSelectedDescription");
                    if (campaignDescriptionElmt.scrollWidth > campaignDescriptionElmt.clientWidth) {
                        campaignDescriptionElmt.innerHTML = `<abbr title="${campaignDescriptionElmt.innerHTML}">${campaignDescriptionElmt.innerHTML}</abbr>`;
                    }
                }
            ).catch(
                (error) => {
                    this.#campaignSelectedPropertiesElmt.innerHTML = `<div class="alert alert-danger" role="alert">
    <i class="bi bi-x-octagon me-2"></i>
    ${error.message}
</div>`;
                }
            );
        }
    }

    #refresh() {
        if (this.#campaignSelectElmt.value == "") {
            this.#campaignSelectElmt.classList.remove("border-info");
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
                this.#campaignSelectElmt.classList.add("border-info");
                this.#campaignBtnSelectElmt.classList.add("invisible", "d-none");
                this.#campaignBtnUnselectElmt.classList.remove("invisible", "d-none");
            }
            else {
                this.#campaignSelectElmt.classList.remove("border-info");
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


export { CampaignSelectorView };

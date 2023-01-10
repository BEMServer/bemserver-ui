"""Missing data service views"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("missing_data", __name__, url_prefix="/missing_data")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    return flask.render_template("pages/services/missing_data/list.html")


def _extend_data(status_svc_campaign_data):
    campaign_ctxt_data = flask.g.campaign_ctxt.get_data_for(
        status_svc_campaign_data["campaign_id"]
    )
    if campaign_ctxt_data is not None:
        if status_svc_campaign_data.get("campaign_name") is None:
            status_svc_campaign_data["campaign_name"] = campaign_ctxt_data["name"]
        status_svc_campaign_data["campaign_state"] = campaign_ctxt_data["state"]
        status_svc_campaign_data["campaign_timezone"] = campaign_ctxt_data["timezone"]
        status_svc_campaign_data["is_selected"] = (
            flask.g.campaign_ctxt.id == status_svc_campaign_data["campaign_id"]
        )
    else:
        if status_svc_campaign_data.get("campaign_name") is None:
            status_svc_campaign_data["campaign_name"] = "?"
        status_svc_campaign_data["campaign_state"] = "?"
        status_svc_campaign_data["campaign_timezone"] = (
            flask.current_app.config.get("BEMSERVER_TIMEZONE_NAME") or "UTC"
        )
        status_svc_campaign_data["is_selected"] = False
    return status_svc_campaign_data


def _get_missing_data_for_service(service_id):
    try:
        md_camp_resp = flask.g.api_client.st_check_missing_by_campaign.getone(
            service_id
        )
    except bac_exc.BEMServerAPINotFoundError:
        missing_data_campaign = None
        missing_data_campaign_etag = None
    else:
        missing_data_campaign = md_camp_resp.data
        missing_data_campaign_etag = md_camp_resp.etag
    return (
        missing_data_campaign,
        missing_data_campaign_etag,
    )


def _get_missing_data_for_campaign(campaign_id):
    svc_resp = flask.g.api_client.st_check_missing_by_campaign.get_full(
        campaign_id=campaign_id,
    )
    missing_data_campaign = None
    if len(svc_resp.data) == 1:
        missing_data_campaign = svc_resp.data[0]
        missing_data_campaign_etag = None
    # Campaign ID is used to load missing data through the sidebar.
    #  But sometimes service can have its own id (and etag), check this.
    if missing_data_campaign is not None and missing_data_campaign["id"] is not None:
        (
            missing_data_campaign,
            missing_data_campaign_etag,
        ) = _get_missing_data_for_service(missing_data_campaign["id"])
    return (
        missing_data_campaign,
        missing_data_campaign_etag,
    )


def _manage(missing_data_campaign, missing_data_campaign_etag):
    missing_data_campaign = _extend_data(missing_data_campaign)
    return flask.render_template(
        "pages/services/missing_data/manage.html",
        missing_data_campaign=missing_data_campaign,
        etag=missing_data_campaign_etag,
    )


@blp.route("/<int:id>/state")
@auth.signin_required
def service_state(id):
    md_campaign, md_campaign_etag = _get_missing_data_for_service(id)
    return _manage(md_campaign, md_campaign_etag)


@blp.route("/state")
@auth.signin_required
@ensure_campaign_context
def campaign_context_state():
    campaign_id = flask.g.campaign_ctxt.id
    md_campaign, md_campaign_etag = _get_missing_data_for_campaign(campaign_id)
    return _manage(md_campaign, md_campaign_etag)


@blp.route("/campaign/<int:id>/state")
@auth.signin_required
def campaign_state(id):
    if flask.g.campaign_ctxt.has_campaign and flask.g.campaign_ctxt.id == id:
        return flask.redirect(flask.url_for("services.missing_data.service_state"))

    cleanup_data, cleanup_etag = _get_missing_data_for_campaign(id)
    return _manage(cleanup_data, cleanup_etag)

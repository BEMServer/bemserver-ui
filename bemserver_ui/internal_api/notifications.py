"""Notifications internal API"""
import zoneinfo
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError

import bemserver_api_client.exceptions as bac


blp = flask.Blueprint("notifications", __name__, url_prefix="/notifications")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    # TODO: here etag should be passed in headers
    etag = flask.request.args.get("etag")
    sort = flask.request.args.get("sort")

    filters = {
        "user_id": flask.session["user"]["data"]["id"],
    }
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]
    if "event_id" in flask.request.args:
        filters["event_id"] = flask.request.args["event_id"]
    if "read" in flask.request.args:
        filters["read"] = flask.request.args["read"]
    # Dates/times received are not datetime instances nor localized and tz-aware.
    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    if "date_min" in flask.request.args and flask.request.args["date_min"] != "":
        try:
            timestamp_min = convert_html_form_datetime(
                flask.request.args["date_min"],
                flask.request.args.get("time_min", "00:00") or "00:00",
                tz=tz,
            )
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid timestamp min!")
        else:
            filters["timestamp_min"] = timestamp_min.isoformat()
    if "date_max" in flask.request.args and flask.request.args["date_max"] != "":
        try:
            timestamp_max = convert_html_form_datetime(
                flask.request.args["date_max"],
                flask.request.args.get("time_max", "00:00") or "00:00",
                tz=tz,
            )
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid timestamp max!")
        else:
            filters["timestamp_max"] = timestamp_max.isoformat()

    try:
        notifs_resp = flask.g.api_client.notifications.getall(
            sort=sort, etag=etag, **filters
        )
    except bac.BEMServerAPINotModified as exc:
        return flask.jsonify(None), exc.status_code

    return flask.jsonify(notifs_resp.toJSON()), notifs_resp.status_code

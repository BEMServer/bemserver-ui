"""Notifications internal API"""
import zoneinfo
import flask

from bemserver_ui.extensions import auth
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError

import bemserver_api_client.exceptions as bac


blp = flask.Blueprint("notifications", __name__, url_prefix="/notifications")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
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
    if "campaign_id" in flask.request.args:
        filters["campaign_id"] = flask.request.args["campaign_id"]
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

    notifs_data = notifs_resp.toJSON()
    for notif_data in notifs_data["data"]:
        notif_data["event"]["id"] = notif_data["event_id"]

    return flask.jsonify(notifs_data), notifs_resp.status_code


@blp.route("/count")
@auth.signin_required
def retrieve_count():
    # TODO: here etag should be passed in headers
    etag = flask.request.args.get("etag")

    filters = {
        "user_id": flask.session["user"]["data"]["id"],
    }
    if "read" in flask.request.args:
        filters["read"] = flask.request.args["read"]

    try:
        notifs_count_resp = flask.g.api_client.notifications.count_by_campaign(
            etag=etag, **filters
        )
    except bac.BEMServerAPINotModified as exc:
        return flask.jsonify(None), exc.status_code

    return flask.jsonify(notifs_count_resp.toJSON()), notifs_count_resp.status_code


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required
def update(id):
    notif_resp = flask.g.api_client.notifications.update(id, flask.request.json)
    notif_json = notif_resp.toJSON()
    notif_json["data"]["event"]["id"] = notif_json["data"]["event_id"]
    return flask.jsonify(notif_json)


@blp.route("/mark_all_as_read", methods=["PUT"])
@auth.signin_required
def mark_all_as_read():
    flask.g.api_client.notifications.mark_all_as_read(
        user_id=flask.session["user"]["data"]["id"],
        campaign_id=flask.request.args["campaign_id"],
    )
    return flask.jsonify({"success": True})


def _extend_notif_setup_data(jsonData):
    # Get event category name.
    event_category_resp = flask.g.api_client.event_categories.getone(
        jsonData["data"]["category_id"]
    )
    jsonData["data"]["category_name"] = event_category_resp.data["name"]
    return jsonData


@blp.route("/setup", methods=["POST"])
@auth.signin_required
def setup_create():
    payload = {
        "notification_level": flask.request.json["notification_level"],
        "user_id": flask.session["user"]["data"]["id"],
        "category_id": flask.request.json["category_id"],
    }
    notif_setup_resp = flask.g.api_client.event_categories_by_users.create(payload)

    jsonData = _extend_notif_setup_data(notif_setup_resp.toJSON())
    return flask.jsonify(jsonData)


@blp.route("/setup/<int:id>", methods=["PUT"])
@auth.signin_required
def setup_update(id):
    etag = flask.request.headers["ETag"]
    payload = {
        "notification_level": flask.request.json["notification_level"],
        "category_id": flask.request.json["category_id"],
    }
    notif_setup_resp = flask.g.api_client.event_categories_by_users.update(
        id, payload, etag=etag
    )

    jsonData = _extend_notif_setup_data(notif_setup_resp.toJSON())
    return flask.jsonify(jsonData)


@blp.route("/setup/<int:id>", methods=["DELETE"])
@auth.signin_required
def setup_delete(id):
    etag = flask.request.headers["ETag"]
    flask.g.api_client.event_categories_by_users.delete(id, etag=etag)
    return flask.jsonify({"success": True})


@blp.route("/setup/<int:id>")
@auth.signin_required
def setup_retrieve(id):
    notif_setup_resp = flask.g.api_client.event_categories_by_users.getone(id)
    jsonData = _extend_notif_setup_data(notif_setup_resp.toJSON())
    return flask.jsonify(jsonData)

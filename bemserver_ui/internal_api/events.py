"""Events internal API"""
import zoneinfo
import flask

from bemserver_api_client.enums import EventLevel
from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.const import (
    FULL_STRUCTURAL_ELEMENT_TYPES,
    STRUCTURAL_ELEMENT_TYPES,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("events", __name__, url_prefix="/events")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    sort = flask.request.args.get("sort")

    filters = {}
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]
    if "in_source" in flask.request.args:
        filters["in_source"] = flask.request.args["in_source"]
    if "campaign_scope" in flask.request.args:
        filters["campaign_scope_id"] = flask.request.args["campaign_scope"]
    if "level" in flask.request.args:
        filters["level"] = flask.request.args["level"]
    if "level_min" in flask.request.args:
        filters["level_min"] = flask.request.args["level_min"]
    if "category" in flask.request.args:
        filters["category_id"] = flask.request.args["category"]
    if "timeseries_id" in flask.request.args:
        filters["timeseries_id"] = flask.request.args["timeseries_id"]
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
    for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
        if f"{struct_elmt}_id" in flask.request.args:
            filters[f"{struct_elmt}_id"] = flask.request.args[f"{struct_elmt}_id"]
        if (
            struct_elmt not in ["space", "zone"]
            and f"recurse_{struct_elmt}_id" in flask.request.args
        ):
            filters[f"recurse_{struct_elmt}_id"] = flask.request.args[
                f"recurse_{struct_elmt}_id"
            ]

    events_resp = flask.g.api_client.events.getall(
        campaign_id=flask.g.campaign_ctxt.id, sort=sort, **filters
    )

    return flask.jsonify(
        {"data": events_resp.data, "pagination": events_resp.pagination}
    )


@blp.route("/levels")
@auth.signin_required
def retrieve_levels():
    event_levels = [{"id": x.name, "name": x.value} for x in EventLevel]
    return flask.jsonify(event_levels)


@blp.route("/categories")
@auth.signin_required
def retrieve_categories():
    event_categories_resp = flask.g.api_client.event_categories.getall()
    return flask.jsonify(event_categories_resp.data)


@blp.route("/<int:id>/timeseries")
@auth.signin_required
@ensure_campaign_context
def retrieve_timeseries(id):
    filters = {}
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]

    ts_resp = flask.g.api_client.timeseries.getall(
        campaign_id=flask.g.campaign_ctxt.id, event_id=id, **filters
    )
    return flask.jsonify({"data": ts_resp.data, "pagination": ts_resp.pagination})


@blp.route("/<int:id>/structural_elements/<string:type>")
@auth.signin_required
@ensure_campaign_context
def retrieve_structural_elements(id, type):
    filters = {}
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]

    api_events_resource = getattr(flask.g.api_client, f"event_by_{type}s")
    struct_elmt_event_resp = api_events_resource.getall(event_id=id, **filters)

    def _build_structural_element_path(struct_elmt_data):
        path = None
        if type in FULL_STRUCTURAL_ELEMENT_TYPES:
            path = " / ".join(
                [
                    struct_elmt_data[x]["name"]
                    for x in STRUCTURAL_ELEMENT_TYPES
                    if x != type and x in struct_elmt_data
                ]
            )
        return path

    structural_elements = []
    for struct_elmt_event in struct_elmt_event_resp.data:
        struct_elmt_event["path"] = _build_structural_element_path(struct_elmt_event)
        struct_elmt_event = {**struct_elmt_event, **struct_elmt_event[type]}
        structural_elements.append(struct_elmt_event)

    return flask.jsonify(
        {"data": structural_elements, "pagination": struct_elmt_event_resp.pagination}
    )


def _extend_notif_setup_data(jsonData):
    # Get event category name.
    event_category_resp = flask.g.api_client.event_categories.getone(
        jsonData["data"]["category_id"]
    )
    jsonData["data"]["category_name"] = event_category_resp.data["name"]
    return jsonData


@blp.route("/notifications/setup", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def notif_setup_create():
    payload = {
        "notification_level": flask.request.json["notification_level"],
        "user_id": flask.session["user"]["data"]["id"],
        "category_id": flask.request.json["category_id"],
    }
    notif_setup_resp = flask.g.api_client.event_categories_by_users.create(payload)

    jsonData = _extend_notif_setup_data(notif_setup_resp.toJSON())
    return flask.jsonify(jsonData)


@blp.route("/notifications/setup/<int:id>", methods=["PUT"])
@auth.signin_required
@ensure_campaign_context
def notif_setup_update(id):
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


@blp.route("/notifications/setup/<int:id>", methods=["DELETE"])
@auth.signin_required
@ensure_campaign_context
def notif_setup_delete(id):
    etag = flask.request.headers["ETag"]
    flask.g.api_client.event_categories_by_users.delete(id, etag=etag)
    return flask.jsonify({"success": True})


@blp.route("/notifications/setup/<int:id>")
@auth.signin_required
@ensure_campaign_context
def notif_setup_retrieve(id):
    notif_setup_resp = flask.g.api_client.event_categories_by_users.getone(id)
    jsonData = _extend_notif_setup_data(notif_setup_resp.toJSON())
    return flask.jsonify(jsonData)

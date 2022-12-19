"""Events internal API"""
import zoneinfo
import flask

from bemserver_api_client.enums import EventLevel
from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("events", __name__, url_prefix="/events")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    sort = "-timestamp"
    if "sort" in flask.request.args:
        sort = flask.request.args["sort"]

    filters = {}
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]
    if "source" in flask.request.args:
        filters["source"] = flask.request.args["source"]
    if "campaign_scope" in flask.request.args:
        filters["campaign_scope_id"] = flask.request.args["campaign_scope"]
    if "level" in flask.request.args:
        filters["level"] = flask.request.args["level"]
    if "category" in flask.request.args:
        filters["category_id"] = flask.request.args["category"]
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
            flask.abort(422, description="Invalid timestamp min!")
        else:
            filters["timestamp_max"] = timestamp_max.isoformat()

    events_resp = flask.g.api_client.events.getall(sort=sort, **filters)

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
    ts_event_resp = flask.g.api_client.timeseries_by_events.getall(event_id=id)

    ts = []
    for ts_event in ts_event_resp.data:
        ts_resp = flask.g.api_client.timeseries.getone(id=ts_event["timeseries_id"])
        ts.append(ts_resp.data)

    return flask.jsonify({"data": ts})

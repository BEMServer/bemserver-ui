"""Events views"""
import zoneinfo
import datetime as dt
import flask

from bemserver_api_client.enums import EventLevel
from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("events", __name__, url_prefix="/events")


def get_event_levels():
    return [{"id": x.name, "name": x.value} for x in EventLevel]


def get_default_event_level():
    return EventLevel.WARNING


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def list():
    return flask.render_template(
        "pages/events/list.html",
        structural_element_types=FULL_STRUCTURAL_ELEMENT_TYPES,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "source": flask.request.form["source"],
            "campaign_scope_id": flask.request.form["campaign_scope"],
            "category_id": flask.request.form["event_category"],
            "level": flask.request.form["event_level"],
            "description": flask.request.form["description"],
        }
        # Datetime received from the HTML POST form is not localized and tz-aware.
        try:
            timestamp = convert_html_form_datetime(
                flask.request.form["timestamp_date"],
                flask.request.form.get("timestamp_time", "00:00") or "00:00",
                tz=zoneinfo.ZoneInfo(flask.request.form["timezone"]),
            )
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid timestamp!")
        else:
            payload["timestamp"] = timestamp.isoformat()

        flask.g.api_client.events.create(payload)
        flask.flash("New event entry created!", "success")
        return flask.redirect(flask.url_for("events.list"))

    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id
    )
    event_categories_resp = flask.g.api_client.event_categories.getall()

    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    timestamp = dt.datetime.now(tz=tz)

    return flask.render_template(
        "pages/events/create.html",
        timestamp_date=timestamp.date(),
        timestamp_time=timestamp.time().strftime("%H:%M"),
        campaign_scopes=campaign_scopes_resp.data,
        event_categories=event_categories_resp.data,
        event_levels=get_event_levels(),
    )


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
@ensure_campaign_context
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "source": flask.request.form["source"],
            "category_id": flask.request.form["event_category"],
            "level": flask.request.form["event_level"],
            "description": flask.request.form["description"],
        }
        flask.g.api_client.events.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        flask.flash("Event updated!", "success")
        return flask.redirect(flask.url_for("events.list"))

    # Get event data.
    event_resp = flask.g.api_client.events.getone(id)
    event_data = event_resp.data

    # Get event campaign scope name.
    campaign_scope_resp = flask.g.api_client.campaign_scopes.getone(
        id=flask.g.campaign_ctxt.id
    )
    event_data["campaign_scope_name"] = campaign_scope_resp.data["name"]

    # Get event categories and current event category name.
    event_categories_resp = flask.g.api_client.event_categories.getall()
    event_data["category_name"] = "?"
    for evt_cat in event_categories_resp.data:
        if evt_cat["id"] == event_data["category_id"]:
            event_data["category_name"] = evt_cat["name"]
            break

    return flask.render_template(
        "pages/events/edit.html",
        event=event_data,
        etag=event_resp.etag,
        event_categories=event_categories_resp.data,
        event_levels=get_event_levels(),
        structural_element_types=FULL_STRUCTURAL_ELEMENT_TYPES,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def delete(id):
    flask.g.api_client.events.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("Event deleted!", "success")
    return flask.redirect(flask.url_for("events.list"))

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


def _get_event_levels():
    return [{"id": x.name, "name": x.value} for x in EventLevel]


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
        event_levels=_get_event_levels(),
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

    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id
    )
    event_categories_resp = flask.g.api_client.event_categories.getall()

    event_resp = flask.g.api_client.events.getone(id)
    event_data = event_resp.data

    event_data["campaign_scope_name"] = "?"
    for campaign_scope in campaign_scopes_resp.data:
        if campaign_scope["id"] == event_data["campaign_scope_id"]:
            event_data["campaign_scope_name"] = campaign_scope["name"]
            break

    event_data["category_name"] = "?"
    for evt_cat in event_categories_resp.data:
        if evt_cat["id"] == event_data["category_id"]:
            event_data["category_name"] = evt_cat["name"]
            break

    return flask.render_template(
        "pages/events/edit.html",
        event=event_data,
        etag=event_resp.etag,
        campaign_scopes=campaign_scopes_resp.data,
        event_categories=event_categories_resp.data,
        event_levels=_get_event_levels(),
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def delete(id):
    flask.g.api_client.events.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("Event deleted!", "success")
    return flask.redirect(flask.url_for("events.list"))


@blp.route("/notifications/setup")
@auth.signin_required
@ensure_campaign_context
def notif_setup():
    event_categories_resp = flask.g.api_client.event_categories.getall()

    event_cat_sub_resp = flask.g.api_client.event_categories_by_users.getall(
        user_id=flask.session["user"]["data"]["id"],
    )

    evt_cat_name_by_id = {x["id"]: x["name"] for x in event_categories_resp.data}

    notif_config = {}
    defined_event_categories = []
    for x in event_cat_sub_resp.data:
        x["category_name"] = evt_cat_name_by_id[x["category_id"]]
        x["etag"] = flask.g.api_client.event_categories_by_users.getone(x["id"]).etag
        notif_config[x["category_id"]] = x
        if x["category_id"] not in defined_event_categories:
            defined_event_categories.append(x["category_id"])

    available_event_categories = []
    for x in event_categories_resp.data:
        if x["id"] not in defined_event_categories:
            available_event_categories.append(x["id"])

    return flask.render_template(
        "pages/events/notif_setup.html",
        notif_config=notif_config,
        event_levels=_get_event_levels(),
        default_notification_level=EventLevel.WARNING.name,
        all_event_categories=evt_cat_name_by_id,
        defined_event_categories=defined_event_categories,
        available_event_categories=available_event_categories,
    )

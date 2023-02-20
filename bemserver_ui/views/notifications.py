"""Notifications views"""
import flask

from bemserver_ui.extensions import auth
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES
from bemserver_ui.views.events.events import get_event_levels, get_default_event_level


blp = flask.Blueprint("notifications", __name__, url_prefix="/notifications")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
def explore():
    """All page logic code is in
    /static/scripts/modules/views/notifications/explore.js
    """
    filters = {}
    # state="read" or "unread"
    if "state" in flask.request.args:
        filters["state"] = flask.request.args["state"]
    return flask.render_template(
        "pages/notifications/explore.html",
        structural_element_types=FULL_STRUCTURAL_ELEMENT_TYPES,
        filters=filters,
    )


@blp.route("/setup")
@auth.signin_required
def setup():
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
        "pages/notifications/setup.html",
        notif_config=notif_config,
        event_levels=get_event_levels(),
        default_notification_level=get_default_event_level().name,
        all_event_categories=evt_cat_name_by_id,
        defined_event_categories=defined_event_categories,
        available_event_categories=available_event_categories,
    )

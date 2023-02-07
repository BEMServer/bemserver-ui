"""Notifications views"""
import flask

from bemserver_ui.extensions import auth
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES


blp = flask.Blueprint("notifications", __name__, url_prefix="/notifications")


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

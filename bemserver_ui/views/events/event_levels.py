"""Event levels views"""
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("event_levels", __name__, url_prefix="/event_levels")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    event_levels_resp = flask.g.api_client.event_levels.getall()
    return flask.render_template(
        "pages/events/levels/list.html",
        event_levels=event_levels_resp.data,
    )

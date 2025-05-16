"""Tasks (services) views"""

import flask

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("tasks", __name__, url_prefix="/tasks")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def manage_campaign():
    return flask.render_template("pages/tasks/manage_campaign.html")


@blp.route("/all")
@auth.signin_required
def manage_all():
    return flask.render_template("pages/tasks/manage_all.html")

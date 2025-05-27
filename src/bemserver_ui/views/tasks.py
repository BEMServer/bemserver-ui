"""Tasks (services) views"""

import flask

from bemserver_ui.extensions import auth

blp = flask.Blueprint("tasks", __name__, url_prefix="/tasks")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
def manage():
    filters = {}
    if flask.g.campaign_ctxt.has_campaign:
        filters["campaign"] = flask.g.campaign_ctxt.id

    return flask.render_template(
        "pages/tasks/manage.html",
        filters=filters,
    )

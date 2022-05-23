"""Index page"""
import flask

import bemserver_ui
import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth
from bemserver_ui.common.const import BEMSERVER_APP_LABELS


blp = flask.Blueprint("main", __name__)


@blp.route("/")
@blp.route("/index")
@blp.route("/home")
@auth.signin_required
def index():
    return flask.render_template("pages/home.html")


@blp.route("/about")
@auth.signin_required
def about():
    try:
        about_resp = flask.g.api_client.about.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    about_versions = {}
    for app_name, app_version in about_resp.data["versions"].items():
        about_versions[BEMSERVER_APP_LABELS[app_name]] = app_version
    about_versions["UI"] = bemserver_ui.__version__

    return flask.render_template("pages/about.html", about_versions=about_versions)

"""BEMServer UI"""
import werkzeug.exceptions as wexc
import flask

from . import extensions
from . import views


def create_app():
    """Create application"""
    app = flask.Flask(__name__)
    app.config.from_object("bemserver_ui.settings.Config")
    app.config.from_envvar("FLASK_SETTINGS_FILE", silent=True)

    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    extensions.init_app(app)
    views.init_app(app)

    @app.errorhandler(wexc.Unauthorized)
    def handle_401(e):
        flask.flash("Incorrect or missing credentials", "error")
        return flask.redirect(flask.url_for("auth.signin"))

    @app.errorhandler(wexc.Forbidden)
    def handle_403(_):
        flask.flash("Insufficient permissions", "error")
        return flask.redirect(flask.url_for("main.index"))

    return app

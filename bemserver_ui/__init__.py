"""BEMServer UI"""
import flask

from . import extensions
from . import internal_api
from . import views


__version__ = "0.4.1"


def create_app():
    """Create application"""
    app = flask.Flask(__name__)
    app.config.from_object("bemserver_ui.settings.Config")
    app.config.from_envvar("FLASK_SETTINGS_FILE", silent=True)

    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    extensions.init_app(app)
    internal_api.init_app(app)
    views.init_app(app)

    return app

"""BEMServer UI"""
import flask

from . import extensions
from . import internal_api
from . import views


__version__ = "0.5.1"


def create_app(config_override=None):
    """Create application"""
    app = flask.Flask(__name__)
    app.config.from_object("bemserver_ui.settings.Config")
    app.config.from_envvar("BEMSERVER_UI_SETTINGS_FILE", silent=True)
    app.config.from_object(config_override)

    app.jinja_env.trim_blocks = True
    app.jinja_env.lstrip_blocks = True

    extensions.init_app(app)
    internal_api.init_app(app)
    views.init_app(app)

    return app

"""BEMServer UI"""

import flask

from . import extensions
from . import views


def create_app():
    """Create application"""
    app = flask.Flask(__name__)
    app.config.from_object("bemserver_ui.settings.Config")
    app.config.from_envvar("FLASK_SETTINGS_FILE", silent=True)

    extensions.init_app(app)
    views.init_app(app)

    return app

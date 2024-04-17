"""BEMServer UI"""

import flask
from werkzeug.middleware.profiler import ProfilerMiddleware

from . import extensions, internal_api, views


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

    if profile_dir := app.config["PROFILE_DIR"]:
        app.wsgi_app = ProfilerMiddleware(
            app.wsgi_app, stream=None, profile_dir=profile_dir
        )

    return app

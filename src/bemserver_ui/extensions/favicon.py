"""Extension to fix favicon not found error from some browsers.

See https://flask.palletsprojects.com/en/stable/patterns/favicon/
"""

from pathlib import Path

import flask


def init_app(app):
    favicon_url = "/favicon.ico"

    app.add_url_rule(
        favicon_url,
        endpoint="favicon",
        redirect_to=app.url_for(
            "static",
            filename="images/bemserver.ico",
        ),
    )

    @app.route(favicon_url)
    def favicon():
        return flask.send_from_directory(
            Path(app.root_path).joinpath(app.static_url_path, "images"),
            "bemserver.ico",
            mimetype="image/vnd.microsoft.icon",
        )

"""BEMServer API client

API client exceptions are automatically handled by flask's error_handlers.
"""
import flask

from bemserver_api_client import BEMServerApiClient


def init_app(app):

    host = app.config["BEMSERVER_API_HOST"]
    use_ssl = app.config["BEMSERVER_API_USE_SSL"]

    def make_api_client(_):
        authentication_method = None
        if "auth_data" in flask.session:
            if app.config["BEMSERVER_API_AUTH_METHOD"] == "http_basic":
                authentication_method = BEMServerApiClient.make_http_basic_auth(
                    flask.session["auth_data"]["email"],
                    flask.session["auth_data"]["password"],
                )
        return BEMServerApiClient(
            host,
            use_ssl=use_ssl,
            authentication_method=authentication_method,
        )

    with app.app_context():
        # Allows calling as flask.g.api_client instead of flask.g.api_client()
        flask.g.__class__.api_client = property(make_api_client)

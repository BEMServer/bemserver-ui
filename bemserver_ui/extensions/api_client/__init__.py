"""BEMServer API client"""
import flask

from .client import BEMServerApiClient, HTTPBasicAuth
from .exceptions import (  # noqa
    BEMServerAPIValidationError,
    BEMServerAPINotFoundError,
)


def init_app(app):

    host = app.config["BEMSERVER_API_HOST"]
    use_ssl = app.config["BEMSERVER_API_USE_SSL"]
    base_uri = f"http{'s' if use_ssl else ''}://{host}"

    def make_api_client(_):
        authentication_method = None
        if "auth_data" in flask.session:
            if app.config["BEMSERVER_API_AUTH_METHOD"] == "http_basic":
                authentication_method = HTTPBasicAuth(
                    flask.session["auth_data"]["email"].encode(encoding="utf-8"),
                    flask.session["auth_data"]["password"].encode(encoding="utf-8"),
                )
        return BEMServerApiClient(
            base_uri=base_uri,
            authentication_method=authentication_method,
        )

    with app.app_context():
        # Allows calling as flask.g.api_client instead of flask.g.api_client()
        flask.g.__class__.api_client = property(make_api_client)

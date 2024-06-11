"""BEMServer API client

API client exceptions are automatically handled by flask's error_handlers.
"""

import flask

from bemserver_api_client import BEMServerApiClient
from bemserver_api_client.exceptions import BEMServerAPIVersionError

from bemserver_ui.extensions.auth import update_bearer_tokens


def init_app(app):
    host = app.config["BEMSERVER_API_HOST"]
    use_ssl = app.config["BEMSERVER_API_USE_SSL"]
    auth_method = app.config.get("BEMSERVER_API_AUTH_METHOD", "jwt")

    if not app.config.get("TESTING", False):
        _check_api_version(host, use_ssl)

    def make_api_client(_):
        authentication_method = None
        if "auth_data" in flask.session:
            if auth_method == "jwt":
                authentication_method = BEMServerApiClient.make_bearer_token_auth(
                    flask.session["auth_data"]["access_token"],
                    flask.session["auth_data"]["refresh_token"],
                    after_refresh_tokens_callback=update_bearer_tokens,
                )
            elif auth_method == "http_basic":
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


def _check_api_version(host, use_ssl):
    # Get current API version.
    apicli = BEMServerApiClient(host, use_ssl=use_ssl)
    api_version = apicli.about.getall().data["versions"]["bemserver_api"]
    # Check required API version for client.
    try:
        BEMServerApiClient.check_api_version(api_version)
    except BEMServerAPIVersionError as exc:
        flask.abort(500, description=f"API client error: {str(exc)}")

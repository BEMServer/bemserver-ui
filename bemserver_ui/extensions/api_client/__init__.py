"""BEMServer API client"""
import flask
from apiclient import (
    BasicAuthentication,
    JsonResponseHandler,
    JsonRequestFormatter,
    exceptions as ace,
)
from apiclient.error_handlers import BaseErrorHandler
from apiclient.request_strategies import RequestStrategy

from .client import BEMServerApiClient
from .exceptions import (
    BEMServerAPIValidationError,
    BEMServerAPINotFoundError,
    BEMServerClientError,
)


class JsonErrorHandler(BaseErrorHandler):
    """Error handler storing json message in custom BEMServerClientError"""

    @staticmethod
    def get_exception(response):
        status_code = response.get_status_code()
        exception_class = ace.UnexpectedError

        kwargs = {
            "message": (
                f"{status_code} Error: {response.get_status_reason()} "
                f"for url: {response.get_requested_url()}"
            ),
            "status_code": status_code,
            "info": response.get_raw_data(),
        }

        if 300 <= status_code < 400:
            exception_class = ace.RedirectionError
        elif 400 <= status_code < 500:
            exception_class = BEMServerClientError
            kwargs["json"] = response.get_json()
        elif 500 <= status_code < 600:
            exception_class = ace.ServerError

        return exception_class(**kwargs)


def process_client_error(exc):
    status_code = exc.status_code
    resp = exc.json

    # Auth error
    if status_code in (401, 403):
        flask.abort(status_code)

    if status_code in (409, 422):
        if status_code == 409:
            # Unique constraint error
            if resp["errors"].get("type") == "unique_constraint":
                errors = {
                    # TODO: manage multiple columns constraint
                    field: ("Must be unique",)
                    for field in resp["errors"]["fields"]
                }
            # Foreign key constraint error (and default case)
            else:
                errors = {"_general": ["Operation impossible."]}
        elif status_code == 422:
            errors = {}
            if "errors" in resp:
                # Marshmallow ValidationError
                for loc in ("json", "query", "files"):
                    if loc in resp["errors"]:
                        errors = {**errors, **resp["errors"][loc]}
                        if "_schema" in errors:
                            errors["_general"] = errors.pop("_schema")
            # BEMServer ValidationError
            elif "message" in resp:
                errors = {"_general": [resp["message"]]}
        for error in errors.pop("_general", []):
            flask.flash(error, "error")
        raise BEMServerAPIValidationError(errors=errors)

    if status_code == 404:
        raise BEMServerAPINotFoundError

    # Issue in BEMServer UI
    flask.abort(500, "A server error occured.")


class BEMServerAPIRequestStrategy(RequestStrategy):
    def _make_request(
        self, request_method, endpoint, params=None, headers=None, data=None, **kwargs
    ):
        try:
            ret = super()._make_request(
                request_method,
                endpoint,
                params=params,
                headers=headers,
                data=data,
                **kwargs,
            )
        # TODO: logging
        except (ace.UnexpectedError, ace.ResponseParseError):
            # Server unreachable, content not parsable. There is not much we can do.
            flask.abort(500, "A server error occured. Please try again later.")
        except ace.RedirectionError:
            # Issue in BEMServer UI
            flask.abort(500, "A server error occured.")
        except ace.ServerError:
            # Issue in BEMServer
            flask.abort(500, "A server error occured. Please try again later.")
        except BEMServerClientError as exc:
            process_client_error(exc)
        else:
            return ret


def init_app(app):

    host = app.config["BEMSERVER_API_HOST"]
    use_ssl = app.config["BEMSERVER_API_USE_SSL"]
    base_uri = f"http{'s' if use_ssl else ''}://{host}"

    def make_api_client(_):
        authentication_method = None
        if "auth_data" in flask.session:
            if app.config["BEMSERVER_API_AUTH_METHOD"] == "http_basic":
                authentication_method = BasicAuthentication(
                    flask.session["auth_data"]["email"],
                    flask.session["auth_data"]["password"],
                )
        return BEMServerApiClient(
            base_uri=base_uri,
            authentication_method=authentication_method,
            response_handler=JsonResponseHandler,
            request_formatter=JsonRequestFormatter,
            error_handler=JsonErrorHandler,
            request_strategy=BEMServerAPIRequestStrategy(),
        )

    with app.app_context():
        # Allows calling as flask.g.api_client instead of flask.g.api_client()
        flask.g.__class__.api_client = property(make_api_client)

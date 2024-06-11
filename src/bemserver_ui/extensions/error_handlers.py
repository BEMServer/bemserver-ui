"""BEMServer HTTP error handlers"""

import flask
import werkzeug.exceptions as wexc

from bemserver_api_client.exceptions import (
    BEMServerAPIAuthenticationError,
    BEMServerAPIAuthorizationError,
    BEMServerAPIConflictError,
    BEMServerAPIError,
    BEMServerAPINotFoundError,
    BEMServerAPINotModified,
    BEMServerAPIPreconditionError,
    BEMServerAPIValidationError,
)

from bemserver_ui.extensions.campaign_context import (
    IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME,
)


def _is_from_internal_api():
    if flask.request.endpoint is not None:
        return flask.request.endpoint.startswith("api.")
    return False


def _handle_for_internal_api(status_code, message, validation_errors=None):
    payload = {
        "message": message,
        "_validation_errors": validation_errors,
    }
    return flask.jsonify(payload), status_code


def _get_back_location(endpoint="main.index"):
    return (
        flask.request.args.get("back")
        or flask.request.referrer
        or flask.url_for(endpoint)
    )


def _should_handle_error(exc, expected_status_code):
    if isinstance(exc, BEMServerAPIError):
        return exc.status_code == expected_status_code
    elif isinstance(exc, wexc.HTTPException):
        return exc.code == expected_status_code
    return False


def _handle_304(exc):
    http_status_code = 304
    if _should_handle_error(exc, http_status_code):
        message = "Resource not modified!"
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "warning")
        return flask.redirect(_get_back_location(flask.request.endpoint))


def _handle_401(exc):
    http_status_code = 401
    if _should_handle_error(exc, http_status_code):
        message = "Incorrect or missing credentials"
        if hasattr(exc, "code"):
            message = f"{message} ({exc.code})"
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.session.clear()
        flask.flash(message, "error")
        return flask.redirect(
            flask.url_for(
                "auth.signin", **{IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: True}
            )
        )


def _handle_403(exc):
    http_status_code = 403
    if _should_handle_error(exc, http_status_code):
        message = "Insufficient permissions"
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "error")
        return flask.redirect(flask.url_for("main.index"))


def _handle_404(exc):
    http_status_code = 404
    if _should_handle_error(exc, http_status_code):
        message = "Resource not found!"
        if hasattr(exc, "description"):
            message = exc.description
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())


def _handle_409(exc):
    http_status_code = 409
    if _should_handle_error(exc, http_status_code):
        message = "Operation failed!"
        if hasattr(exc, "description"):
            message = exc.description
        elif hasattr(exc, "message"):
            message = exc.message
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())


def _handle_412(exc):
    http_status_code = 412
    if _should_handle_error(exc, http_status_code):
        message = (
            "Operation failed: invalid ETag precondition. Your version of an item in "
            "the page was probably not up to date.\nTry again."
        )
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())


def _handle_422(exc, message=None, errors=None):
    http_status_code = 422
    if _should_handle_error(exc, http_status_code):
        message = "Validation errors!"
        if hasattr(exc, "description"):
            message = exc.description
        elif hasattr(exc, "message"):
            message = exc.message
        errors = exc.errors if hasattr(exc, "errors") else {}

        if _is_from_internal_api():
            return _handle_for_internal_api(
                http_status_code, message, validation_errors=errors
            )

        # Special case for sign in page (to clear session, especially auth_data).
        if flask.request.endpoint == "auth.signin":
            flask.session.clear()

        flask.flash(message, "error", validation_errors=errors)
        return flask.redirect(_get_back_location())


def _handle_428(exc):
    http_status_code = 428
    if _should_handle_error(exc, http_status_code):
        message = "Internal error: ETag precondition required"
        if _is_from_internal_api():
            return _handle_for_internal_api(http_status_code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())


def init_app(app):
    # Internal app errors.
    # 401: unauthorized
    app.register_error_handler(wexc.Unauthorized, _handle_401)
    # 403: forbidden
    app.register_error_handler(wexc.Forbidden, _handle_403)
    # 404: not found
    app.register_error_handler(wexc.NotFound, _handle_404)
    # 409: conflict
    app.register_error_handler(wexc.Conflict, _handle_409)
    # 412: precondition failed
    app.register_error_handler(wexc.PreconditionFailed, _handle_412)
    # 422: unprocessable entity
    app.register_error_handler(wexc.UnprocessableEntity, _handle_422)
    # 428: unprocessable entity
    app.register_error_handler(wexc.PreconditionRequired, _handle_428)

    # API client errors.
    # 304: not modified
    app.register_error_handler(BEMServerAPINotModified, _handle_304)

    # 401: unauthorized
    app.register_error_handler(BEMServerAPIAuthenticationError, _handle_401)

    # 403: forbidden
    app.register_error_handler(BEMServerAPIAuthorizationError, _handle_403)

    # 404: not found
    app.register_error_handler(BEMServerAPINotFoundError, _handle_404)

    # 409: conflict
    app.register_error_handler(BEMServerAPIConflictError, _handle_409)
    # 422: unprocessable entity
    app.register_error_handler(BEMServerAPIValidationError, _handle_422)

    # 412: precondition failed
    # 428: unprocessable entity
    @app.errorhandler(BEMServerAPIPreconditionError)
    def _handle_412_428(exc):
        if exc.status_code == 412:
            return _handle_412(exc)
        elif exc.status_code == 428:
            return _handle_428(exc)

    # TODO: 500: internal server error

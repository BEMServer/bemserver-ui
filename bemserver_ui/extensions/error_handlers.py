"""BEMServer HTTP error handlers"""
import flask
import werkzeug.exceptions as wexc


def init_app(app):
    def _is_from_internal_api():
        if flask.request.endpoint is not None:
            return flask.request.endpoint.startswith("api.")
        return False

    def _handle_for_internal_api(status_code, message, validation_errors=None):
        payload = {"message": message}
        if validation_errors is not None:
            payload["_validation_errors"] = validation_errors
        return flask.jsonify(payload), status_code

    def _get_back_location(endpoint="main.index"):
        return (
            flask.request.args.get("back")
            or flask.request.referrer
            or flask.url_for(endpoint)
        )

    @app.errorhandler(wexc.Unauthorized)
    def handle_401(exc):
        message = "Incorrect or missing credentials"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message)
        flask.session.clear()
        flask.flash(message, "error")
        return flask.redirect(flask.url_for("auth.signin", ignore_campaign=True))

    @app.errorhandler(wexc.Forbidden)
    def handle_403(exc):
        message = "Insufficient permissions"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message)
        flask.flash(message, "error")
        return flask.redirect(flask.url_for("main.index"))

    @app.errorhandler(wexc.NotFound)
    def handle_404(exc):
        message = exc.description or "Item not found!"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.Conflict)
    def handle_409(exc):
        message = exc.description or "Operation failed!"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message, exc.response or {})
        flask.flash(message, "error")
        flask.session["_validation_errors"] = exc.response or {}
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.PreconditionFailed)
    def handle_412(exc):
        message = (
            "Operation failed: invalid ETag precondition. Your version of an item in "
            "the page was probably not up to date.\nTry again."
        )
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.UnprocessableEntity)
    def handle_422(exc):
        message = exc.description or "Operation failed!"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message, exc.response or {})
        flask.flash(message, "error")
        flask.session["_validation_errors"] = exc.response or {}
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.PreconditionRequired)
    def handle_428(exc):
        message = "Internal error: ETag precondition required"
        if _is_from_internal_api():
            return _handle_for_internal_api(exc.code, message)
        flask.flash(message, "error")
        return flask.redirect(_get_back_location())

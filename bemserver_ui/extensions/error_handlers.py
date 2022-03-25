"""BEMServer HTTP error handlers"""
import flask
import werkzeug.exceptions as wexc


def init_app(app):

    def _get_back_location(endpoint="main.index"):
        return (
            flask.request.args.get("back")
            or flask.request.referrer
            or flask.url_for(endpoint)
        )

    @app.errorhandler(wexc.Unauthorized)
    def handle_401(_):
        flask.flash("Incorrect or missing credentials", "error")
        return flask.redirect(flask.url_for("auth.signin"))

    @app.errorhandler(wexc.Forbidden)
    def handle_403(_):
        flask.flash("Insufficient permissions", "error")
        return flask.redirect(flask.url_for("main.index"))

    @app.errorhandler(wexc.NotFound)
    def handle_404(exc):
        flask.flash(exc.description or "Item not found!", "error")
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.Conflict)
    def handle_409(exc):
        flask.flash(exc.description or "Operation failed!", "error")
        flask.session["_validation_errors"] = exc.response or {}
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.PreconditionFailed)
    def handle_412(_):
        flask.flash("Internal error: ETag precondition failed", "error")
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.UnprocessableEntity)
    def handle_422(exc):
        flask.flash(exc.description or "Operation failed!", "error")
        flask.session["_validation_errors"] = exc.response or {}
        return flask.redirect(_get_back_location())

    @app.errorhandler(wexc.PreconditionRequired)
    def handle_428(_):
        flask.flash("Internal error: ETag precondition required", "error")
        return flask.redirect(_get_back_location())

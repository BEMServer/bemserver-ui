"""BEMServer HTTP error handlers"""
import flask
import werkzeug.exceptions as wexc


def init_app(app):

    @app.errorhandler(wexc.Unauthorized)
    def handle_401(_):
        flask.flash("Incorrect or missing credentials", "error")
        return flask.redirect(flask.url_for("auth.signin"))

    @app.errorhandler(wexc.Forbidden)
    def handle_403(_):
        flask.flash("Insufficient permissions", "error")
        return flask.redirect(flask.url_for("main.index"))

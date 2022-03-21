"""Sign in required decorator.

At the same time:
  - verify user's credentials
  - and refresh user data in session
"""
import functools
import flask
import werkzeug.exceptions as wexc


def signin_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Are there user's auth and account data in session?
        if "auth_data" not in flask.session or "user" not in flask.session:
            flask.session.clear()
            raise wexc.Unauthorized
        try:
            # Verfify user existence and credentials at the same time.
            user = flask.g.api_client.users.getone(flask.session["user"]["id"])
        except wexc.NotFound:
            flask.session.clear()
            raise wexc.Unauthorized
        else:
            # User still exist and credentials are valid.
            flask.session["user"] = user
        return f(*args, **kwargs)
    return decorated_function


def init_app(app):

    @app.context_processor
    def inject_signed_user():
        if "user" in flask.session:
            return dict(signed_user=flask.session["user"])
        return dict()

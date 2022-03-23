"""Sign in required decorator.

At the same time:
  - verify user's credentials
  - verify if user's role has grant access
  - refresh user data in session
"""
import enum
import functools
import flask
import werkzeug.exceptions as wexc


class Roles(enum.Enum):
    admin = "Administrator"


def signin_required(func=None, roles=None):

    # Verfify authorized roles format and content.
    if roles is None:
        roles = []
    elif not isinstance(roles, list):
        roles = [roles]
    for x in roles:
        if not isinstance(x, Roles):
            raise TypeError(f"Invalid role required on {func}: {x}")

    def signin_required_internal(func):
        @functools.wraps(func)
        def decorated(*args, **kwargs):

            # Are there user's auth and account data in session?
            if "auth_data" not in flask.session or "user" not in flask.session:
                flask.session.clear()
                raise wexc.Unauthorized
            try:
                # Verfify user existence and credentials at the same time.
                user_resp = flask.g.api_client.users.getone(
                    flask.session["user"]["data"]["id"])
            except wexc.NotFound:
                flask.session.clear()
                raise wexc.Unauthorized
            else:
                # User still exist and credentials are valid.
                flask.session["user"] = user_resp.toJSON()

            # Verify if user's role is sufficient for the requested action.
            if Roles.admin in roles and not user_resp.data["is_admin"]:
                raise wexc.Forbidden

            return func(*args, **kwargs)
        return decorated

    if func is not None:
        return signin_required_internal(func)
    return signin_required_internal


def init_app(app):

    @app.context_processor
    def inject_signed_user():
        if "user" in flask.session:
            return dict(signed_user=flask.session["user"]["data"])
        return dict()

"""Authentication stuff (sign in required decorator...)"""

import enum
import functools
import json

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

            # Verify that user's role is enough to do the requested action.
            if Roles.admin in roles and not flask.session["user"]["data"]["is_admin"]:
                raise wexc.Forbidden

            return func(*args, **kwargs)

        return decorated

    if func is not None:
        return signin_required_internal(func)
    return signin_required_internal


def update_bearer_tokens(access_token, refresh_token=None):
    flask.session["auth_data"] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


def init_app(app):
    @app.context_processor
    def inject_signed_user():
        if "user" in flask.session:
            return dict(signed_user=flask.session["user"]["data"])
        return dict()

    @app.route(f"{app.static_url_path}/scripts/modules/signedUserData.js")
    def es6_signed_user():
        user = (flask.session.get("user", {}) or {}).get("data")
        es6_signed_user_data = f"export const signedUser = {json.dumps(user)};"
        return flask.make_response(
            (es6_signed_user_data, 200, {"Content-Type": "text/javascript"})
        )

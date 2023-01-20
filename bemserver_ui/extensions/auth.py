"""Sign in required decorator.

At the same time:
  - verify user's credentials
  - verify if user's role has grant access
  - refresh user data in session
"""
import enum
import functools
import json
import flask
import werkzeug.exceptions as wexc

import bemserver_api_client.exceptions as bac


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
                    flask.session["user"]["data"]["id"],
                    etag=flask.session["user"]["etag"],
                )
            except wexc.NotFound as exc:
                flask.session.clear()
                raise wexc.Unauthorized from exc
            except wexc.Forbidden as exc:
                # Case of deactivated user while already using app.
                raise wexc.Unauthorized from exc
            except bac.BEMServerAPINotModified:
                # User still exist and not been updated since last check.
                pass
            else:
                # User exists and credentials are valid.
                flask.session["user"] = user_resp.toJSON()

            # Verify if user's role is sufficient for the requested action.
            if Roles.admin in roles and not flask.session["user"]["data"]["is_admin"]:
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

    @app.route(f"{app.static_url_path}/scripts/modules/signedUserData.js")
    def es6_signed_user():
        user = (flask.session.get("user", {}) or {}).get("data")
        es6_signed_user_data = f"export const signedUser = {json.dumps(user)};"
        return flask.make_response(
            (es6_signed_user_data, 200, {"Content-Type": "text/javascript"})
        )

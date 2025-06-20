"""Auth views (sign in/out)"""

import flask
import werkzeug.exceptions as wexc

from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import (
    IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME,
)

from .main import get_about_data

blp = flask.Blueprint("auth", __name__, url_prefix="/auth")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/signin", methods=["GET", "POST"])
def signin():
    # Verify if user has already signed in.
    if "user" in flask.session and "auth_data" in flask.session:
        return flask.redirect(flask.url_for("main.index"))

    # User tries to sign in.
    if flask.request.method == "POST":
        user_email = flask.request.form["email"]
        user_pwd = flask.request.form["pwd"]
        auth_method = flask.current_app.config.get("BEMSERVER_API_AUTH_METHOD", "jwt")

        # Credentials check.
        if auth_method == "jwt":
            auth_resp = flask.g.api_client.auth.get_tokens(user_email, user_pwd)
            if auth_resp.data["status"] == "failure":
                flask.session.clear()
                raise wexc.Unauthorized
            # When status is not "failure", then it is a "success".
            auth.update_bearer_tokens(
                auth_resp.data["access_token"], auth_resp.data["refresh_token"]
            )
        elif auth_method == "http_basic":
            # In this case, just set auth data in session.
            # Credentials check will really be done in next api request (get user...).
            flask.session["auth_data"] = {
                "email": user_email,
                "password": user_pwd,
            }
        user_resp = flask.g.api_client.users.getall(email=user_email)

        # At this step, credentials are valid.
        #  (else flask's error_handlers would have done something)
        user_json = user_resp.toJSON()
        # XXX: Ugly trick here... not really a problem as email is unique in DB.
        user_json["data"] = user_json["data"][0]
        flask.session["user"] = user_json
        flask.flash(f"Welcome back {user_json['data']['name']}!", "message", delay=5)
        url_redir = flask.url_for(
            "main.index",
            **{IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: True},
        )
        return flask.redirect(url_redir)

    about_data = get_about_data()

    # Render sign in form.
    return flask.render_template(
        "pages/signin.html",
        about_infos=about_data["app"],
        plugin_infos=about_data["plugins"],
    )


@blp.route("/signout")
@auth.signin_required
def signout():
    # Clear session to forget user's credentials in order to "sign out".
    username = flask.session["user"]["data"]["name"]
    flask.session.clear()
    flask.flash(f"You have signed out! Bye {username}", "message", delay=5)
    # Redirect to sign in form.
    return flask.redirect(flask.url_for("auth.signin"))

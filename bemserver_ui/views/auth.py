"""Auth views (sign in/out)"""
import flask

from bemserver_ui.extensions import auth


blp = flask.Blueprint("auth", __name__, url_prefix="/auth")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/signin", methods=["GET", "POST"])
def signin():
    # Verify if user has already signed in.
    if "user" in flask.session:
        return flask.redirect(flask.url_for("main.index"))

    # User tries to sign in.
    if flask.request.method == "POST":
        flask.session["auth_data"] = {
            "email": flask.request.form["email"],
            "password": flask.request.form["pwd"],
        }

        # Credentials check.
        user_resp = flask.g.api_client.users.getall(
            email=flask.session["auth_data"]["email"],
        )

        # At this step, credentials are valid.
        #  (else flask's error_handlers would have done something)
        # XXX: Little trick to "adapt" response data.
        user_json = user_resp.toJSON()
        user_json["data"] = user_json["data"][0]
        flask.session["user"] = user_json
        flask.flash(f"Welcome back {user_json['data']['name']}!", "message")
        return flask.redirect(flask.url_for("main.index", ignore_campaign=True))

    # Render sign in form.
    return flask.render_template("pages/signin.html")


@blp.route("/signout")
@auth.signin_required
def signout():
    # Clear session to forget user's credentials in order to "sign out".
    username = flask.session["user"]["data"]["name"]
    flask.session.clear()
    flask.flash(f"You have signed out! Bye {username}", "message")
    # Redirect to sign in form.
    return flask.redirect(flask.url_for("auth.signin"))

"""Auth views (sign in/out)"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth


blp = flask.Blueprint("auth", __name__, url_prefix="/auth")


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
        try:
            # Credentials check.
            user = flask.g.api_client.users.getall(
                email=flask.session["auth_data"]["email"])[0]
        except bac.BEMServerAPIValidationError as exc:
            flask.session.clear()
            flask.session["_validation_errors"] = exc.errors
            flask.flash("Operation failed!", "error")
        except KeyError:
            flask.session.clear()
            flask.flash("Incorrect credentials", "error")
        else:
            # Credentials are valid.
            flask.session["user"] = user
            flask.flash(f"Welcome back {user['name']}!", "message")
            return flask.redirect(flask.url_for("main.index"))

    # Render sign in form.
    return flask.render_template("pages/signin.html")


@blp.route("/signout")
@auth.signin_required
def signout():
    # Clear session to forget user's credentials in order to "sign out".
    username = flask.session["user"]["name"]
    flask.session.clear()
    flask.flash(f"You have signed out! Bye {username}", "message")
    # Redirect to sign in form.
    return flask.redirect(flask.url_for("auth.signin"))

"""Index page"""
import flask

from bemserver_ui.extensions import signin_required


blp = flask.Blueprint("main", __name__)


@blp.route("/")
@blp.route("/index")
@blp.route("/home")
@signin_required
def index():
    return flask.render_template("pages/home.html")


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
        except KeyError:
            flask.flash("Incorrect credentials", "error")
            # del flask.session["auth_data"]
            flask.session.clear()
        else:
            # Credentials are valid.
            flask.session["user"] = user
            flask.flash(f"Welcome back {user['name']}!", "message")
            return flask.redirect(flask.url_for("main.index"))

    # Render sign in form.
    return flask.render_template("pages/signin.html")


@blp.route("/signout")
@signin_required
def signout():
    # Clear session to forget user's credentials in order to "sign out".
    username = flask.session["user"]["name"]
    flask.session.clear()
    flask.flash(f"You have signed out! Bye {username}", "message")
    # Redirect to sign in form.
    return flask.redirect(flask.url_for("main.signin"))

"""Users views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth


blp = flask.Blueprint("users", __name__, url_prefix="/users")


@blp.route("/")
@auth.signin_required
def list():
    # TODO: add filters
    try:
        users = flask.g.api_client.users.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.session["_validation_errors"] = exc.errors
        flask.flash("Operation failed!", "error")
        return flask.redirect(flask.request.referrer)

    # TODO: manage pagination, if any
    return flask.render_template("pages/users/list.html", users=users)

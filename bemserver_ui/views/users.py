"""Users views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("users", __name__, url_prefix="/users")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    # TODO: add filters
    try:
        users_resp = flask.g.api_client.users.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template("pages/users/list.html", users=users_resp.data)


@blp.route("/view")
@auth.signin_required
def view():
    user_id = flask.request.args["id"]
    try:
        user = flask.g.api_client.users.getone(user_id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")

    return flask.render_template(
        "pages/users/view.html", user=user.data, etag=user.etag)

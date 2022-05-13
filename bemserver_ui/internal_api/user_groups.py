"""User groups internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("user_groups", __name__, url_prefix="/user_groups")


@blp.route("/<int:id>/add_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def add_user(id):
    payload = {"user_id": flask.request.json["user_id"], "user_group_id": id}
    try:
        ubug_resp = flask.g.api_client.user_by_user_groups.create(payload)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            409,
            description="Error while trying to add the user in a group!",
            response=exc.errors,
        )

    return flask.jsonify({"data": ubug_resp.data})


@blp.route("/<int:id>/remove_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_user(id):
    users_by_user_groups_id = flask.request.args["rel_id"]
    try:
        flask.g.api_client.user_by_user_groups.delete(users_by_user_groups_id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User has already been removed from this group!")

    return flask.jsonify({})

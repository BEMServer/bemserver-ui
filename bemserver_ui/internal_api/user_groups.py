"""User groups internal API"""
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("user_groups", __name__, url_prefix="/user_groups")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/<int:id>/add_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def add_user(id):
    payload = {"user_id": flask.request.json["user_id"], "user_group_id": id}
    ubug_resp = flask.g.api_client.user_by_user_groups.create(payload)
    return flask.jsonify({"data": ubug_resp.data})


@blp.route("/<int:id>/remove_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_user(id):
    users_by_user_groups_id = flask.request.args["rel_id"]
    flask.g.api_client.user_by_user_groups.delete(users_by_user_groups_id)
    return flask.jsonify({"success": True})

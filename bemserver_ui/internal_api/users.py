"""Users internal API"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth


blp = flask.Blueprint("users", __name__, url_prefix="/users")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/<int:id>/groups")
@auth.signin_required
def list_groups(id):
    # Get user's groups.
    user_groups = []
    user_group_ids = []
    user_groups_resp = flask.g.api_client.user_by_user_groups.getall(user_id=id)
    for x in user_groups_resp.data:
        try:
            user_group_resp = flask.g.api_client.user_groups.getone(
                id=x["user_group_id"]
            )
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a user group has been deleted meanwhile.
            pass
        else:
            user_group_data = user_group_resp.data
            user_group_data["rel_id"] = x["id"]
            user_groups.append(user_group_data)
            user_group_ids.append(user_group_data["id"])

    # Get available groups (all groups - user's groups).
    available_groups = []
    all_groups_resp = flask.g.api_client.user_groups.getall()
    for x in all_groups_resp.data:
        if x["id"] not in user_group_ids:
            available_groups.append(x)

    return flask.jsonify({"groups": user_groups, "available_groups": available_groups})

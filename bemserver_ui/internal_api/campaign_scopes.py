"""Campaign scopes internal API"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("campaign_scopes", __name__, url_prefix="/campaign_scopes")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id, sort="+name"
    )
    return flask.jsonify(campaign_scopes_resp.toJSON())


@blp.route("/<int:id>/groups")
@auth.signin_required
@ensure_campaign_context
def list_groups(id):
    # Get campaign scope's user groups.
    groups_resp = flask.g.api_client.user_groups_by_campaign_scopes.getall(
        campaign_scope_id=id
    )
    groups = []
    group_ids = []
    for x in groups_resp.data:
        try:
            group_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a user group has been deleted meanwhile.
            pass
        else:
            group_data = group_resp.data
            group_data["rel_id"] = x["id"]
            groups.append(group_data)
            group_ids.append(group_data["id"])

    # Get available groups (all groups - campaign scope's user groups).
    all_groups_resp = flask.g.api_client.user_groups.getall()
    available_groups = []
    for x in all_groups_resp.data:
        if x["id"] not in group_ids:
            available_groups.append(x)

    return flask.jsonify({"groups": groups, "available_groups": available_groups})


@blp.route("/<int:id>/add_group", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def add_group(id):
    payload = {
        "campaign_scope_id": id,
        "user_group_id": flask.request.json["group_id"],
    }
    ugbcs_resp = flask.g.api_client.user_groups_by_campaign_scopes.create(payload)
    return flask.jsonify({"data": ugbcs_resp.data})


@blp.route("/<int:id>/remove_group", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def remove_group(id):
    flask.g.api_client.user_groups_by_campaign_scopes.delete(
        flask.request.args["rel_id"]
    )
    return flask.jsonify({"success": True})

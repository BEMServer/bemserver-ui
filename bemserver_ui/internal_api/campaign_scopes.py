"""Campaign scopes internal API"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("campaign_scopes", __name__, url_prefix="/campaign_scopes")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/")
@auth.signin_required
def retrieve_list():
    campaign_id = None
    # Get scopes for current campaign in context, if any.
    if flask.g.campaign_ctxt.has_campaign:
        campaign_id = flask.g.campaign_ctxt.id
    # Overwrite campaign_id filter, to get scopes for another campaign than context.
    if "campaign_id" in flask.request.args:
        campaign_id = flask.request.args["campaign_id"]

    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=campaign_id, sort="+name"
    )
    return flask.jsonify(campaign_scopes_resp.toJSON())


@blp.route("/<int:id>/groups")
@auth.signin_required
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
def add_group(id):
    payload = {
        "campaign_scope_id": id,
        "user_group_id": flask.request.json["group_id"],
    }
    ugbcs_resp = flask.g.api_client.user_groups_by_campaign_scopes.create(payload)
    return flask.jsonify({"data": ugbcs_resp.data})


@blp.route("/<int:id>/remove_group", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_group(id):
    flask.g.api_client.user_groups_by_campaign_scopes.delete(
        flask.request.args["rel_id"]
    )
    return flask.jsonify({"success": True})

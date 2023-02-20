"""User groups views"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("user_groups", __name__, url_prefix="/user_groups")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    user_groups_resp = flask.g.api_client.user_groups.getall()
    return flask.render_template(
        "pages/user_groups/list.html", user_groups=user_groups_resp.data
    )


@blp.route("/<int:id>")
@auth.signin_required(roles=[Roles.admin])
def view(id):
    tab = flask.request.args.get("tab", "general")

    user_group = flask.g.api_client.user_groups.getone(id)

    # Get users in group.
    users = []
    users_resp = flask.g.api_client.user_by_user_groups.getall(user_group_id=id)
    for x in users_resp.data:
        try:
            user_resp = flask.g.api_client.users.getone(id=x["user_id"])
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a user has been deleted meanwhile.
            pass
        else:
            user_data = user_resp.data
            user_data["rel_id"] = x["id"]
            users.append(user_data)

    # Get campaigns for group.
    campaigns = []
    campaigns_resp = flask.g.api_client.user_groups_by_campaigns.getall(
        user_group_id=id
    )
    for x in campaigns_resp.data:
        try:
            campaign_resp = flask.g.api_client.campaigns.getone(id=x["campaign_id"])
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a campaign has been deleted meanwhile.
            pass
        else:
            campaign_data = campaign_resp.data
            campaign_data["rel_id"] = x["id"]
            campaigns.append(campaign_data)

    # Get campaign scopes for group.
    campaign_scopes = {x["id"]: [] for x in flask.g.campaign_ctxt.campaigns}
    campaign_scopes_count = 0
    campaign_scopes_resp = flask.g.api_client.user_groups_by_campaign_scopes.getall(
        user_group_id=id
    )
    for x in campaign_scopes_resp.data:
        try:
            campaign_scope_resp = flask.g.api_client.campaign_scopes.getone(
                id=x["campaign_scope_id"]
            )
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a campaign scope has been deleted meanwhile.
            pass
        else:
            campaign_scope_data = campaign_scope_resp.data
            campaign_scope_data["rel_id"] = x["id"]
            campaign_scopes[campaign_scope_data["campaign_id"]].append(
                campaign_scope_data
            )
            campaign_scopes_count += 1

    return flask.render_template(
        "pages/user_groups/view.html",
        user_group=user_group.data,
        etag=user_group.etag,
        users=users,
        campaigns=campaigns,
        campaign_scopes=campaign_scopes,
        campaign_scopes_count=campaign_scopes_count,
        tab=tab,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        user_group_name = flask.request.form["name"]
        flask.g.api_client.user_groups.create({"name": user_group_name})
        flask.flash(f"New user group created: {user_group_name}", "success")
        return flask.redirect(flask.url_for("user_groups.list"))

    return flask.render_template("pages/user_groups/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "GET":
        user_group = flask.g.api_client.user_groups.getone(id)

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        user_group = flask.g.api_client.user_groups.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        flask.flash("User group updated!", "success")
        return flask.redirect(
            flask.url_for("user_groups.manage", id=user_group.data["id"])
        )

    return flask.render_template(
        "pages/user_groups/edit.html", user_group=user_group.data, etag=user_group.etag
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.user_groups.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("User group deleted!", "success")
    return flask.redirect(flask.url_for("user_groups.list"))


@blp.route("/<int:id>/manage", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def manage(id):
    if flask.request.method == "POST":
        user_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for user_id in user_ids:
            flask.g.api_client.user_by_user_groups.create(
                {
                    "user_id": user_id,
                    "user_group_id": id,
                }
            )
        if len(user_ids) > 0:
            flask.flash("Selected user(s) added in group!", "success")

    user_group = flask.g.api_client.user_groups.getone(id)

    # Get users in group.
    users_resp = flask.g.api_client.user_by_user_groups.getall(user_group_id=id)
    users = []
    user_ids = []
    for x in users_resp.data:
        try:
            user_resp = flask.g.api_client.users.getone(id=x["user_id"])
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a user has been deleted meanwhile.
            pass
        else:
            user_data = user_resp.data
            user_data["rel_id"] = x["id"]
            users.append(user_data)
            user_ids.append(user_data["id"])

    # Get available users (all users - group's users).
    all_users_resp = flask.g.api_client.users.getall(is_active=True)
    available_users = []
    for x in all_users_resp.data:
        if x["id"] not in user_ids:
            available_users.append(x)

    return flask.render_template(
        "pages/user_groups/manage.html",
        user_group=user_group.data,
        etag=user_group.etag,
        users=users,
        available_users=available_users,
    )


@blp.route("/<int:id>/remove_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_user(id):
    users_by_user_groups_id = flask.request.args["rel_id"]
    flask.g.api_client.user_by_user_groups.delete(users_by_user_groups_id)
    flask.flash("User removed from group!", "success")
    return flask.redirect(flask.request.args["next"])


@blp.route("/<int:id>/manage_campaigns", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def manage_campaigns(id):
    if flask.request.method == "POST":
        campaign_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for campaign_id in campaign_ids:
            payload = {"campaign_id": campaign_id, "user_group_id": id}
            flask.g.api_client.user_groups_by_campaigns.create(payload)
        if len(campaign_ids) > 0:
            flask.flash("Selected campaign(s) added for user group!", "success")

    user_group = flask.g.api_client.user_groups.getone(id)

    # Get campaigns for user group.
    ugbc_resp = flask.g.api_client.user_groups_by_campaigns.getall(user_group_id=id)
    campaigns = []
    campaign_ids = []
    for x in ugbc_resp.data:
        try:
            campaign_resp = flask.g.api_client.campaigns.getone(id=x["campaign_id"])
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a campaign has been deleted meanwhile.
            pass
        else:
            campaign_data = campaign_resp.data
            campaign_data["rel_id"] = x["id"]
            campaigns.append(campaign_data)
            campaign_ids.append(campaign_data["id"])

    # Get available campaigns (all campaigns - group's campaigns).
    all_campaigns_resp = flask.g.api_client.campaigns.getall()
    available_campaigns = []
    for x in all_campaigns_resp.data:
        if x["id"] not in campaign_ids:
            available_campaigns.append(x)

    return flask.render_template(
        "pages/user_groups/manage_campaigns.html",
        user_group=user_group.data,
        etag=user_group.etag,
        campaigns=campaigns,
        available_campaigns=available_campaigns,
    )


@blp.route("/<int:id>/manage_campaign_scopes", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def manage_campaign_scopes(id):
    if flask.request.method == "POST":
        campaign_scope_ids = [x.split("-")[2] for x in flask.request.form.keys()]
        for campaign_scope_id in campaign_scope_ids:
            flask.g.api_client.user_groups_by_campaign_scopes.create(
                {
                    "campaign_scope_id": campaign_scope_id,
                    "user_group_id": id,
                }
            )
        if len(campaign_scope_ids) > 0:
            flask.flash("Selected campaign scope(s) added for user group!", "success")

    user_group = flask.g.api_client.user_groups.getone(id)

    # Get campaign scopes for user group.
    ugbcs_resp = flask.g.api_client.user_groups_by_campaign_scopes.getall(
        user_group_id=id
    )
    campaign_scopes = []
    campaign_scope_ids = []
    for x in ugbcs_resp.data:
        try:
            campaign_scope_resp = flask.g.api_client.campaign_scopes.getone(
                id=x["campaign_scope_id"]
            )
        except bac_exc.BEMServerAPINotFoundError:
            # Here, just ignore if a campaign scope has been deleted meanwhile.
            pass
        else:
            campaign_scope_data = campaign_scope_resp.data
            campaign_scope_data["rel_id"] = x["id"]
            campaign_scopes.append(campaign_scope_data)
            campaign_scope_ids.append(campaign_scope_data["id"])

    # Get available campaign scopes (all campaign scopes - group's campaign scopes).
    all_campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id
    )
    available_campaign_scopes = []
    for x in all_campaign_scopes_resp.data:
        if x["id"] not in campaign_scope_ids:
            available_campaign_scopes.append(x)

    return flask.render_template(
        "pages/user_groups/manage_campaign_scopes.html",
        user_group=user_group.data,
        etag=user_group.etag,
        campaign_scopes=campaign_scopes,
        available_campaign_scopes=available_campaign_scopes,
    )

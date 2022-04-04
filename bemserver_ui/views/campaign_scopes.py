"""Campaign scopes views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("campaign_scopes", __name__, url_prefix="/campaign_scopes")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def list():
    campaign_id = flask.g.campaign_ctxt.id
    try:
        campaign_scopes = flask.g.api_client.campaign_scopes.getall(
            campaign_id=campaign_id, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/campaign_scopes/list.html", campaign_scopes=campaign_scopes.data)


@blp.route("/<int:id>/view")
@auth.signin_required
@ensure_campaign_context
def view(id):
    try:
        campaign_scope = flask.g.api_client.campaign_scopes.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign not found!")

    # Get campaign scope's user groups.
    ugroups_resp = flask.g.api_client.user_groups_by_campaign_scopes.getall(
        campaign_scope_id=id)
    ugroups = []
    for x in ugroups_resp.data:
        try:
            ugroup_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
        except bac.BEMServerAPINotFoundError:
            # Here, just ignore if a user group has been deleted.
            pass
        else:
            ugroup_data = ugroup_resp.data
            ugroup_data["rel_id"] = x["id"]
            ugroups.append(ugroup_data)

    return flask.render_template(
        "pages/campaign_scopes/view.html", campaign_scope=campaign_scope.data,
        etag=campaign_scope.etag, user_groups=ugroups)


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "campaign_id": flask.g.campaign_ctxt.id,
        }
        try:
            ret = flask.g.api_client.campaign_scopes.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the campaign scope!",
                response=exc.errors)
        else:
            flask.flash(f"New campaign scope created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("campaign_scopes.view", id=ret.data["id"]))

    return flask.render_template("pages/campaign_scopes/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
@ensure_campaign_context
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        try:
            campaign_scope = flask.g.api_client.campaign_scopes.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating the campaign scope!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Campaign scope not found!")
        else:
            flask.flash("Campaign scope updated!", "success")
            return flask.redirect(flask.url_for("campaign_scopes.view", id=id))

    try:
        campaign_scope = flask.g.api_client.campaign_scopes.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign scope not found!")

    return flask.render_template(
        "pages/campaign_scopes/edit.html", campaign_scope=campaign_scope.data,
        etag=campaign_scope.etag)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete(id):
    try:
        flask.g.api_client.campaign_scopes.delete(
            id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign scope not found!")
    else:
        flask.flash("Campaign scope deleted!", "success")

    return flask.redirect(flask.url_for("campaign_scopes.list"))


@blp.route("/<int:id>/manage_groups", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def manage_groups(id):
    try:
        campaign_scope = flask.g.api_client.campaign_scopes.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign scope not found!")

    if flask.request.method == "POST":
        user_group_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for user_group_id in user_group_ids:
            try:
                flask.g.api_client.user_groups_by_campaign_scopes.create({
                    "campaign_scope_id": id,
                    "user_group_id": user_group_id,
                })
            except bac.BEMServerAPIValidationError as exc:
                flask.abort(
                    409, description=(
                        "An error occured while adding user group in campaign scope!"),
                    response=exc.errors)
        if len(user_group_ids) > 0:
            flask.flash("User added to selected group(s)!", "success")

    # Get campaign scope's user groups.
    groups_resp = flask.g.api_client.user_groups_by_campaign_scopes.getall(
        campaign_scope_id=id)
    groups = []
    group_ids = []
    for x in groups_resp.data:
        group_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
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

    return flask.render_template(
        "pages/campaign_scopes/manage_groups.html", campaign_scope=campaign_scope.data,
        etag=campaign_scope.etag, user_groups=groups,
        available_groups=available_groups)


@blp.route("/<int:id>/remove_user_group", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def remove_user_group(id):
    rel_id = flask.request.args["rel_id"]
    try:
        flask.g.api_client.user_groups_by_campaign_scopes.delete(rel_id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(
            404, description=(
                "User group has already been removed from this campaign scope!"))
    else:
        flask.flash("User group removed from campaign scope!", "success")

    return flask.redirect(flask.request.args["next"])

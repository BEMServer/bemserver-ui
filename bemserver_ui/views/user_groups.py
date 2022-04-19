"""User groups views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("user_groups", __name__, url_prefix="/user_groups")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        user_groups_resp = flask.g.api_client.user_groups.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/user_groups/list.html", user_groups=user_groups_resp.data)


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        try:
            ret = flask.g.api_client.user_groups.create({
                "name": flask.request.form["name"],
            })
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating user group!",
                response=exc.errors)
        else:
            flask.flash(f"New user group created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("user_groups.list"))

    return flask.render_template("pages/user_groups/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "GET":
        try:
            user_group = flask.g.api_client.user_groups.getone(id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User group not found!")

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        try:
            user_group = flask.g.api_client.user_groups.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating user group!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User group not found!")
        else:
            flask.flash("User group updated!", "success")
            return flask.redirect(
                flask.url_for("user_groups.manage", id=user_group.data["id"]))

    return flask.render_template(
        "pages/user_groups/edit.html",
        user_group=user_group.data, etag=user_group.etag)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.user_groups.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User group not found!")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            409, description="An error occured while trying to delete the group!",
            response=exc.errors)
    else:
        flask.flash("User group deleted!", "success")

    return flask.redirect(flask.url_for("user_groups.list"))


@blp.route("/<int:id>/manage", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def manage(id):
    if flask.request.method == "POST":
        user_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for user_id in user_ids:
            try:
                flask.g.api_client.user_by_user_groups.create({
                    "user_id": user_id,
                    "user_group_id": id,
                })
            except bac.BEMServerAPIValidationError as exc:
                flask.abort(
                    409, description=(
                        "An error occured while trying to set the group for a user!"),
                    response=exc.errors)
        if len(user_ids) > 0:
            flask.flash("Selected user(s) added in group!", "success")

    try:
        user_group = flask.g.api_client.user_groups.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User group not found!")

    # Get users in group.
    users_resp = flask.g.api_client.user_by_user_groups.getall(user_group_id=id)
    users = []
    user_ids = []
    for x in users_resp.data:
        try:
            user_resp = flask.g.api_client.users.getone(id=x["user_id"])
        except bac.BEMServerAPINotFoundError:
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
        "pages/user_groups/manage.html", user_group=user_group.data,
        etag=user_group.etag, users=users, available_users=available_users)


@blp.route("/<int:id>/remove_user", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_user(id):
    users_by_user_groups_id = flask.request.args["rel_id"]
    try:
        flask.g.api_client.user_by_user_groups.delete(users_by_user_groups_id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User has already been removed from this group!")
    else:
        flask.flash("User removed from group!", "success")

    return flask.redirect(flask.request.args["next"])

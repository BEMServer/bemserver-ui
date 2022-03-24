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


@blp.route("/view")
@auth.signin_required(roles=[Roles.admin])
def view():
    user_group_id = flask.request.args["id"]
    try:
        user_group = flask.g.api_client.user_groups.getone(user_group_id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User group not found!")

    # Get users.
    users_resp = flask.g.api_client.user_by_user_groups.getall(
        user_group_id=user_group_id)
    users = []
    for x in users_resp.data:
        user_resp = flask.g.api_client.users.getone(id=x["user_id"])
        users.append(user_resp.data)

    return flask.render_template(
        "pages/user_groups/view.html", user_group=user_group.data, etag=user_group.etag,
        users=users)


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


@blp.route("/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit():
    user_group_id = flask.request.args["id"]

    if flask.request.method == "GET":
        try:
            user_group = flask.g.api_client.user_groups.getone(user_group_id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User group not found!")

    elif flask.request.method == "POST":
        try:
            user_group = flask.g.api_client.user_groups.update(
                user_group_id, {
                    "name": flask.request.form["name"],
                }, etag=flask.request.form["editEtag"],
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating user group!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User group not found!")
        else:
            flask.flash("User group updated!", "success")
            return flask.redirect(
                flask.url_for("user_groups.view", id=user_group.data["id"]))

    return flask.render_template(
        "pages/user_groups/edit.html",
        user_group=user_group.data, etag=user_group.etag)


@blp.route("/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete():
    try:
        flask.g.api_client.user_groups.delete(
            flask.request.args["id"], etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User group not found!")
    else:
        flask.flash("User group deleted!", "success")

    return flask.redirect(flask.url_for("user_groups.list"))

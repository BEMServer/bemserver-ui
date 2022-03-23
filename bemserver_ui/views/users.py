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


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        try:
            ret = flask.g.api_client.users.create({
                "name": flask.request.form["name"],
                "email": flask.request.form["email"],
                "password": flask.request.form["password"],
            })
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating user account!",
                response=exc.errors)
        else:
            flask.flash(f"New user account created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("users.list"))

    return flask.render_template("pages/users/create.html")


@blp.route("/edit", methods=["GET", "POST"])
@auth.signin_required
def edit():
    user_id = flask.request.args["id"]

    if flask.request.method == "GET":
        try:
            user = flask.g.api_client.users.getone(user_id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User not found!")

    elif flask.request.method == "POST":
        try:
            user = flask.g.api_client.users.update(
                user_id, {
                    "name": flask.request.form["name"],
                    "email": flask.request.form["email"],
                    "password": flask.request.form["password"],
                }, etag=flask.request.form["editEtag"],
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating user account!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User not found!")
        else:
            flask.flash("User account updated!", "success")
            return flask.redirect(flask.url_for("users.view", id=user.data["id"]))

    return flask.render_template(
        "pages/users/edit.html", user=user.data, etag=user.etag)


@blp.route("/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete():
    try:
        flask.g.api_client.users.delete(
            flask.request.args["id"], etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account deleted!", "success")

    return flask.redirect(flask.url_for("users.list"))


@blp.route("/set_status", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_status():
    user_id = flask.request.args["id"]
    try:
        flask.g.api_client.users.set_active(
            user_id, "status" in flask.request.form,
            etag=flask.request.form["setStatusEtag"])
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while updating user's status!",
            response=exc.errors)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account status updated!", "success")

    return flask.redirect(flask.url_for("users.view", id=user_id))


@blp.route("/set_role", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_role():
    user_id = flask.request.args["id"]
    try:
        flask.g.api_client.users.set_admin(
            user_id, "admin" in flask.request.form,
            etag=flask.request.form["setRoleEtag"])
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while updating user's role!",
            response=exc.errors)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account role updated!", "success")

    return flask.redirect(flask.url_for("users.view", id=user_id))

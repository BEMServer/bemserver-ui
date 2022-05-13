"""Users views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("users", __name__, url_prefix="/users")


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    filters = {"is_admin": None, "is_active": None}

    # Get requested filters.
    if flask.request.method == "POST":
        if flask.request.form["is_admin"] == "False":
            filters["is_admin"] = False
        elif flask.request.form["is_admin"] == "True":
            filters["is_admin"] = True

        if flask.request.form["is_active"] == "False":
            filters["is_active"] = False
        elif flask.request.form["is_active"] == "True":
            filters["is_active"] = True

    is_filtered = filters["is_admin"] is not None or filters["is_active"] is not None

    try:
        # Get users list applying filters.
        users_resp = flask.g.api_client.users.getall(**filters)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/users/list.html",
        users=users_resp.data,
        filters=filters,
        is_filtered=is_filtered,
    )


@blp.route("/<int:id>/view")
@auth.signin_required
def view(id):
    tab = flask.request.args.get("tab", "general")

    try:
        user = flask.g.api_client.users.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")

    return flask.render_template(
        "pages/users/view.html",
        user=user.data,
        etag=user.etag,
        tab=tab,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        try:
            ret = flask.g.api_client.users.create(
                {
                    "name": flask.request.form["name"],
                    "email": flask.request.form["email"],
                    "password": flask.request.form["password"],
                }
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="An error occured while creating user account!",
                response=exc.errors,
            )
        else:
            flask.flash(f"New user account created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("users.list"))

    return flask.render_template("pages/users/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
def edit(id):
    if flask.request.method == "GET":
        try:
            user = flask.g.api_client.users.getone(id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User not found!")

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "email": flask.request.form["email"],
            "password": flask.request.form["password"],
        }
        try:
            user = flask.g.api_client.users.update(
                id, payload, etag=flask.request.form["editEtag"]
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="An error occured while updating user account!",
                response=exc.errors,
            )
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="User not found!")
        else:
            flask.flash("User account updated!", "success")
            return flask.redirect(flask.url_for("users.view", id=user.data["id"]))

    return flask.render_template(
        "pages/users/edit.html", user=user.data, etag=user.etag
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.users.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account deleted!", "success")

    return flask.redirect(flask.url_for("users.list"))


@blp.route("/<int:id>/set_status", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_status(id):
    status = "status" in flask.request.form
    try:
        flask.g.api_client.users.set_active(
            id, status, etag=flask.request.form["setStatusEtag"]
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="An error occured while updating user's status!",
            response=exc.errors,
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account status updated!", "success")

    return flask.redirect(flask.url_for("users.view", id=id))


@blp.route("/<int:id>/set_role", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_role(id):
    status = "admin" in flask.request.form
    try:
        flask.g.api_client.users.set_admin(
            id, status, etag=flask.request.form["setRoleEtag"]
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="An error occured while updating user's role!",
            response=exc.errors,
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")
    else:
        flask.flash("User account role updated!", "success")

    return flask.redirect(flask.url_for("users.view", id=id))

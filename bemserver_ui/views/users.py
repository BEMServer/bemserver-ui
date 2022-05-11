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

    # Get user groups.
    user_groups_resp = flask.g.api_client.user_by_user_groups.getall(user_id=id)
    user_groups = []
    for x in user_groups_resp.data:
        try:
            group_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
        except bac.BEMServerAPINotFoundError:
            # Here, just ignore if a user group has been deleted.
            pass
        else:
            user_group_data = group_resp.data
            user_group_data["rel_id"] = x["id"]
            user_groups.append(user_group_data)

    return flask.render_template(
        "pages/users/view.html",
        user=user.data,
        etag=user.etag,
        user_groups=user_groups,
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


@blp.route("/<int:id>/manage_groups", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def manage_groups(id):
    if flask.request.method == "POST":
        user_group_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for user_group_id in user_group_ids:
            try:
                flask.g.api_client.user_by_user_groups.create(
                    {
                        "user_id": id,
                        "user_group_id": user_group_id,
                    }
                )
            except bac.BEMServerAPIValidationError as exc:
                flask.abort(
                    409,
                    description=(
                        "An error occured while trying to add the user in a group!"
                    ),
                    response=exc.errors,
                )
        if len(user_group_ids) > 0:
            flask.flash("User added to selected group(s)!", "success")

    try:
        user = flask.g.api_client.users.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="User not found!")

    # Get user's groups.
    user_groups_resp = flask.g.api_client.user_by_user_groups.getall(user_id=id)
    user_groups = []
    user_group_ids = []
    for x in user_groups_resp.data:
        user_group_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
        user_group_data = user_group_resp.data
        user_group_data["rel_id"] = x["id"]
        user_groups.append(user_group_data)
        user_group_ids.append(user_group_data["id"])

    # Get available groups (all groups - user's groups).
    all_groups_resp = flask.g.api_client.user_groups.getall()
    available_groups = []
    for x in all_groups_resp.data:
        if x["id"] not in user_group_ids:
            available_groups.append(x)

    return flask.render_template(
        "pages/users/manage_groups.html",
        user=user.data,
        etag=user.etag,
        user_groups=user_groups,
        available_groups=available_groups,
    )

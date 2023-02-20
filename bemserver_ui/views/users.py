"""Users views"""
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("users", __name__, url_prefix="/users")


def init_app(app):
    app.register_blueprint(blp)


# TODO: add filter by user group?
@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    sort = "+name"
    filters = {"is_admin": None, "is_active": None}

    # Get requested filters.
    if flask.request.method == "POST":
        sort = flask.request.form["sort"]

        if flask.request.form["is_admin"] == "False":
            filters["is_admin"] = False
        elif flask.request.form["is_admin"] == "True":
            filters["is_admin"] = True

        if flask.request.form["is_active"] == "False":
            filters["is_active"] = False
        elif flask.request.form["is_active"] == "True":
            filters["is_active"] = True

    is_filtered = any(
        [
            filters["is_admin"] is not None,
            filters["is_active"] is not None,
        ]
    )

    # Get users list applying filters.
    users_resp = flask.g.api_client.users.getall(sort=sort, **filters)

    return flask.render_template(
        "pages/users/list.html",
        users=users_resp.data,
        sort=sort,
        filters=filters,
        is_filtered=is_filtered,
    )


@blp.route("/<int:id>")
@auth.signin_required
def view(id):
    tab = flask.request.args.get("tab", "general")
    user_resp = flask.g.api_client.users.getone(id)
    return flask.render_template(
        "pages/users/view.html",
        user=user_resp.data,
        etag=user_resp.etag,
        tab=tab,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        user_resp = flask.g.api_client.users.create(
            {
                "name": flask.request.form["name"],
                "email": flask.request.form["email"],
                "password": flask.request.form["password"],
            }
        )
        flask.flash(f"New user account created: {user_resp.data['name']}", "success")
        return flask.redirect(flask.url_for("users.list"))

    return flask.render_template("pages/users/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
def edit(id):
    if flask.request.method == "GET":
        user_resp = flask.g.api_client.users.getone(id)

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "email": flask.request.form["email"],
            "password": flask.request.form["password"],
        }
        user_resp = flask.g.api_client.users.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        # If self edit password, update session.
        if flask.session["user"]["data"]["id"] == id:
            flask.session["auth_data"] = {
                "email": payload["email"],
                "password": payload["password"],
            }
            flask.session["user"] = user_resp.toJSON()

        flask.flash("User account updated!", "success")
        return flask.redirect(flask.url_for("users.view", id=user_resp.data["id"]))

    return flask.render_template(
        "pages/users/edit.html", user=user_resp.data, etag=user_resp.etag
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.users.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("User account deleted!", "success")
    return flask.redirect(flask.url_for("users.list"))


@blp.route("/<int:id>/set_status", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_status(id):
    flask.g.api_client.users.set_active(
        id,
        "status" in flask.request.form,
        etag=flask.request.form["setStatusEtag"],
    )
    flask.flash("User account status updated!", "success")
    return flask.redirect(flask.url_for("users.view", id=id))


@blp.route("/<int:id>/set_role", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def set_role(id):
    flask.g.api_client.users.set_admin(
        id,
        "admin" in flask.request.form,
        etag=flask.request.form["setRoleEtag"],
    )
    flask.flash("User account role updated!", "success")
    return flask.redirect(flask.url_for("users.view", id=id))

"""Event categories views"""
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("categories", __name__, url_prefix="/categories")


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    event_categories_resp = flask.g.api_client.event_categories.getall()
    return flask.render_template(
        "pages/events/categories/list.html",
        event_categories=event_categories_resp.data,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        event_category_resp = flask.g.api_client.event_categories.create(payload)
        flask.flash(
            f"New event category created: {event_category_resp.data['name']}",
            "success",
        )
        return flask.redirect(flask.url_for("events.categories.list"))

    return flask.render_template("pages/events/categories/create.html")


@blp.route("/<int:id>", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        event_category_resp = flask.g.api_client.event_categories.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        flask.flash(
            f"{event_category_resp.data['name']} event category updated!", "success"
        )
        return flask.redirect(flask.url_for("events.categories.list"))

    event_category_resp = flask.g.api_client.event_categories.getone(id=id)
    return flask.render_template(
        "pages/events/categories/edit.html",
        event_category=event_category_resp.data,
        etag=event_category_resp.etag,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.event_categories.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("Event category deleted!", "success")
    return flask.redirect(flask.url_for("events.categories.list"))

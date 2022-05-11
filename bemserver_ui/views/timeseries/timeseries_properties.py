"""Timeseries properties views"""
import urllib.parse
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint(
    "timeseries_properties", __name__, url_prefix="/timeseries_properties"
)


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        properties_resp = flask.g.api_client.timeseries_properties.getall(sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    return flask.render_template(
        "pages/timeseries/properties/list.html", properties=properties_resp.data
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        try:
            ret_resp = flask.g.api_client.timeseries_properties.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="An error occured while creating the property!",
                response=exc.errors,
            )
        else:
            prop_name = ret_resp.data["name"]
            flask.flash(f"New timeseries property created: {prop_name}", "success")
            url_next = urllib.parse.unquote(
                flask.request.args.get("next")
                or flask.url_for("timeseries_properties.list")
            )
            return flask.redirect(url_next)

    url_cancel = urllib.parse.unquote(
        flask.request.args.get("back") or flask.url_for("timeseries_properties.list")
    )

    return flask.render_template(
        "pages/timeseries/properties/create.html", url_cancel=url_cancel
    )


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        try:
            prop_resp = flask.g.api_client.timeseries_properties.update(
                id, payload, etag=flask.request.form["editEtag"]
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="Error while updating the timeseries property!",
                response=exc.errors,
            )
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Timeseries property not found!")
        else:
            prop_name = prop_resp.data["name"]
            flask.flash(f"{prop_name} timeseries property updated!", "success")
            return flask.redirect(flask.url_for("timeseries_properties.list"))

    try:
        ts_properties_resp = flask.g.api_client.timeseries_properties.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries property not found!")

    return flask.render_template(
        "pages/timeseries/properties/edit.html",
        property=ts_properties_resp.data,
        etag=ts_properties_resp.etag,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.timeseries_properties.delete(
            id, etag=flask.request.form["delEtag"]
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries property not found!")
    else:
        flask.flash("Timeseries property deleted!", "success")

    return flask.redirect(flask.url_for("timeseries_properties.list"))

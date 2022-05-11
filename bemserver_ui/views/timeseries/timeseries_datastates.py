"""Timeseries data states views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint(
    "timeseries_datastates", __name__, url_prefix="/timeseries_datastates"
)


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        timeseries_datastates_resp = flask.g.api_client.timeseries_datastates.getall(
            sort="+name"
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/timeseries/datastates/list.html",
        timeseries_datastates=timeseries_datastates_resp.data,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        try:
            ret = flask.g.api_client.timeseries_datastates.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="Error while creating the timeseries data state!",
                response=exc.errors,
            )
        else:
            flask.flash(
                f"New timeseries data state created: {ret.data['name']}", "success"
            )
            return flask.redirect(flask.url_for("timeseries_datastates.list"))

    return flask.render_template("pages/timeseries/datastates/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        try:
            ts_datastates_resp = flask.g.api_client.timeseries_datastates.update(
                id, payload, etag=flask.request.form["editEtag"]
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="Error while updating the timeseries data state!",
                response=exc.errors,
            )
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Timeseries data state not found!")
        else:
            flask.flash(
                f"{ts_datastates_resp.data['name']} timeseries data state updated!",
                "success",
            )
            return flask.redirect(flask.url_for("timeseries_datastates.list"))

    try:
        ts_datastates_resp = flask.g.api_client.timeseries_datastates.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries data state not found!")

    return flask.render_template(
        "pages/timeseries/datastates/edit.html",
        timeseries_datastate=ts_datastates_resp.data,
        etag=ts_datastates_resp.etag,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.timeseries_datastates.delete(
            id, etag=flask.request.form["delEtag"]
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries data state not found!")
    else:
        flask.flash("Timeseries data state deleted!", "success")

    return flask.redirect(flask.url_for("timeseries_datastates.list"))

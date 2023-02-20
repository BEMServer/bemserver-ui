"""Timeseries data states views"""
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("datastates", __name__, url_prefix="/datastates")


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")
    return flask.render_template(
        "pages/timeseries/datastates/list.html",
        timeseries_datastates=ts_datastates_resp.data,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        ts_datastates_resp = flask.g.api_client.timeseries_datastates.create(payload)
        ts_ds_name = ts_datastates_resp.data["name"]
        flask.flash(f"New timeseries data state created: {ts_ds_name}", "success")
        return flask.redirect(flask.url_for("timeseries.datastates.list"))

    return flask.render_template("pages/timeseries/datastates/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
        }
        ts_datastates_resp = flask.g.api_client.timeseries_datastates.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        ts_ds_name = ts_datastates_resp.data["name"]
        flask.flash(f"{ts_ds_name} timeseries data state updated!", "success")
        return flask.redirect(flask.url_for("timeseries.datastates.list"))

    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getone(id)

    return flask.render_template(
        "pages/timeseries/datastates/edit.html",
        timeseries_datastate=ts_datastates_resp.data,
        etag=ts_datastates_resp.etag,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.timeseries_datastates.delete(
        id, etag=flask.request.form["delEtag"]
    )
    flask.flash("Timeseries data state deleted!", "success")
    return flask.redirect(flask.url_for("timeseries.datastates.list"))

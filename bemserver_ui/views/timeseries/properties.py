"""Timeseries properties views"""
import urllib.parse
import flask

from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("properties", __name__, url_prefix="/properties")


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    properties_resp = flask.g.api_client.timeseries_properties.getall(sort="+name")
    return flask.render_template(
        "pages/timeseries/properties/list.html", properties=properties_resp.data
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "value_type": flask.request.form["value_type"],
            "unit_symbol": flask.request.form["unit_symbol"],
            "description": flask.request.form["description"],
        }
        ts_prop_resp = flask.g.api_client.timeseries_properties.create(payload)
        prop_name = ts_prop_resp.data["name"]
        flask.flash(f"New timeseries property created: {prop_name}", "success")
        url_next = urllib.parse.unquote(
            flask.request.args.get("next")
            or flask.url_for("timeseries_properties.list")
        )
        return flask.redirect(url_next)

    url_cancel = urllib.parse.unquote(
        flask.request.args.get("back") or flask.url_for("timeseries.properties.list")
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
            "unit_symbol": flask.request.form["unit_symbol"],
            "description": flask.request.form["description"],
        }
        prop_resp = flask.g.api_client.timeseries_properties.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        prop_name = prop_resp.data["name"]
        flask.flash(f"{prop_name} timeseries property updated!", "success")
        return flask.redirect(flask.url_for("timeseries.properties.list"))

    ts_properties_resp = flask.g.api_client.timeseries_properties.getone(id)

    return flask.render_template(
        "pages/timeseries/properties/edit.html",
        property=ts_properties_resp.data,
        etag=ts_properties_resp.etag,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.timeseries_properties.delete(
        id, etag=flask.request.form["delEtag"]
    )
    flask.flash("Timeseries property deleted!", "success")
    return flask.redirect(flask.url_for("timeseries.properties.list"))

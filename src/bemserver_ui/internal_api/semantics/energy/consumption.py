"""Energy consumption semantics internal API"""

import flask

from bemserver_ui.extensions import Roles, auth

blp = flask.Blueprint("consumption", __name__, url_prefix="/consumption")


@blp.route("/end_uses")
@auth.signin_required
def list_end_uses():
    end_uses_resp = flask.g.api_client.energy_end_uses.getall()
    return flask.jsonify(end_uses_resp.toJSON())


@blp.route("/<string:struct_elmt_type>")
@auth.signin_required
def list(struct_elmt_type):
    filters = {}
    if struct_elmt_type in flask.request.args:
        filters[f"{struct_elmt_type}_id"] = flask.request.args[struct_elmt_type]
    if "energy" in flask.request.args:
        filters["energy_id"] = flask.request.args["energy"]
    if "energy_use" in flask.request.args:
        filters["energy_use_id"] = flask.request.args["energy_use"]
    if "timeseries" in flask.request.args:
        filters["timeseries_id"] = flask.request.args["timeseries"]

    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    ts_ener_cons_resp = api_resource.getall(**filters)
    return flask.jsonify(ts_ener_cons_resp.toJSON())


@blp.route("/<string:struct_elmt_type>", methods=["POST"])
@auth.signin_required
def create(struct_elmt_type):
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    ts_ener_cons_resp = api_resource.create(flask.request.json)
    return flask.jsonify(ts_ener_cons_resp.toJSON())


@blp.route("/<int:id>/<string:struct_elmt_type>")
@auth.signin_required
def retrieve_one(id, struct_elmt_type):
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    ts_ener_cons_resp = api_resource.getone(id)
    return flask.jsonify(ts_ener_cons_resp.toJSON())


@blp.route("/<int:id>/<string:struct_elmt_type>", methods=["PUT"])
@auth.signin_required(roles=[Roles.admin])
def update(id, struct_elmt_type):
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    ts_ener_cons_resp = api_resource.update(
        id, flask.request.json, etag=flask.request.headers["ETag"]
    )
    return flask.jsonify(ts_ener_cons_resp.toJSON())


@blp.route("/<int:id>/<string:struct_elmt_type>", methods=["DELETE"])
@auth.signin_required(roles=[Roles.admin])
def delete(id, struct_elmt_type):
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    api_resource.delete(id, etag=flask.request.headers["ETag"])
    return flask.jsonify({"success": True})

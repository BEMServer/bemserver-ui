"""Analysis energy consumption setup internal API"""
import flask

from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("setup", __name__, url_prefix="/setup")


def _extend_energy_cons_ts_data(jsonData):
    # get timeseries name and unit symbol
    ts_resp = flask.g.api_client.timeseries.getone(jsonData["data"]["timeseries_id"])
    jsonData["data"]["ts_name"] = ts_resp.data["name"]
    jsonData["data"]["ts_unit"] = ts_resp.data["unit_symbol"]
    return jsonData


@blp.route("/", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    struct_elmt_type = flask.request.json.pop("structural_element_type")
    struct_elmt_id = flask.request.json.pop("structural_element_id")
    payload = {
        f"{struct_elmt_type}_id": struct_elmt_id,
        "source_id": flask.request.json["energy_source_id"],
        "end_use_id": flask.request.json["energy_use_id"],
        "timeseries_id": flask.request.json["timeseries_id"],
    }
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    energy_cons_ts_resp = api_resource.create(payload)

    jsonData = _extend_energy_cons_ts_data(energy_cons_ts_resp.toJSON())
    return flask.jsonify(jsonData)


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def update(id):
    etag = flask.request.headers["ETag"]
    struct_elmt_type = flask.request.json.pop("structural_element_type")
    struct_elmt_id = flask.request.json.pop("structural_element_id")
    payload = {
        f"{struct_elmt_type}_id": struct_elmt_id,
        "source_id": flask.request.json["energy_source_id"],
        "end_use_id": flask.request.json["energy_use_id"],
        "timeseries_id": flask.request.json["timeseries_id"],
    }
    api_resource = getattr(flask.g.api_client, f"energy_cons_ts_by_{struct_elmt_type}s")
    energy_cons_ts_resp = api_resource.update(id, payload, etag=etag)

    jsonData = _extend_energy_cons_ts_data(energy_cons_ts_resp.toJSON())
    return flask.jsonify(jsonData)


@blp.route("/<int:id>/<string:structural_element_type>", methods=["DELETE"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete(id, structural_element_type):
    etag = flask.request.headers["ETag"]
    api_resource = getattr(
        flask.g.api_client,
        f"energy_cons_ts_by_{structural_element_type}s",
    )
    api_resource.delete(id, etag=etag)
    return flask.jsonify({"success": True})


@blp.route("/<int:id>/<string:structural_element_type>")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def retrieve_one(id, structural_element_type):
    api_resource = getattr(
        flask.g.api_client,
        f"energy_cons_ts_by_{structural_element_type}s",
    )
    energy_cons_ts_resp = api_resource.getone(id)

    jsonData = _extend_energy_cons_ts_data(energy_cons_ts_resp.toJSON())
    return flask.jsonify(jsonData)

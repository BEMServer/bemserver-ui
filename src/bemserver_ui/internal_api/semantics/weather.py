"""Weather semantics internal API"""

import flask

from bemserver_api_client.enums import WeatherParameter

from bemserver_ui.extensions import Roles, auth

blp = flask.Blueprint("weather", __name__, url_prefix="/weather")


@blp.route("/parameters")
@auth.signin_required
def list_params():
    weather_params = {x.name: x.value for x in WeatherParameter}
    return flask.jsonify(weather_params)


def _extend_data(data):
    data["parameter_label"] = WeatherParameter[data["parameter"]].value
    data["timeseries"]["id"] = data["timeseries_id"]
    return data


@blp.route("/")
@auth.signin_required
def list():
    filters = {}
    if "site" in flask.request.args:
        filters["site_id"] = flask.request.args["site"]
    if "parameter" in flask.request.args:
        filters["parameter"] = flask.request.args["parameter"]
    if "timeseries" in flask.request.args:
        filters["timeseries_id"] = flask.request.args["timeseries"]
    if "forecast" in flask.request.args:
        filters["forecast"] = flask.request.args["forecast"]
    ts_weather_resp = flask.g.api_client.weather_ts_by_sites.getall(**filters)
    json_data = ts_weather_resp.toJSON()
    for param in json_data["data"]:
        param = _extend_data(param)
    return flask.jsonify(json_data)


@blp.route("/", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    payload = flask.request.json
    if "forecast" not in payload:
        payload["forecast"] = False
    ts_weather_resp = flask.g.api_client.weather_ts_by_sites.create(payload)

    json_data = ts_weather_resp.toJSON()
    json_data["data"] = _extend_data(json_data["data"])
    return flask.jsonify(json_data)


@blp.route("/<int:id>")
@auth.signin_required
def retrieve_one(id):
    ts_weather_resp = flask.g.api_client.weather_ts_by_sites.getone(id)

    json_data = ts_weather_resp.toJSON()
    json_data["data"] = _extend_data(json_data["data"])
    return flask.jsonify(json_data)


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required(roles=[Roles.admin])
def update(id):
    payload = flask.request.json
    if "forecast" not in payload:
        payload["forecast"] = False
    ts_weather_resp = flask.g.api_client.weather_ts_by_sites.update(
        id, payload, etag=flask.request.headers["ETag"]
    )

    json_data = ts_weather_resp.toJSON()
    json_data["data"] = _extend_data(json_data["data"])
    return flask.jsonify(json_data)


@blp.route("/<int:id>", methods=["DELETE"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    etag = flask.request.headers["ETag"]
    flask.g.api_client.weather_ts_by_sites.delete(id, etag=etag)
    return flask.jsonify({"success": True})

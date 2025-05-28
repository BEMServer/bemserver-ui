"""Tasks internal API"""

import json

import flask

from bemserver_api_client.enums import TaskOffsetUnit
from bemserver_api_client.exceptions import (
    BEMServerAPIValidationError,
)

from bemserver_ui.extensions import auth

blp = flask.Blueprint("tasks", __name__, url_prefix="/tasks")


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


@blp.route("/registered")
@auth.signin_required
def retrieve_registered():
    tasks_resp = flask.g.api_client.tasks.getall()
    return flask.jsonify(tasks_resp.data)


@blp.route("/offset_units")
@auth.signin_required
def retrieve_offset_units():
    data = [x.value for x in list(TaskOffsetUnit)]
    return flask.jsonify(data)


@blp.route("/run_once", methods=["POST"])
@auth.signin_required
def run_once():
    payload = {
        "task_name": flask.request.json["task_name"],
        "campaign_id": int(flask.request.json["campaign_id"]),
        "start_time": flask.request.json["start_time"],
        "end_time": flask.request.json["end_time"],
        "parameters": _stringify_parameters_or_422(flask.request.json["parameters"]),
    }
    flask.g.api_client.tasks.run_async(payload)
    return flask.jsonify({"success": True})


@blp.route("/")
@auth.signin_required
def retrieve_list():
    etag = flask.request.headers.get("ETag")
    filters = {}
    if "campaign" in flask.request.args and flask.request.args["campaign"] != "all":
        filters["campaign_id"] = flask.request.args["campaign"]
    if "task_state" in flask.request.args and flask.request.args["task_state"] != "all":
        filters["is_enabled"] = flask.request.args["task_state"] == "enabled"
    if "task_name" in flask.request.args and flask.request.args["task_name"] != "all":
        filters["task_name"] = flask.request.args["task_name"]
    tasks_resp = flask.g.api_client.task_by_campaign.getall(etag=etag, **filters)
    data = tasks_resp.toJSON()
    data["data"] = [_prepare_task_data(task) for task in data["data"]]
    return flask.jsonify(data)


@blp.route("/", methods=["POST"])
@auth.signin_required
def create():
    payload = {
        "task_name": flask.request.json["task_name"],
        "campaign_id": flask.request.json["campaign_id"],
        "is_enabled": flask.request.json["is_enabled"],
        "parameters": _stringify_parameters_or_422(flask.request.json["parameters"]),
        "offset_unit": flask.request.json["offset_unit"],
        "start_offset": int(flask.request.json["start_offset"]),
        "end_offset": int(flask.request.json["end_offset"]),
    }
    tasks_resp = flask.g.api_client.task_by_campaign.create(payload)
    data = tasks_resp.toJSON()
    data["data"] = _prepare_task_data(data["data"])
    return flask.jsonify(data)


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required
def update(id):
    payload = {
        "is_enabled": flask.request.json["is_enabled"],
        "parameters": _stringify_parameters_or_422(flask.request.json["parameters"]),
        "offset_unit": flask.request.json["offset_unit"],
        "start_offset": int(flask.request.json["start_offset"]),
        "end_offset": int(flask.request.json["end_offset"]),
    }
    etag = flask.request.headers["ETag"]
    tasks_resp = flask.g.api_client.task_by_campaign.update(id, payload, etag=etag)
    data = tasks_resp.toJSON()
    data["data"] = _prepare_task_data(data["data"])
    return flask.jsonify(data)


@blp.route("/<int:id>", methods=["DELETE"])
@auth.signin_required
def delete(id):
    etag = flask.request.headers["ETag"]
    flask.g.api_client.task_by_campaign.delete(id, etag=etag)
    return flask.jsonify({"success": True})


@blp.route("/<int:id>/")
@auth.signin_required
def get(id):
    etag = flask.request.headers.get("ETag")
    task_resp = flask.g.api_client.task_by_campaign.getone(id, etag=etag)
    data = task_resp.toJSON()
    data["data"] = _prepare_task_data(data["data"])
    return flask.jsonify(data)


def _prepare_task_data(task):
    task["parameters"] = json.dumps(task["parameters"])
    task["schedule_offset"] = (
        f"{task['start_offset']} to {task['end_offset']} {task['offset_unit']}"
    )
    return task


def _stringify_parameters_or_422(parameters, default_parameters="{}"):
    try:
        return json.loads(parameters or default_parameters)
    except json.decoder.JSONDecodeError as exc:
        raise BEMServerAPIValidationError(errors={"parameters": [str(exc)]}) from exc

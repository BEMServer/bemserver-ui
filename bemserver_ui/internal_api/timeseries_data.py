"""Timeseries data internal API"""
import flask
from io import StringIO
import csv

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("timeseries_data", __name__, url_prefix="/timeseries_data")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    data_state_id = flask.request.args["data_state"]
    start_time = flask.request.args["start_time"]
    end_time = flask.request.args["end_time"]
    aggregation = flask.request.args.get("agg")
    if aggregation == "none":
        aggregation = None
    duration = flask.request.args.get("duration")

    try:
        ts_resp = flask.g.api_client.timeseries.getone(id=id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries not found!")

    try:
        ts_datastate_resp = flask.g.api_client.timeseries_datastates.getone(
            id=data_state_id
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries data state not found!")

    try:
        if aggregation is not None and duration is not None:
            ts_data_csv = flask.g.api_client.timeseries_data.download_csv_aggregate(
                start_time,
                end_time,
                data_state_id,
                [id],
                duration,
                aggregation=aggregation,
            )
        else:
            ts_data_csv = flask.g.api_client.timeseries_data.download_csv(
                start_time,
                end_time,
                data_state_id,
                [id],
            )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while downloading timeseries data!",
            response=exc.errors,
        )

    ts_headers = ["Datetime", str(id)]
    csv_data = ts_data_csv.data.decode("utf-8")
    reader = csv.DictReader(StringIO(csv_data))
    ts_data = list(reader)

    return flask.jsonify(
        {
            "ts_id": id,
            "ts_name": ts_resp.data["name"],
            "ts_unit_symbol": ts_resp.data.get("unit_symbol"),
            "ts_headers": ts_headers,
            "ts_data": ts_data,
            "ts_datastate_id": data_state_id,
            "ts_datastate_name": ts_datastate_resp.data["name"],
            "ts_start_time": start_time,
            "ts_end_time": end_time,
        }
    )


@blp.route("/delete_data", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def delete_data():
    try:
        flask.g.api_client.timeseries_data.delete(
            flask.request.json["start_time"],
            flask.request.json["end_time"],
            flask.request.json["data_state"],
            flask.request.json["timeseries_ids"],
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while deleting timeseries data!",
            response=exc.errors,
        )

    return flask.jsonify({"success": True})

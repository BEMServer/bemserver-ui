"""Timeseries data internal API"""
from io import StringIO
import csv
import zoneinfo
import flask

from bemserver_api_client.enums import DataFormat, Aggregation, BucketWidthUnit
from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("data", __name__, url_prefix="/data")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    data_state_id = flask.request.args["data_state"]
    tz_name = flask.request.args["timezone"]
    start_date = flask.request.args["start_date"]
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"
    end_date = flask.request.args["end_date"]
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    aggregation = flask.request.args.get("agg")
    if aggregation == "none":
        aggregation = None
    bucket_width_value = flask.request.args.get("bucket_width_value")
    bucket_width_unit = flask.request.args.get("bucket_width_unit")

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_start = convert_html_form_datetime(start_date, start_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid start datetime!")
    try:
        dt_end = convert_html_form_datetime(end_date, end_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid end datetime!")

    ts_resp = flask.g.api_client.timeseries.getone(id=id)

    ts_datastate_resp = flask.g.api_client.timeseries_datastates.getone(
        id=data_state_id
    )

    if (
        aggregation is not None
        and bucket_width_value is not None
        and bucket_width_unit is not None
    ):
        ts_data_csv = flask.g.api_client.timeseries_data.download_aggregate(
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            [id],
            timezone=tz_name,
            aggregation=Aggregation(aggregation),
            bucket_width_value=bucket_width_value,
            bucket_width_unit=BucketWidthUnit(bucket_width_unit),
            format=DataFormat.csv,
        )
    else:
        ts_data_csv = flask.g.api_client.timeseries_data.download(
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            [id],
            timezone=tz_name,
            format=DataFormat.csv,
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


@blp.route("/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_multiple_data():
    campaign = flask.g.campaign_ctxt.id
    ts_names = [str(x) for x in flask.request.args["timeseries"].split(",")]
    data_state_id = flask.request.args["data_state"]
    tz_name = flask.request.args["timezone"]
    start_date = flask.request.args["start_date"]
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"
    end_date = flask.request.args["end_date"]
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    aggregation = flask.request.args.get("agg")
    if aggregation == "none":
        aggregation = None
    bucket_width_value = flask.request.args.get("bucket_width_value")
    bucket_width_unit = flask.request.args.get("bucket_width_unit")

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_start = convert_html_form_datetime(start_date, start_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid start datetime!")
    try:
        dt_end = convert_html_form_datetime(end_date, end_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid end datetime!")

    ts_datastate_resp = flask.g.api_client.timeseries_datastates.getone(
        id=data_state_id
    )

    if (
        aggregation is not None
        and bucket_width_value is not None
        and bucket_width_unit is not None
    ):
        ts_data_csv = flask.g.api_client.timeseries_data.download_aggregate_by_names(
            campaign,
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            ts_names,
            timezone=tz_name,
            aggregation=Aggregation(aggregation),
            bucket_width_value=bucket_width_value,
            bucket_width_unit=BucketWidthUnit(bucket_width_unit),
            format=DataFormat.csv,
        )
    else:
        ts_data_csv = flask.g.api_client.timeseries_data.download_by_names(
            campaign,
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            ts_names,
            timezone=tz_name,
            format=DataFormat.csv,
        )

    ts_headers = ["Datetime"] + ts_names
    csv_data = ts_data_csv.data.decode("utf-8")
    reader = csv.DictReader(StringIO(csv_data))
    ts_data = list(reader)

    return flask.jsonify(
        {
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
    tz_name = flask.request.json["timezone"]
    tz = zoneinfo.ZoneInfo(tz_name)

    try:
        dt_start = convert_html_form_datetime(
            flask.request.json["start_date"],
            flask.request.json.get("start_time", "00:00") or "00:00",
            tz=tz,
        )
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid start datetime!")

    try:
        dt_end = convert_html_form_datetime(
            flask.request.json["end_date"],
            flask.request.json.get("end_time", "00:00") or "00:00",
            tz=tz,
        )
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid end datetime!")

    flask.g.api_client.timeseries_data.delete(
        dt_start.isoformat(),
        dt_end.isoformat(),
        flask.request.json["data_state"],
        flask.request.json["timeseries_ids"],
    )

    return flask.jsonify({"success": True})

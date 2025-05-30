"""Timeseries data internal API"""

import csv
import datetime as dt
import zoneinfo
from io import BytesIO, StringIO

import flask
from werkzeug.utils import secure_filename

from bemserver_api_client.enums import Aggregation, BucketWidthUnit, DataFormat

from bemserver_ui.common.analysis import (
    compute_explore_period_bounds,
    get_explore_period_type,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    convert_from_iso,
    convert_html_form_datetime,
    strfdelta,
)
from bemserver_ui.extensions import auth, ensure_campaign_context

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
    ts_ids = [int(x) for x in flask.request.args["timeseries"].split(",")]
    data_state_id = flask.request.args["data_state"]

    default_tz_name = flask.g.campaign_ctxt.tz_name
    tz_name = flask.request.args.get("timezone", default_tz_name) or default_tz_name

    period_type = get_explore_period_type(flask.request.args["period"])
    if period_type is None:
        flask.abort(422, description="Unknown period type!")

    end_date = flask.request.args.get("end_date")
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    start_date = flask.request.args.get("start_date")
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"

    aggregation = flask.request.args.get("agg")
    if aggregation == "none" or aggregation == "":
        aggregation = None
    bucket_width_value = flask.request.args.get("bucket_width_value")
    bucket_width_unit = flask.request.args.get("bucket_width_unit")

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, start_date, start_time, tz=tz
        )
    except BEMServerUICommonInvalidDatetimeError as exc:
        flask.abort(422, description=str(exc))

    if (
        aggregation is not None
        and bucket_width_value is not None
        and bucket_width_unit is not None
    ):
        ts_data_resp = flask.g.api_client.timeseries_data.download_aggregate(
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            ts_ids,
            timezone=tz_name,
            aggregation=Aggregation(aggregation),
            bucket_width_value=bucket_width_value,
            bucket_width_unit=BucketWidthUnit(bucket_width_unit),
        )
    else:
        ts_data_resp = flask.g.api_client.timeseries_data.download(
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            ts_ids,
            timezone=tz_name,
        )

    ts_data = ts_data_resp.data
    # Ensure each timeseries is in returned result, especially when not aggregated.
    for ts_id in ts_ids:
        if str(ts_id) not in ts_data:
            ts_data[str(ts_id)] = {}

    return flask.jsonify(ts_data)


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


@blp.route("/stats")
@auth.signin_required
@ensure_campaign_context
def retrieve_stats():
    ts_ids = [int(x) for x in flask.request.args["timeseries"].split(",")]
    data_state_id = flask.request.args["data_state"]
    tz_name = flask.request.args.get("timezone") or flask.g.campaign_ctxt.tz_name

    ts_data_stats_resp = flask.g.api_client.timeseries_data.get_stats(
        data_state_id,
        ts_ids,
        timezone=tz_name,
    )

    data_stats = ts_data_stats_resp.data["stats"]

    tz = zoneinfo.ZoneInfo(tz_name)
    dt_now = dt.datetime.now(tz=tz)
    for ts_stats in data_stats.values():
        try:
            dt_first = convert_from_iso(ts_stats["first_timestamp"], tz=tz)
            dt_last = convert_from_iso(ts_stats["last_timestamp"], tz=tz)
            ts_stats["period_duration"] = strfdelta(dt_last - dt_first)
            ts_stats["last_data_since"] = strfdelta(dt_now - dt_last)
        except BEMServerUICommonInvalidDatetimeError:
            # Exception raised if timestamps are None.
            ts_stats["period_duration"] = None
            ts_stats["last_data_since"] = None

    return flask.jsonify(data_stats)


@blp.route("/download")
@auth.signin_required
@ensure_campaign_context
def download_multiple():
    default_filename = "timeseries_data"
    filename = flask.request.args.get("filename", default_filename) or default_filename

    data_state_id = flask.request.args["data_state"]
    ts_names = [str(x) for x in flask.request.args["timeseries"].split(",")]

    if len(ts_names) <= 0:
        flask.abort(422, description="Missing timeseries!")

    default_tz_name = flask.g.campaign_ctxt.tz_name
    tz_name = flask.request.args.get("timezone", default_tz_name) or default_tz_name

    period_type = get_explore_period_type(flask.request.args["period"])
    if period_type is None:
        flask.abort(422, description="Unknown period type!")

    end_date = flask.request.args.get("end_date")
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    start_date = flask.request.args.get("start_date")
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"

    aggregation = flask.request.args.get("agg")
    if aggregation == "none":
        aggregation = None
    bucket_width_value = flask.request.args.get("bucket_width_value")
    bucket_width_unit = flask.request.args.get("bucket_width_unit")

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, start_date, start_time, tz=tz
        )
    except BEMServerUICommonInvalidDatetimeError as exc:
        flask.abort(422, description=str(exc))

    if (
        aggregation is not None
        and bucket_width_value is not None
        and bucket_width_unit is not None
    ):
        ts_data_csv = flask.g.api_client.timeseries_data.download_aggregate_by_names(
            flask.g.campaign_ctxt.id,
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
            flask.g.campaign_ctxt.id,
            dt_start.isoformat(),
            dt_end.isoformat(),
            data_state_id,
            ts_names,
            timezone=tz_name,
            format=DataFormat.csv,
        )

    return flask.send_file(
        BytesIO(ts_data_csv.data),
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"{secure_filename(filename)}.csv",
    )

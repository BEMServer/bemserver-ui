"""Timeseries data views"""

import calendar
import datetime as dt
import io
import zoneinfo

import flask

from bemserver_api_client.enums import Aggregation, BucketWidthUnit, DataFormat

from bemserver_ui.common.analysis import get_completeness_period_types
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    convert_from_iso,
    convert_html_form_datetime,
    get_isoweek_from_date,
    get_month_weeks,
)
from bemserver_ui.common.tools import is_filestream_empty
from bemserver_ui.extensions import Roles, auth, ensure_campaign_context

blp = flask.Blueprint("data", __name__, url_prefix="/data")


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        for up_filename, up_filestream in flask.request.files.items():
            if not is_filestream_empty(up_filestream):
                flask.g.api_client.timeseries_data.upload_by_names(
                    flask.g.campaign_ctxt.id,
                    flask.request.form["data_state"],
                    up_filestream.stream.read(),
                    format=DataFormat.csv,
                )
                flask.flash(
                    f"Timeseries data uploaded from {up_filestream.filename}",
                    "success",
                    delay=5,
                )
            else:
                flask.flash(f"{up_filename} is empty!", "warning", delay=10)
        return flask.redirect(
            flask.url_for(flask.request.args.get("next") or "main.index")
        )

    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")

    return flask.render_template(
        "pages/timeseries/data/upload.html",
        ts_datastates=ts_datastates_resp.data,
    )


@blp.route("/explore")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template(
        "pages/timeseries/data/explore.html",
        dt_end=dt.datetime.now(tz=zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)),
    )


@blp.route("/completeness")
@auth.signin_required
@ensure_campaign_context
def completeness():
    timeseries_ids = []
    if "timeseries" in flask.request.args:
        timeseries_ids = [
            int(x) for x in flask.request.args["timeseries"].split(",") if x != ""
        ]

    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")
    ts_datastate_ids = [int(x["id"]) for x in ts_datastates_resp.data]

    try:
        data_state_id = int(flask.request.args["data_state"])
    except (TypeError, ValueError, KeyError):
        data_state_id = None
    if len(ts_datastate_ids) > 0:
        if data_state_id not in ts_datastate_ids:
            data_state_id = ts_datastate_ids[0]
    else:
        data_state_id = None

    period_types = get_completeness_period_types()
    period_type_ids = [x["id"] for x in period_types]

    period_type = flask.request.args.get("period_type")
    if len(period_type_ids) > 0:
        if period_type not in period_type_ids:
            period_type = period_type_ids[0]
    else:
        period_type = None

    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    dt_now = dt.datetime.now(tz=tz)

    nb_years = 20
    years = list(range(dt_now.year - nb_years + 1, dt_now.year + 1))

    try:
        period_day = convert_from_iso(flask.request.args.get("period_day"), tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        period_day = dt_now

    period_year = period_day.year
    if "period_year" in flask.request.args:
        period_year = int(flask.request.args["period_year"])

    months = {
        month_number + 1: month_name
        for month_number, month_name in enumerate(calendar.month_name[1:])
    }

    period_month = period_day.month
    if "period_month" in flask.request.args:
        period_month = int(flask.request.args["period_month"])

    weeks = get_month_weeks(period_year, period_month, tz=tz)

    period_week = get_isoweek_from_date(period_day)
    if "period_week" in flask.request.args:
        period_week = flask.request.args["period_week"]

    return flask.render_template(
        "pages/timeseries/data/completeness.html",
        timeseries_ids=",".join([str(x) for x in timeseries_ids]),
        data_states=ts_datastates_resp.data,
        data_state_id=data_state_id,
        period_types=period_types,
        period_type=period_type,
        years=years,
        period_year=period_year,
        months=months,
        period_month=period_month,
        weeks=weeks,
        period_week=period_week,
        period_day=period_day,
    )


@blp.route("/<int:id>/download")
@auth.signin_required
@ensure_campaign_context
def download(id):
    ts_resp = flask.g.api_client.timeseries.getone(id=id)
    flask.request.args["timeseries"] = ts_resp.data["name"]
    return flask.redirect(
        flask.url_for("timeseries_data.download_multiple", flask.request.args)
    )


@blp.route("/download")
@auth.signin_required
@ensure_campaign_context
def download_multiple():
    data_state_id = flask.request.args["data_state"]
    ts_names = [str(x) for x in flask.request.args["timeseries"].split(",")]
    start_date = flask.request.args["start_date"]
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"
    end_date = flask.request.args["end_date"]
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    tz_name = flask.request.args["timezone"]
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
            format=DataFormat.csv,
        )

    return flask.send_file(
        io.BytesIO(ts_data_csv.data),
        as_attachment=True,
        download_name="timeseries_data.csv",
    )


@blp.route("/delete")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete():
    # Just render page. Delete is performed with internal API call from JS module.
    return flask.render_template("pages/timeseries/data/delete.html")

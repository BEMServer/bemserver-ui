"""Timeseries data views"""

import calendar
import datetime as dt
import zoneinfo

import flask

from bemserver_api_client.enums import DataFormat

from bemserver_ui.common.analysis import (
    get_aggregation_types,
    get_completeness_period_types,
    get_default_aggregation_type,
    get_explore_period_types,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    convert_from_iso,
    convert_html_form_datetime,
    convert_html_form_time,
    get_default_night,
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

    period_types = get_explore_period_types()
    period_type_ids = [x["id"] for x in period_types]

    period_type = flask.request.args.get("period_type")
    if len(period_type_ids) > 0:
        if period_type not in period_type_ids:
            period_type = period_type_ids[0]
    else:
        period_type = None

    default_tz_name = flask.g.campaign_ctxt.tz_name
    tz_name = flask.request.args.get("tz", default_tz_name) or default_tz_name
    tz = zoneinfo.ZoneInfo(tz_name)
    dt_now = dt.datetime.now(tz=tz)

    period_end_date = flask.request.args.get("period_end_date")
    period_end_time = flask.request.args.get("period_end_time", "00:00") or "00:00"
    try:
        period_end = convert_html_form_datetime(period_end_date, period_end_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        period_end = dt_now

    period_start_date = flask.request.args.get("period_start_date")
    period_start_time = flask.request.args.get("period_start_time", "00:00") or "00:00"
    try:
        period_start = convert_html_form_datetime(
            period_start_date, period_start_time, tz=tz
        )
    except BEMServerUICommonInvalidDatetimeError:
        period_start = period_end - dt.timedelta(days=1.0)

    agg_types = get_aggregation_types()
    agg_type_ids = [x["id"] for x in agg_types]

    agg = flask.request.args.get("agg")
    if agg == "" or agg == "none":
        agg = None
    if agg is not None and agg not in agg_type_ids:
        agg = get_default_aggregation_type()["id"]

    try:
        bucket_width_value = int(flask.request.args["bucket_width_value"])
    except (TypeError, ValueError, KeyError):
        bucket_width_value = 1
    bucket_width_unit = flask.request.args.get("bucket_width_unit", "hour")

    show_weekend_periods = flask.request.args.get("show_we", 0)
    if show_weekend_periods not in [0, 1]:
        show_weekend_periods = 0

    show_night_periods = flask.request.args.get("show_night", 0)
    if show_night_periods not in [0, 1]:
        show_night_periods = 0

    default_night_times = get_default_night()
    night_start_time = flask.request.args.get("night_start_time")
    night_end_time = flask.request.args.get("night_end_time")
    try:
        t_night_start = convert_html_form_time(night_start_time)
    except BEMServerUICommonInvalidDatetimeError:
        t_night_start = default_night_times[0]
    try:
        t_night_end = convert_html_form_time(night_end_time)
    except BEMServerUICommonInvalidDatetimeError:
        t_night_end = default_night_times[1]

    return flask.render_template(
        "pages/timeseries/data/explore.html",
        timeseries_ids=",".join([str(x) for x in timeseries_ids]),
        data_states=ts_datastates_resp.data,
        data_state_id=data_state_id,
        period_types=period_types,
        period_type=period_type,
        period_start=period_start,
        period_end=period_end,
        agg_types=agg_types,
        agg=agg,
        bucket_width_value=bucket_width_value,
        bucket_width_unit=bucket_width_unit,
        tz_name=tz_name,
        show_weekend_periods=show_weekend_periods,
        show_night_periods=show_night_periods,
        night_start_time=t_night_start,
        night_end_time=t_night_end,
    )


@blp.route("/compare_states")
@auth.signin_required
@ensure_campaign_context
def compare_states():
    timeseries_ids = []
    if "timeseries" in flask.request.args:
        timeseries_ids = [
            int(x) for x in flask.request.args["timeseries"].split(",") if x != ""
        ]

    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")
    ts_datastate_ids = [int(x["id"]) for x in ts_datastates_resp.data]

    try:
        data_state_id_1 = int(flask.request.args["data_state_1"])
    except (TypeError, ValueError, KeyError):
        data_state_id_1 = None
    if len(ts_datastate_ids) > 0:
        if data_state_id_1 not in ts_datastate_ids:
            data_state_id_1 = ts_datastate_ids[0]
    else:
        data_state_id_1 = None

    try:
        data_state_id_2 = int(flask.request.args["data_state_2"])
    except (TypeError, ValueError, KeyError):
        data_state_id_2 = None
    if len(ts_datastate_ids) > 0:
        ts_datastate_ids_for_2 = [x for x in ts_datastate_ids if x != data_state_id_1]
        if (
            len(ts_datastate_ids_for_2) > 0
            and data_state_id_2 not in ts_datastate_ids_for_2
        ):
            data_state_id_2 = ts_datastate_ids_for_2[0]
    else:
        data_state_id_2 = None

    period_types = get_explore_period_types()
    period_type_ids = [x["id"] for x in period_types]

    period_type = flask.request.args.get("period_type")
    if len(period_type_ids) > 0:
        if period_type not in period_type_ids:
            period_type = period_type_ids[0]
    else:
        period_type = None

    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    dt_now = dt.datetime.now(tz=tz)

    period_end_date = flask.request.args.get("period_end_date")
    period_end_time = flask.request.args.get("period_end_time", "00:00") or "00:00"
    try:
        period_end = convert_html_form_datetime(period_end_date, period_end_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        period_end = dt_now

    period_start_date = flask.request.args.get("period_start_date")
    period_start_time = flask.request.args.get("period_start_time", "00:00") or "00:00"
    try:
        period_start = convert_html_form_datetime(
            period_start_date, period_start_time, tz=tz
        )
    except BEMServerUICommonInvalidDatetimeError:
        period_start = period_end - dt.timedelta(days=1.0)

    return flask.render_template(
        "pages/timeseries/data/compare_states.html",
        timeseries_ids=",".join([str(x) for x in timeseries_ids]),
        data_states=ts_datastates_resp.data,
        data_state_id_1=data_state_id_1,
        data_state_id_2=data_state_id_2,
        period_types=period_types,
        period_type=period_type,
        period_start=period_start,
        period_end=period_end,
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


@blp.route("/delete")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete():
    # Just render page. Delete is performed with internal API call from JS module.
    return flask.render_template("pages/timeseries/data/delete.html")


@blp.route("/export")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def export():
    period_types = get_explore_period_types()
    agg_types = get_aggregation_types()

    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    dt_now = dt.datetime.now(tz=tz)
    period_end = dt_now

    return flask.render_template(
        "pages/timeseries/data/export.html",
        period_types=period_types,
        agg_types=agg_types,
        period_end=period_end,
    )

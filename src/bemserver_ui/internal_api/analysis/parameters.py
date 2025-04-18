"""Analysis parameters internal API"""

import zoneinfo

import flask

from bemserver_ui.common.analysis import (
    compute_explore_period_bounds,
    get_explore_period_type,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    # convert_html_form_datetime,
    get_month_weeks,
    get_weekend_timestamps_range,
)

blp = flask.Blueprint("parameters", __name__, url_prefix="/parameters")


@blp.route("/weeks/<int:year>/<int:month>")
def month_weeks(year, month):
    weeks = get_month_weeks(year, month)

    for week_info in weeks.values():
        week_info["start"] = week_info["start"].date().isoformat()
        week_info["end"] = week_info["end"].date().isoformat()
        for i in range(0, len(week_info["dates"])):
            week_info["dates"][i] = week_info["dates"][i].date().isoformat()

    return flask.jsonify(weeks)


@blp.route("/weekends/")
def weekends():
    tz_name = flask.request.args["timezone"]
    # start_date = flask.request.args["start_date"]
    # start_time = flask.request.args.get("start_time", "00:00") or "00:00"
    # end_date = flask.request.args["end_date"]
    # end_time = flask.request.args.get("end_time", "00:00") or "00:00"

    period_type = get_explore_period_type(flask.request.args["period"])
    if period_type is None:
        flask.abort(422, description="Unknown period type!")

    end_date = flask.request.args.get("end_date")
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    start_date = flask.request.args.get("start_date")
    start_time = flask.request.args.get("start_time", "00:00") or "00:00"

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, start_date, start_time, tz=tz
        )
    except BEMServerUICommonInvalidDatetimeError as exc:
        flask.abort(422, description=str(exc))

    # tz = zoneinfo.ZoneInfo(tz_name)
    # try:
    #     dt_start = convert_html_form_datetime(start_date, start_time, tz=tz)
    # except BEMServerUICommonInvalidDatetimeError:
    #     flask.abort(422, description="Invalid start datetime!")
    # try:
    #     dt_end = convert_html_form_datetime(end_date, end_time, tz=tz)
    # except BEMServerUICommonInvalidDatetimeError:
    #     flask.abort(422, description="Invalid end datetime!")

    weekends = get_weekend_timestamps_range(dt_start, dt_end)

    weekends_iso = [
        [weekend_date.isoformat() for weekend_date in weekend_range]
        for weekend_range in weekends
    ]

    return flask.jsonify(weekends_iso)

"""Analysis completeness internal API"""

import datetime as dt
import zoneinfo

import flask

from bemserver_api_client.enums import BucketWidthUnit

from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("completeness", __name__, url_prefix="/completeness")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_completeness():
    timeseries_ids = [int(i) for i in flask.request.args["timeseries"].split(",")]
    data_state_id = flask.request.args["data_state"]
    period_type = flask.request.args["period_type"]
    period_year = int(flask.request.args["period_year"])
    period_month = int(flask.request.args["period_month"])
    period_week = flask.request.args["period_week"]
    period_day = flask.request.args["period_day"]

    bucket_width_value = 1
    bucket_width_unit = BucketWidthUnit.day

    # Available period types:
    #     Year-Monthly
    #     Year-Daily
    #     Month-Daily
    #     Week-Daily
    #     Week-Hourly
    #     Day-Hourly
    if period_type.endswith("-Monthly"):
        bucket_width_unit = BucketWidthUnit.month
    elif period_type.endswith("-Daily"):
        bucket_width_unit = BucketWidthUnit.day
    elif period_type.endswith("-Hourly"):
        bucket_width_unit = BucketWidthUnit.hour

    tz_name = flask.g.campaign_ctxt.tz_name
    tz = zoneinfo.ZoneInfo(tz_name)

    if period_type.startswith("Year-"):
        dt_start = dt.datetime(period_year, 1, 1, tzinfo=tz)
        dt_end = dt.datetime(period_year + 1, 1, 1, tzinfo=tz)
    elif period_type.startswith("Month-"):
        dt_start = dt.datetime(period_year, period_month, 1, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, tzinfo=tz)
    elif period_type.startswith("Week-"):
        week_start, week_end = period_week.split("_")
        try:
            dt_start = convert_html_form_datetime(week_start, "00:00", tz=tz)
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid week start datetime!")
        try:
            dt_end = convert_html_form_datetime(week_end, "00:00", tz=tz)
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid week end datetime!")
        dt_end += dt.timedelta(days=1.0)
    elif period_type.startswith("Day-"):
        try:
            dt_start = convert_html_form_datetime(period_day, "00:00", tz=tz)
        except BEMServerUICommonInvalidDatetimeError:
            flask.abort(422, description="Invalid period datetime!")
        dt_end = dt_start + dt.timedelta(days=1.0)

    # Get completeness data.
    analysis_resp = flask.g.api_client.analysis.get_completeness(
        dt_start.isoformat(),
        dt_end.isoformat(),
        timeseries_ids,
        data_state_id,
        bucket_width_value,
        bucket_width_unit,
        timezone=tz_name,
    )

    return flask.jsonify(analysis_resp.data)

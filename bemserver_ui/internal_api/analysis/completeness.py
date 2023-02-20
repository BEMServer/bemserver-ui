"""Analysis completeness internal API"""
import datetime as dt
import zoneinfo
import calendar
import flask

from bemserver_api_client.enums import BucketWidthUnit
from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("completeness", __name__, url_prefix="/completeness")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_completeness():
    timeseries_ids = [int(i) for i in flask.request.args["timeseries"].split(",")]
    data_state_id = flask.request.args["data_state"]
    tz_name = flask.request.args["timezone"]
    end_date = flask.request.args["end_date"]
    end_time = flask.request.args.get("end_time", "00:00") or "00:00"
    bucket_width_value = flask.request.args.get("bucket_width_value")
    bucket_width_unit = flask.request.args.get("bucket_width_unit")
    period = flask.request.args.get("period")

    tz = zoneinfo.ZoneInfo(tz_name)
    try:
        dt_end = convert_html_form_datetime(end_date, end_time, tz=tz)
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid end datetime!")

    dt_period_delta = dt.timedelta(seconds=0.0)
    if period.startswith("Day-"):
        dt_period_delta = dt.timedelta(days=1.0)
    elif period.startswith("Week-"):
        dt_period_delta = dt.timedelta(days=7.0)
    elif period.startswith("Month-"):
        dt_period_delta = dt.timedelta(
            days=float(calendar.monthrange(dt_end.year, dt_end.month)[1])
        )
    elif period.startswith("Year-"):
        dt_period_delta = dt.timedelta(
            days=366.0 if calendar.isleap(dt_end.year) else 365.0
        )
    dt_start = dt_end - dt_period_delta

    # Get completeness data.
    analysis_resp = flask.g.api_client.analysis.get_completeness(
        dt_start.isoformat(),
        dt_end.isoformat(),
        timeseries_ids,
        data_state_id,
        bucket_width_value,
        BucketWidthUnit(bucket_width_unit),
        timezone=tz_name,
    )

    ts_datastate_resp = flask.g.api_client.timeseries_datastates.getone(
        id=data_state_id
    )

    completeness_data = analysis_resp.data
    completeness_data["datastate_name"] = ts_datastate_resp.data["name"]
    completeness_data["period"] = period

    return flask.jsonify(completeness_data)

"""Analysis completeness internal API"""

import zoneinfo

import flask

from bemserver_ui.common.analysis import (
    compute_completeness_period_bounds,
    get_completeness_period_type,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("completeness", __name__, url_prefix="/completeness")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_completeness():
    timeseries_ids = [
        int(x) for x in flask.request.args["timeseries"].split(",") if x != ""
    ]
    data_state_id = flask.request.args["data_state"]

    period_type_id = flask.request.args["period_type"]
    period_type = get_completeness_period_type(period_type_id)
    if period_type is None:
        flask.abort(422, description="Unknown period type!")

    try:
        period_year = int(flask.request.args["period_year"])
    except (
        TypeError,
        ValueError,
        KeyError,
    ):
        period_year = None

    try:
        period_month = int(flask.request.args["period_month"])
    except (
        TypeError,
        ValueError,
        KeyError,
    ):
        period_month = None

    tz_name = flask.g.campaign_ctxt.tz_name
    try:
        dt_start, dt_end = compute_completeness_period_bounds(
            period_type,
            period_year,
            period_month,
            flask.request.args.get("period_week"),
            flask.request.args.get("period_day"),
            tz=zoneinfo.ZoneInfo(tz_name),
        )
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid period datetime!")

    # Get completeness data.
    analysis_resp = flask.g.api_client.analysis.get_completeness(
        dt_start.isoformat(),
        dt_end.isoformat(),
        timeseries_ids,
        data_state_id,
        period_type["bucket_width_value"],
        period_type["bucket_width_unit"],
        timezone=tz_name,
    )

    return flask.jsonify(analysis_resp.data)

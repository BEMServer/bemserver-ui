"""Analysis energy consumption breakdowns internal API"""
import datetime as dt
import zoneinfo
import flask

from bemserver_api_client.enums import BucketWidthUnit, StructuralElement
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("breakdowns", __name__, url_prefix="/breakdowns")


@blp.route("/<string:structural_element_type>/<int:structural_element_id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_brkd(structural_element_type, structural_element_id):
    tz_name = flask.request.args.get("timezone", flask.g.campaign_ctxt.tz_name)
    period_type = flask.request.args["period_type"]
    period_month = int(flask.request.args["period_month"])
    period_year = int(flask.request.args["period_year"])
    year_reference = int(flask.request.args["year_reference"])

    bucket_width_value = 1
    bucket_width_unit = BucketWidthUnit.hour
    tz = zoneinfo.ZoneInfo(tz_name)
    if period_type == "Month-Hourly":
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 1, 0, 0, tzinfo=tz)
    elif period_type == "Month-Daily":
        bucket_width_unit = BucketWidthUnit.day
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
    elif period_type == "Year-Monthly":
        bucket_width_unit = BucketWidthUnit.month
        dt_start = dt.datetime(period_year, 1, 1, 0, 0, 0, tzinfo=tz)
        dt_end = dt.datetime(period_year + 1, 1, 1, 0, 0, 0, tzinfo=tz)
    elif period_type == "Yearly":
        bucket_width_unit = BucketWidthUnit.year
        dt_start = dt.datetime(year_reference - period_year, 1, 1, 0, 0, 0, tzinfo=tz)
        dt_end = dt.datetime(year_reference + 1, 1, 1, 0, 0, 0, tzinfo=tz)

    analysis_resp = flask.g.api_client.analysis.get_energy_consumption_breakdown(
        StructuralElement(structural_element_type),
        structural_element_id,
        dt_start.isoformat(),
        dt_end.isoformat(),
        bucket_width_value,
        bucket_width_unit,
        timezone=tz_name,
    )

    return flask.jsonify(analysis_resp.data)

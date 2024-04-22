"""Analysis degree days internal API"""

import calendar
import datetime as dt
import zoneinfo

import flask

from bemserver_api_client.enums import DegreeDaysPeriod, DegreeDaysType

from bemserver_ui.common.time import convert_from_iso
from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("degree_days", __name__, url_prefix="/degree_days")


@blp.route("/site/<int:site_id>")
@auth.signin_required
@ensure_campaign_context
def retrieve(site_id):
    period_type = flask.request.args["period_type"]
    period_month = int(flask.request.args["period_month"])
    period_year = int(flask.request.args["period_year"])
    year_reference = int(flask.request.args["year_reference"])
    str_dd_type = flask.request.args["dd_type"]
    dd_base = int(flask.request.args["dd_base"])
    dd_base_unit = flask.request.args["dd_base_unit"]
    compare_year_period_offset = flask.request.args.get("compare_year_period")

    period = DegreeDaysPeriod.day
    if period_type == "Month-Daily":
        period = DegreeDaysPeriod.day
        d_start = dt.date(period_year, period_month, 1)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        d_end = dt.date(end_year, end_month, 1)
    elif period_type == "Year-Monthly":
        period = DegreeDaysPeriod.month
        period_year_start = period_year
        if compare_year_period_offset is not None:
            period_year_start -= int(compare_year_period_offset)
        d_start = dt.date(period_year_start, 1, 1)
        d_end = dt.date(period_year + 1, 1, 1)
    elif period_type == "Yearly":
        period = DegreeDaysPeriod.year
        d_start = dt.date(year_reference - period_year, 1, 1)
        d_end = dt.date(year_reference + 1, 1, 1)

    dd_type = DegreeDaysType.heating
    dd_unit = "HDD"
    if str_dd_type == "heating":
        dd_type = DegreeDaysType.heating
        dd_unit = "HDD"
    elif str_dd_type == "cooling":
        dd_type = DegreeDaysType.cooling
        dd_unit = "CDD"

    analysis_resp = flask.g.api_client.sites.get_degree_days(
        site_id,
        d_start.isoformat(),
        d_end.isoformat(),
        period=period,
        type=dd_type,
        base=dd_base,
        unit=dd_base_unit,
    )

    dd_data = {
        "degree_days": {},
        "dd_unit": dd_unit,
        "dd_categories": None,
    }
    if compare_year_period_offset is not None and period_type == "Year-Monthly":
        dd_data["dd_categories"] = {}
        tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
        for k, v in analysis_resp.data["degree_days"].items():
            dt_row = convert_from_iso(k, tz=tz)
            if dt_row.year not in dd_data["degree_days"]:
                dd_data["degree_days"][dt_row.year] = {}
            if dt_row.month not in dd_data["degree_days"][dt_row.year]:
                dd_data["degree_days"][dt_row.year][dt_row.month] = v
            if dt_row.month not in dd_data["dd_categories"]:
                dd_data["dd_categories"][dt_row.month] = calendar.month_abbr[
                    dt_row.month
                ]
    else:
        dd_data["degree_days"] = analysis_resp.data["degree_days"]

    return flask.jsonify(dd_data)

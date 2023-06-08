"""Analysis weather data internal API"""
import datetime as dt
import zoneinfo
import flask

from bemserver_api_client.enums import (
    BucketWidthUnit,
    StructuralElement,
    WeatherParameter,
)
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("weather", __name__, url_prefix="/weather")


@blp.route("/site/<int:site_id>")
@auth.signin_required
@ensure_campaign_context
def retrieve(site_id):
    structural_element_type = flask.request.args["structural_element_type"]
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

    """
    tz = zoneinfo.ZoneInfo(tz_name)
    if period_type == "Minute-Day":
        print("AVANT")
        print(period_year)
        print(period_month)
        bucket_width_value = 10
        bucket_width_unit = BucketWidthUnit.minute
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
        print("APRES")
        print(dt_start)
        print(dt_end)
    elif period_type == "Hour-Week":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
    elif period_type == "Hour-Month":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
    elif period_type == "Day-Year":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.day
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
    """

    resp = flask.g.api_client.weather_ts_by_sites.getall(
        dt_start=dt_start,
        dt_end=dt_end,
    )

    parameters = {}
    parameters["energy"] = {}

    parameters["energy"]["Outdoor conditions"] = {}
    parameters["energy"]["Solar radiation"] = {}

    weather_data = flask.g.api_client.timeseries_data.download_aggregate(
        start_time=dt_start.isoformat(),
        end_time=dt_end.isoformat(),
        data_state=1,
        timeseries_ids=[data["timeseries_id"] for data in resp.data],
        bucket_width_unit=bucket_width_unit,
        bucket_width_value=bucket_width_value,
    )

    for data in resp.data:
        if data["parameter"] == "AIR_TEMPERATURE":
            data["parameter"] = WeatherParameter.AIR_TEMPERATURE.value
            parameters["energy"]["Outdoor conditions"][data["parameter"]] = []
        elif data["parameter"] == "RELATIVE_HUMIDITY":
            data["parameter"] = WeatherParameter.RELATIVE_HUMIDITY.value
            parameters["energy"]["Outdoor conditions"][data["parameter"]] = []
        elif data["parameter"] == "DIRECT_NORMAL_SOLAR_RADIATION":
            data["parameter"] = WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
            parameters["energy"]["Solar radiation"][data["parameter"]] = []
        elif data["parameter"] == "SURFACE_DIRECT_SOLAR_RADIATION":
            data["parameter"] = WeatherParameter.SURFACE_DIRECT_SOLAR_RADIATION.value
            parameters["energy"]["Solar radiation"][data["parameter"]] = []

        if str(data["timeseries_id"]) in weather_data.data:
            for val in weather_data.data[str(data["timeseries_id"])].values():
                if data["parameter"] == WeatherParameter.AIR_TEMPERATURE.value:
                    parameters["energy"]["Outdoor conditions"][
                        data["parameter"]
                    ].append(val)
                elif data["parameter"] == WeatherParameter.RELATIVE_HUMIDITY.value:
                    parameters["energy"]["Outdoor conditions"][
                        data["parameter"]
                    ].append(val)
                elif (
                    data["parameter"]
                    == WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                ):
                    parameters["energy"]["Solar radiation"][data["parameter"]].append(
                        val
                    )
                elif (
                    data["parameter"]
                    == WeatherParameter.SURFACE_DIRECT_SOLAR_RADIATION.value
                ):
                    parameters["energy"]["Solar radiation"][data["parameter"]].append(
                        val
                    )

    # ---------------------------- A CHANGER PLUS TARD --------------------------- #
    analysis_resp = flask.g.api_client.analysis.get_energy_consumption_breakdown(
        StructuralElement(structural_element_type),
        site_id,
        dt_start.isoformat(),
        dt_end.isoformat(),
        bucket_width_value,
        bucket_width_unit,
        timezone=tz_name,
    )

    parameters["timestamps"] = analysis_resp.data["timestamps"]

    return parameters

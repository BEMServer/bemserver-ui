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
    period_day = int(flask.request.args["period_day"])
    period_month = int(flask.request.args["period_month"])
    period_year = int(flask.request.args["period_year"])
    forecast = flask.request.args.get("forecast", "false")

    bucket_width_value = 10
    bucket_width_unit = BucketWidthUnit.minute
    tz = zoneinfo.ZoneInfo(tz_name)
    if period_type == "Day-Minute":
        dt_start = dt.datetime(
            period_year, period_month, period_day, 0, 0, 0, tzinfo=tz
        )
        if period_day == 31:
            end_month = period_month + 1
            if end_month == 13:
                end_month = 1
                end_year = period_year + 1
            else:
                end_year = period_year
            dt_end = dt.datetime(end_year, end_month, 1, 0, 0, 0, tzinfo=tz)
        else:
            dt_end = dt.datetime(
                period_year, period_month, period_day + 1, 0, 0, 0, tzinfo=tz
            )
    elif period_type == "Week-Hourly":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(
            period_year, period_month, period_day, 0, 0, 0, tzinfo=tz
        )
        dt_end = dt_start + dt.timedelta(days=7)
    elif period_type == "Month-Hourly":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(period_year, period_month, 1, 0, 0, 0, tzinfo=tz)
        end_year = period_year + (period_month // 12)
        end_month = (period_month % 12) + 1
        dt_end = dt.datetime(end_year, end_month, 1, 1, 0, 0, tzinfo=tz)
    elif period_type == "Year-Daily":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.day
        dt_start = dt.datetime(period_year, 1, 1, 0, 0, 0, tzinfo=tz)
        dt_end = dt.datetime(period_year + 1, 1, 1, 0, 0, 0, tzinfo=tz)
    elif period_type == "Last-Day":
        bucket_width_value = 10
        bucket_width_unit = BucketWidthUnit.minute
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=1)

    elif period_type == "Last-Week":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=7)

    elif period_type == "Last-Month":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=30)

    elif period_type == "Last-Year":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.day
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=365)

    if period_type.startswith("Last-") and forecast == "true":
        dt_end = dt_end + dt.timedelta(days=5)

    resp = flask.g.api_client.weather_ts_by_sites.getall(
        dt_start=dt_start, dt_end=dt_end, forecast=not forecast
    )

    new_data = []
    for data in resp.data:
        new_data.append(data)

    if forecast == "true" and period_type.startswith("Last-"):
        respForecast = flask.g.api_client.weather_ts_by_sites.getall(
            dt_start=dt_start,
            dt_end=dt_end,
            forecast=forecast == "true",
        )

        for data in respForecast.data:
            new_data.append(data)

    parameters = {}
    parameters["energy"] = {}

    weather_data = flask.g.api_client.timeseries_data.download_aggregate(
        start_time=dt_start.isoformat(),
        end_time=dt_end.isoformat(),
        data_state=1,
        timeseries_ids=[data["timeseries_id"] for data in new_data],
        bucket_width_unit=bucket_width_unit,
        bucket_width_value=bucket_width_value,
    )

    for data in new_data:
        if data["site_id"] == site_id:
            if (
                data["parameter"] == "AIR_TEMPERATURE"
                or data["parameter"] == "RELATIVE_HUMIDITY"
            ):
                parameters["energy"]["Outdoor conditions"] = {}
            elif (
                data["parameter"] == "DIRECT_NORMAL_SOLAR_RADIATION"
                or data["parameter"] == "SURFACE_SOLAR_RADIATION"
            ):
                parameters["energy"]["Solar radiation"] = {}

    for data in new_data:
        if data["site_id"] == site_id:
            if data["parameter"] == "AIR_TEMPERATURE":
                if data["forecast"] is True:
                    data["parameter"] = (
                        WeatherParameter.AIR_TEMPERATURE.value + " forecast"
                    )
                else:
                    data["parameter"] = WeatherParameter.AIR_TEMPERATURE.value
                parameters["energy"]["Outdoor conditions"][data["parameter"]] = []
            elif data["parameter"] == "RELATIVE_HUMIDITY":
                if data["forecast"] is True:
                    data["parameter"] = (
                        WeatherParameter.RELATIVE_HUMIDITY.value + " forecast"
                    )
                else:
                    data["parameter"] = WeatherParameter.RELATIVE_HUMIDITY.value
                parameters["energy"]["Outdoor conditions"][data["parameter"]] = []
            elif data["parameter"] == "DIRECT_NORMAL_SOLAR_RADIATION":
                if data["forecast"] is True:
                    data["parameter"] = (
                        WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                        + " forecast"
                    )
                else:
                    data[
                        "parameter"
                    ] = WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                parameters["energy"]["Solar radiation"][data["parameter"]] = []
            elif data["parameter"] == "SURFACE_SOLAR_RADIATION":
                if data["forecast"] is True:
                    data["parameter"] = (
                        WeatherParameter.SURFACE_SOLAR_RADIATION.value + " forecast"
                    )
                else:
                    data["parameter"] = WeatherParameter.SURFACE_SOLAR_RADIATION.value
                parameters["energy"]["Solar radiation"][data["parameter"]] = []

            if str(data["timeseries_id"]) in weather_data.data:
                for val in weather_data.data[str(data["timeseries_id"])].values():
                    if val is not None:
                        if (
                            data["parameter"] == WeatherParameter.AIR_TEMPERATURE.value
                            or data["parameter"]
                            == WeatherParameter.AIR_TEMPERATURE.value + " forecast"
                        ):
                            parameters["energy"]["Outdoor conditions"][
                                data["parameter"]
                            ].append(val)
                        elif (
                            data["parameter"]
                            == WeatherParameter.RELATIVE_HUMIDITY.value
                            or data["parameter"]
                            == WeatherParameter.RELATIVE_HUMIDITY.value + " forecast"
                        ):
                            parameters["energy"]["Outdoor conditions"][
                                data["parameter"]
                            ].append(val)
                        elif (
                            data["parameter"]
                            == WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                            or data["parameter"]
                            == WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                            + " forecast"
                        ):
                            parameters["energy"]["Solar radiation"][
                                data["parameter"]
                            ].append(val)
                        elif (
                            data["parameter"]
                            == WeatherParameter.SURFACE_SOLAR_RADIATION.value
                            or data["parameter"]
                            == WeatherParameter.SURFACE_SOLAR_RADIATION.value
                            + " forecast"
                        ):
                            parameters["energy"]["Solar radiation"][
                                data["parameter"]
                            ].append(val)

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

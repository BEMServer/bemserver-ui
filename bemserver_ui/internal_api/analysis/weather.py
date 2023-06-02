"""Analysis weather data internal API"""
import datetime as dt
import zoneinfo
import flask

from bemserver_ui.common import time

from bemserver_api_client.enums import (
    BucketWidthUnit,
    WeatherParameter,
)
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("weather", __name__, url_prefix="/weather")


@blp.route("/site/<int:site_id>")
@auth.signin_required
@ensure_campaign_context
def retrieve(site_id):
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
        dt_start = dt.datetime(period_year, period_month, period_day, tzinfo=tz)
        dt_end = dt_start + dt.timedelta(days=1)
    elif period_type == "Week-Hourly":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(period_year, period_month, period_day, tzinfo=tz)
        dt_end = dt_start + dt.timedelta(days=7)
    elif period_type == "Month-Hourly":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.hour
        dt_start = dt.datetime(period_year, period_month, 1, tzinfo=tz)
        dt_end = time.add_time(dt_start, months=1)
    elif period_type == "Year-Daily":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.day
        dt_start = dt.datetime(period_year, 1, 1, tzinfo=tz)
        dt_end = time.add_time(dt_start, years=1)
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
        dt_start = time.add_time(dt_end, months=-1)

    elif period_type == "Last-Year":
        bucket_width_value = 1
        bucket_width_unit = BucketWidthUnit.day
        dt_end = dt.datetime.now(tz)
        dt_start = time.add_time(dt_end, years=-1)

    dt_end_forecast = dt_end + dt.timedelta(days=5)

    respData = {
        "Outdoor conditions": {
            WeatherParameter.AIR_TEMPERATURE.name: {
                "forecast": {
                    "name": WeatherParameter.AIR_TEMPERATURE.value + " forecast",
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
                "current": {
                    "name": WeatherParameter.AIR_TEMPERATURE.value,
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
            },
            WeatherParameter.RELATIVE_HUMIDITY.name: {
                "forecast": {
                    "name": WeatherParameter.RELATIVE_HUMIDITY.value + " forecast",
                    "data": {},
                    "yAxis": 1,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
                "current": {
                    "name": WeatherParameter.RELATIVE_HUMIDITY.value,
                    "data": {},
                    "yAxis": 1,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
            },
        },
        "Solar radiation": {
            WeatherParameter.SURFACE_SOLAR_RADIATION.name: {
                "forecast": {
                    "name": WeatherParameter.SURFACE_SOLAR_RADIATION.value
                    + " forecast",
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
                "current": {
                    "name": WeatherParameter.SURFACE_SOLAR_RADIATION.value,
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
            },
            WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.name: {
                "forecast": {
                    "name": WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value
                    + " forecast",
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
                "current": {
                    "name": WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION.value,
                    "data": {},
                    "yAxis": 0,
                    "timeseries": {
                        "id": "",
                        "name": "",
                        "desc": "",
                        "unit": "",
                    },
                },
            },
        },
        # Add other graphs here
    }

    resp = flask.g.api_client.weather_ts_by_sites.getall(
        dt_start=dt_start, dt_end=dt_end, site_id=site_id
    )

    liste_ts_id = []
    liste_forecast_ts_id = []
    tsIDs_by_weather_param_dict = {}

    for data in resp.data:
        for key in respData.keys():
            if data["parameter"] in respData[key].keys():
                weather_type = "forecast" if data["forecast"] else "current"
                respData[key][data["parameter"]][weather_type]["timeseries"] = data[
                    "timeseries"
                ]
                respData[key][data["parameter"]][weather_type]["timeseries"][
                    "id"
                ] = data["timeseries_id"]
                if weather_type == "forecast":
                    liste_forecast_ts_id.append(data["timeseries_id"])
                else:
                    liste_ts_id.append(data["timeseries_id"])
                tsIDs_by_weather_param_dict[data["timeseries_id"]] = {}
                tsIDs_by_weather_param_dict[data["timeseries_id"]]["chart"] = key
                tsIDs_by_weather_param_dict[data["timeseries_id"]]["name"] = data[
                    "parameter"
                ]

    ts_data_state = flask.g.api_client.timeseries_datastates.getall()

    for data in ts_data_state.data:
        if data["name"] == "Clean":
            ts_data_state_id = data["id"]

    if len(liste_ts_id) > 0:
        weather_data = flask.g.api_client.timeseries_data.download_aggregate(
            start_time=dt_start.isoformat(),
            end_time=dt_end.isoformat(),
            data_state=ts_data_state_id,
            timeseries_ids=[data for data in liste_ts_id if data is not None],
            bucket_width_unit=bucket_width_unit,
            bucket_width_value=bucket_width_value,
            # convert_to = ["degC", "percent"] for Outdoor conditions
        )
    else:
        weather_data = None

    if forecast == "true" and len(liste_forecast_ts_id) > 0:
        weather_forecast_data = flask.g.api_client.timeseries_data.download_aggregate(
            start_time=dt_start.isoformat(),
            end_time=dt_end_forecast.isoformat(),
            data_state=ts_data_state_id,
            timeseries_ids=[data for data in liste_forecast_ts_id if data is not None],
            bucket_width_unit=bucket_width_unit,
            bucket_width_value=bucket_width_value,
            # convert_to = ["degC", "percent"] for Outdoor conditions
        )
    else:
        weather_forecast_data = None

    if weather_data is not None:
        for key, value in weather_data.data.items():
            weather_params = tsIDs_by_weather_param_dict[int(key)]
            respData[weather_params["chart"]][weather_params["name"]]["current"][
                "data"
            ] = value

    if weather_forecast_data is not None and forecast == "true":
        for key, value in weather_forecast_data.data.items():
            weather_params = tsIDs_by_weather_param_dict[int(key)]
            respData[weather_params["chart"]][weather_params["name"]]["forecast"][
                "data"
            ] = value

    return flask.jsonify(respData)

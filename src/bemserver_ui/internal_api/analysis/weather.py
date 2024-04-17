"""Analysis weather data internal API"""

import datetime as dt
import zoneinfo

import flask

from bemserver_api_client.enums import (
    BucketWidthUnit,
    WeatherParameter,
)

from bemserver_ui.common import time
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
    forecast_nbdays = int(flask.request.args.get("forecast", 0))

    bucket_width_value = 1
    bucket_width_unit = BucketWidthUnit.hour
    tz = zoneinfo.ZoneInfo(tz_name)
    if period_type == "Day-Minute":
        bucket_width_value = 10
        bucket_width_unit = BucketWidthUnit.minute
        dt_start = dt.datetime(period_year, period_month, period_day, tzinfo=tz)
        dt_end = dt_start + dt.timedelta(days=1)
    elif period_type == "Week-Hourly":
        dt_start = dt.datetime(period_year, period_month, period_day, tzinfo=tz)
        dt_end = dt_start + dt.timedelta(days=7)
    elif period_type == "Month-Hourly":
        dt_start = dt.datetime(period_year, period_month, 1, tzinfo=tz)
        dt_end = time.add_time(dt_start, months=1)
    elif period_type == "Year-Daily":
        bucket_width_unit = BucketWidthUnit.day
        dt_start = dt.datetime(period_year, 1, 1, tzinfo=tz)
        dt_end = time.add_time(dt_start, years=1)
    elif period_type == "Last-Day":
        bucket_width_value = 10
        bucket_width_unit = BucketWidthUnit.minute
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=1)
    elif period_type == "Last-Week":
        dt_end = dt.datetime.now(tz)
        dt_start = dt_end - dt.timedelta(days=7)
    elif period_type == "Last-Month":
        dt_end = dt.datetime.now(tz)
        dt_start = time.add_time(dt_end, months=-1)
    elif period_type == "Last-Year":
        bucket_width_unit = BucketWidthUnit.day
        dt_end = dt.datetime.now(tz)
        dt_start = time.add_time(dt_end, years=-1)

    dt_end_forecast = dt_end + dt.timedelta(days=forecast_nbdays)

    def _prepare_weather_parameter_series(weather_parameter, yaxis_index=0):
        def _prepare_series(series_name):
            return {
                "name": series_name,
                "data": {},
                "yAxis": yaxis_index,
                "timeseries": {
                    "id": None,
                },
            }

        return {
            weather_parameter.name: {
                "current": _prepare_series(weather_parameter.value),
                "forecast": _prepare_series(f"{weather_parameter.value} forecast"),
            },
        }

    # Define weather data analysis charts.
    weather_analysis_data = {
        "Outdoor conditions": {
            **_prepare_weather_parameter_series(WeatherParameter.AIR_TEMPERATURE),
            **_prepare_weather_parameter_series(WeatherParameter.RELATIVE_HUMIDITY, 1),
        },
        "Solar radiation": {
            **_prepare_weather_parameter_series(
                WeatherParameter.SURFACE_SOLAR_RADIATION,
            ),
            **_prepare_weather_parameter_series(
                WeatherParameter.DIRECT_NORMAL_SOLAR_RADIATION,
            ),
        },
        # If needed, add other weather data analysis here.
    }

    # Get timeseries IDs for weather parameters in analysis.
    ts_ids_by_weather_type = {
        "current": [],
        "forecast": [],
    }
    weather_params_by_ts_id = {
        "current": {},
        "forecast": {},
    }
    site_weather_params_resp = flask.g.api_client.weather_ts_by_sites.getall(
        site_id=site_id
    )
    for site_wp in site_weather_params_resp.data:
        site_wp_name = site_wp["parameter"]
        ts_id = site_wp["timeseries_id"]
        site_wp["timeseries"]["id"] = ts_id
        for chart_name in weather_analysis_data.keys():
            if site_wp_name in weather_analysis_data[chart_name].keys():
                weather_type = "forecast" if site_wp["forecast"] else "current"
                weather_analysis_data[chart_name][site_wp_name][weather_type][
                    "timeseries"
                ] = site_wp["timeseries"]
                if ts_id not in ts_ids_by_weather_type[weather_type]:
                    ts_ids_by_weather_type[weather_type].append(ts_id)
                if ts_id not in weather_params_by_ts_id[weather_type]:
                    weather_params_by_ts_id[weather_type][ts_id] = []
                weather_params_by_ts_id[weather_type][ts_id].append(
                    {
                        "chart": chart_name,
                        "name": site_wp_name,
                    }
                )

    # Get "Clean" timeseries data state ID.
    clean_ts_data_state_id = None
    ts_data_state_resp = flask.g.api_client.timeseries_datastates.getall()
    for ts_data_state in ts_data_state_resp.data:
        if ts_data_state["name"] == "Clean":
            clean_ts_data_state_id = ts_data_state["id"]
            break
    if clean_ts_data_state_id is None:
        # TODO: maybe better raise an exception
        return flask.jsonify(weather_analysis_data)

    dt_end_by_weather_type = {
        "current": dt_end,
        "forecast": dt_end_forecast,
    }
    for weather_type, ts_ids in ts_ids_by_weather_type.items():
        # Is there some timeseries IDs to get?
        not_none_ts_ids = [x for x in ts_ids if x is not None]
        if len(not_none_ts_ids) <= 0:
            continue
        # Is forecast weather requested?
        if weather_type == "forecast" and forecast_nbdays <= 0:
            continue
        # Get timeseries data.
        ts_data_resp = flask.g.api_client.timeseries_data.download_aggregate(
            start_time=dt_start.isoformat(),
            end_time=dt_end_by_weather_type[weather_type].isoformat(),
            data_state=clean_ts_data_state_id,
            timeseries_ids=not_none_ts_ids,
            bucket_width_unit=bucket_width_unit,
            bucket_width_value=bucket_width_value,
            # TODO: force convert_to?
            # convert_to = ["degC", "percent"] for Outdoor conditions
            # convert_to = ["W/m²"] for Solar radiation
        )
        # Fill chart analysis with timeseries data.
        for ts_id, ts_data in ts_data_resp.data.items():
            for wp in weather_params_by_ts_id[weather_type][int(ts_id)]:
                weather_analysis_data[wp["chart"]][wp["name"]][weather_type]["data"] = (
                    ts_data
                )

    return flask.jsonify(weather_analysis_data)

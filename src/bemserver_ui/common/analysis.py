"""Analysis helpers."""

import datetime as dt

from bemserver_api_client.enums import BucketWidthUnit

from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    add_time,
    convert_html_form_datetime,
    get_period_from_isoweek,
)


def get_default_aggregation_type():
    return {
        "id": "avg",
        "name": "Average",
    }


def get_aggregation_types():
    return [
        {
            "id": "none",
            "name": "No aggregation",
        },
        get_default_aggregation_type(),
        {
            "id": "sum",
            "name": "Sum",
        },
        {
            "id": "min",
            "name": "Minimum",
        },
        {
            "id": "max",
            "name": "Maximum",
        },
        {
            "id": "count",
            "name": "Count",
        },
    ]


def get_explore_period_types():
    return [
        {
            "id": "last-24-hours",
            "name": "Last 24 hours",
        },
        {
            "id": "last-7-days",
            "name": "Last 7 days",
        },
        {
            "id": "last-30-days",
            "name": "Last 30 days",
        },
        {
            "id": "last-12-months",
            "name": "Last 12 months",
        },
        {
            "id": "custom",
            "name": "Custom",
        },
    ]


def get_explore_period_type(period_type_id):
    for period_type in get_explore_period_types():
        if period_type["id"] == period_type_id:
            return period_type
    return None


def compute_explore_period_bounds(
    period_type,
    end_date,
    end_time="00:00",
    start_date=None,
    start_time=None,
    *,
    tz=dt.timezone.utc,
):
    if not isinstance(period_type, dict) or "id" not in period_type:
        return (None, None)

    if end_date is None:
        dt_end = dt.datetime.now(tz=tz)
    else:
        try:
            dt_end = convert_html_form_datetime(end_date, end_time, tz=tz)
        except BEMServerUICommonInvalidDatetimeError as exc:
            raise BEMServerUICommonInvalidDatetimeError(
                "Invalid end datetime!"
            ) from exc

    if period_type["id"] == "custom":
        try:
            dt_start = convert_html_form_datetime(start_date, start_time, tz=tz)
        except BEMServerUICommonInvalidDatetimeError as exc:
            raise BEMServerUICommonInvalidDatetimeError(
                "Invalid start datetime!"
            ) from exc
        return (dt_start, dt_end)
    elif period_type["id"] == "last-24-hours":
        return (dt_end - dt.timedelta(hours=24), dt_end)
    elif period_type["id"] == "last-7-days":
        return (dt_end - dt.timedelta(days=7), dt_end)
    elif period_type["id"] == "last-30-days":
        return (dt_end - dt.timedelta(days=30), dt_end)
    elif period_type["id"] == "last-12-months":
        return (add_time(dt_end, years=-1), dt_end)
    return (None, None)


def get_completeness_period_types():
    return [
        {
            "id": "Year-Monthly",
            "name": "Monthly over 1 year",
            "bucket_width_unit": BucketWidthUnit.month,
            "bucket_width_value": 1,
        },
        {
            "id": "Year-Daily",
            "name": "Daily over 1 year",
            "bucket_width_unit": BucketWidthUnit.day,
            "bucket_width_value": 1,
        },
        {
            "id": "Month-Daily",
            "name": "Daily over 1 month",
            "bucket_width_unit": BucketWidthUnit.day,
            "bucket_width_value": 1,
        },
        {
            "id": "Week-Daily",
            "name": "Daily over 1 week",
            "bucket_width_unit": BucketWidthUnit.day,
            "bucket_width_value": 1,
        },
        {
            "id": "Week-Hourly",
            "name": "Hourly over 1 week",
            "bucket_width_unit": BucketWidthUnit.hour,
            "bucket_width_value": 1,
        },
        {
            "id": "Day-Hourly",
            "name": "Hourly over 1 day",
            "bucket_width_unit": BucketWidthUnit.hour,
            "bucket_width_value": 1,
        },
    ]


def get_completeness_period_type(period_type_id):
    for period_type in get_completeness_period_types():
        if period_type["id"] == period_type_id:
            return period_type
    return None


def compute_completeness_period_bounds(
    period_type, year=None, month=None, week=None, day=None, *, tz=dt.timezone.utc
):
    if "id" not in period_type:
        return (
            None,
            None,
        )
    if period_type["id"].startswith("Year-"):
        return _compute_year_period_bounds(year, tz)
    elif period_type["id"].startswith("Month-"):
        return _compute_month_period_bounds(year, month, tz)
    elif period_type["id"].startswith("Week-"):
        return _compute_week_period_bounds(week, tz)
    elif period_type["id"].startswith("Day-"):
        return _compute_day_period_bounds(day, tz)
    return (
        None,
        None,
    )


def _compute_year_period_bounds(year, tz=dt.timezone.utc):
    return (
        dt.datetime(year, 1, 1, tzinfo=tz),
        dt.datetime(year + 1, 1, 1, tzinfo=tz),
    )


def _compute_month_period_bounds(year, month, tz=dt.timezone.utc):
    dt_start = dt.datetime(year, month, 1, tzinfo=tz)
    end_year = year + (month // 12)
    end_month = (month % 12) + 1
    dt_end = dt.datetime(end_year, end_month, 1, tzinfo=tz)
    return (
        dt_start,
        dt_end,
    )


def _compute_week_period_bounds(week, tz=dt.timezone.utc):
    dt_start, dt_end = get_period_from_isoweek(week, tz=tz)
    dt_end += dt.timedelta(days=1.0)
    return (
        dt_start,
        dt_end,
    )


def _compute_day_period_bounds(day, tz=dt.timezone.utc):
    dt_start = convert_html_form_datetime(day, "00:00", tz=tz)
    dt_end = dt_start + dt.timedelta(days=1.0)
    return (
        dt_start,
        dt_end,
    )

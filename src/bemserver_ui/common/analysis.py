"""Analysis helpers."""

import datetime as dt

from bemserver_api_client.enums import BucketWidthUnit

from bemserver_ui.common.time import convert_html_form_datetime, get_period_from_isoweek


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

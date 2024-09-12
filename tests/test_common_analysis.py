"""Common analysis helpers tests"""

import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from bemserver_api_client.enums import BucketWidthUnit

from bemserver_ui.common.analysis import (
    _compute_month_period_bounds,
    compute_completeness_period_bounds,
    compute_explore_period_bounds,
    get_aggregation_types,
    get_completeness_period_type,
    get_completeness_period_types,
    get_default_aggregation_type,
    get_explore_period_type,
    get_explore_period_types,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import add_time


class TestCommonAnalysis:
    def test_get_completeness_period_types(self):
        period_types = get_completeness_period_types()

        assert len(period_types) > 0

        for period_type in period_types:
            assert "id" in period_type
            assert "name" in period_type
            assert "bucket_width_unit" in period_type
            assert isinstance(period_type["bucket_width_unit"], BucketWidthUnit)

            if period_type["id"].endswith("-Monthly"):
                assert period_type["bucket_width_unit"] == BucketWidthUnit.month
            elif period_type["id"].endswith("-Daily"):
                assert period_type["bucket_width_unit"] == BucketWidthUnit.day
            elif period_type["id"].endswith("-Hourly"):
                assert period_type["bucket_width_unit"] == BucketWidthUnit.hour

    def test_get_completeness_period_type(self):
        period_type = get_completeness_period_type("Week-Daily")
        assert period_type is not None

        period_type = get_completeness_period_type("Year-Weekly")
        assert period_type is None

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_compute_completeness_period_bounds(self, tz):
        period_type = get_completeness_period_type("Year-Monthly")
        dt_start, dt_end = compute_completeness_period_bounds(period_type, 2024, tz=tz)
        assert dt_start == dt.datetime(2024, 1, 1, tzinfo=tz)
        assert dt_end == dt.datetime(2025, 1, 1, tzinfo=tz)

        period_type = get_completeness_period_type("Month-Daily")
        dt_start, dt_end = compute_completeness_period_bounds(
            period_type, 2024, 2, tz=tz
        )
        assert dt_start == dt.datetime(2024, 2, 1, tzinfo=tz)
        assert dt_end == dt.datetime(2024, 3, 1, tzinfo=tz)

        period_type = get_completeness_period_type("Week-Daily")
        dt_start, dt_end = compute_completeness_period_bounds(
            period_type, week="2024-W01", tz=tz
        )
        assert dt_start == dt.datetime(2024, 1, 1, tzinfo=tz)
        assert dt_end == dt.datetime(2024, 1, 8, tzinfo=tz)

        period_type = get_completeness_period_type("Day-Hourly")
        dt_start, dt_end = compute_completeness_period_bounds(
            period_type, day="2024-08-01", tz=tz
        )
        assert dt_start == dt.datetime(2024, 8, 1, tzinfo=tz)
        assert dt_end == dt.datetime(2024, 8, 2, tzinfo=tz)

        period_type = {"id": "bad"}
        dt_start, dt_end = compute_completeness_period_bounds(period_type, 2024, tz=tz)
        assert dt_start is None
        assert dt_end is None

        dt_start, dt_end = compute_completeness_period_bounds("bad", 2024, tz=tz)
        assert dt_start is None
        assert dt_end is None

        period_type = get_completeness_period_type("Week-Daily")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            compute_completeness_period_bounds(period_type, week="bad", tz=tz)

        period_type = get_completeness_period_type("Day-Hourly")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            compute_completeness_period_bounds(period_type, day="bad", tz=tz)

    def test_compute_month_period_bounds(self):
        dt_start, dt_end = _compute_month_period_bounds(2024, 12)
        assert dt_start == dt.datetime(2024, 12, 1, tzinfo=dt.timezone.utc)
        assert dt_end == dt.datetime(2025, 1, 1, tzinfo=dt.timezone.utc)

    def test_get_default_aggregation_type(self):
        agg_type = get_default_aggregation_type()

        assert "id" in agg_type
        assert "name" in agg_type

        assert agg_type["id"] == "avg"

    def test_get_aggregation_types(self):
        agg_types = get_aggregation_types()

        assert len(agg_types) > 0

        for agg_type in agg_types:
            assert "id" in agg_type
            assert "name" in agg_type

        assert get_default_aggregation_type() in agg_types

    def test_explore_period_types(self):
        period_types = get_explore_period_types()

        assert len(period_types) > 0

        for period_type in period_types:
            assert "id" in period_type
            assert "name" in period_type

    def test_get_explore_period_type(self):
        period_type = get_explore_period_type("custom")
        assert period_type is not None

        period_type = get_explore_period_type("unknown")
        assert period_type is None

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_compute_explore_period_bounds(self, tz):
        dt_now = dt.datetime.now(tz=tz)
        dt_now = dt.datetime(
            dt_now.year, dt_now.month, dt_now.day, dt_now.hour, dt_now.minute, tzinfo=tz
        )
        end_date = str(dt_now.date())
        end_time = dt_now.strftime("%H:%M")
        period_type = get_explore_period_type("last-24-hours")
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, tz=tz
        )
        assert dt_start == dt_now - dt.timedelta(hours=24.0)
        assert dt_end == dt_now

        period_type = get_explore_period_type("last-24-hours")
        dt_start, dt_end = compute_explore_period_bounds(period_type, None, tz=tz)
        assert dt_start.date() == (dt_now - dt.timedelta(hours=24.0)).date()
        assert dt_end.date() == dt_now.date()

        period_type = get_explore_period_type("last-7-days")
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, tz=tz
        )
        assert dt_start == dt_now - dt.timedelta(days=7.0)
        assert dt_end == dt_now

        period_type = get_explore_period_type("last-30-days")
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, tz=tz
        )
        assert dt_start == dt_now - dt.timedelta(days=30.0)
        assert dt_end == dt_now

        period_type = get_explore_period_type("last-12-months")
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, tz=tz
        )
        assert dt_start == add_time(dt_now, years=-1)
        assert dt_end == dt_now

        period_type = get_explore_period_type("custom")
        expected_dt_start = dt.datetime(2024, 7, 31, tzinfo=tz)
        start_date = str(expected_dt_start.date())
        start_time = expected_dt_start.strftime("%H:%M")
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, start_date, start_time, tz=tz
        )
        assert dt_start == expected_dt_start
        assert dt_end == dt_now

    def test_compute_explore_period_bounds_not_supported_period_types(self):
        tz = dt.timezone.utc
        dt_now = dt.datetime.now(tz=tz)
        dt_now = dt.datetime(
            dt_now.year, dt_now.month, dt_now.day, dt_now.hour, dt_now.minute, tzinfo=tz
        )
        end_date = str(dt_now.date())
        end_time = dt_now.strftime("%H:%M")

        period_type = {"id": "unknown"}
        dt_start, dt_end = compute_explore_period_bounds(
            period_type, end_date, end_time, tz=tz
        )
        assert dt_start is None
        assert dt_end is None

        dt_start, dt_end = compute_explore_period_bounds(
            "bad", end_date, end_time, tz=tz
        )
        assert dt_start is None
        assert dt_end is None

    def test_compute_explore_period_bounds_invalid_datetimes(self):
        for period_type in get_explore_period_types():
            with pytest.raises(
                BEMServerUICommonInvalidDatetimeError, match="Invalid end datetime!"
            ):
                compute_explore_period_bounds(period_type, end_date="bad")

        period_type = get_explore_period_type("custom")
        with pytest.raises(
            BEMServerUICommonInvalidDatetimeError, match="Invalid start datetime!"
        ):
            compute_explore_period_bounds(
                period_type, end_date="2024-07-31", start_date="bad", start_time="00:00"
            )
        with pytest.raises(
            BEMServerUICommonInvalidDatetimeError, match="Invalid start datetime!"
        ):
            compute_explore_period_bounds(
                period_type,
                end_date="2024-07-31",
                start_date="2024-07-30",
                start_time="bad",
            )

"""Common analysis helpers tests"""

import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from bemserver_api_client.enums import BucketWidthUnit

from bemserver_ui.common.analysis import (
    _compute_month_period_bounds,
    compute_completeness_period_bounds,
    get_completeness_period_type,
    get_completeness_period_types,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


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

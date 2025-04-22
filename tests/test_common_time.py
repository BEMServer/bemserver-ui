"""Common time tests"""

import calendar
import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    _get_date_from_isoweek,
    add_time,
    convert_from_iso,
    convert_html_form_datetime,
    convert_html_form_time,
    get_default_night,
    get_isoweek_from_date,
    get_month_weeks,
    get_night_periods,
    get_period_from_isoweek,
    get_weekend_periods,
    get_weeks,
    get_year_weeks,
    strfdelta,
)


class TestCommonTime:
    def test_convert_html_form_datetime(self):
        assert convert_html_form_datetime("2023-03-22", "10:07") == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=dt.timezone.utc)
        )
        tz = ZoneInfo("Europe/Paris")
        assert convert_html_form_datetime("2023-03-22", "10:07", tz=tz) == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=tz)
        )
        assert convert_html_form_datetime("2023-04-22", "10:07", tz=tz) == (
            dt.datetime(2023, 4, 22, 10, 7, tzinfo=tz)
        )
        tz = ZoneInfo("Etc/GMT+1")
        assert convert_html_form_datetime("2023-03-22", "10:07", tz=tz) == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=tz)
        )
        assert convert_html_form_datetime("2023-04-22", "10:07", tz=tz) == (
            dt.datetime(2023, 4, 22, 10, 7, tzinfo=tz)
        )
        assert convert_html_form_datetime("2023-03-22", "10:07", tz=None) == (
            dt.datetime(2023, 3, 22, 10, 7)
        )

        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_datetime("2023-03-dd", "10:07")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_datetime("2023-03-22", "HH:07")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_datetime("2023-03-dd", "HH:07")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_datetime("2023-03-22", "10:07", tz="bad_tz")

    def test_convert_html_form_time(self):
        assert convert_html_form_time("10:07") == dt.time(hour=10, minute=7)

        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_time("66:07")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_time(None)
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_time(42)
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_html_form_time("HH:07")

    def test_convert_from_iso(self):
        assert convert_from_iso("2023-03-22T10:07:00+00:00") == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=dt.timezone.utc)
        )
        assert convert_from_iso("2023-03-22T10:07:00+01:00") == (
            dt.datetime(2023, 3, 22, 9, 7, tzinfo=dt.timezone.utc)
        )
        assert convert_from_iso("2023-03-22T10:07:00+00:00", tz=None) == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=dt.timezone.utc)
        )
        assert convert_from_iso("2023-03-22T10:07:00+01:00", tz=None) == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=dt.timezone(dt.timedelta(hours=1.0)))
        )
        tz = ZoneInfo("Europe/Paris")
        assert convert_from_iso("2023-03-22T10:07:00+00:00", tz=tz) == (
            dt.datetime(2023, 3, 22, 11, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-03-22T10:07:00+01:00", tz=tz) == (
            dt.datetime(2023, 3, 22, 10, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-04-22T10:07:00+00:00", tz=tz) == (
            dt.datetime(2023, 4, 22, 12, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-04-22T10:07:00+01:00", tz=tz) == (
            dt.datetime(2023, 4, 22, 11, 7, tzinfo=tz)
        )
        tz = ZoneInfo("Etc/GMT+1")
        assert convert_from_iso("2023-03-22T10:07:00+00:00", tz=tz) == (
            dt.datetime(2023, 3, 22, 9, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-03-22T10:07:00+01:00", tz=tz) == (
            dt.datetime(2023, 3, 22, 8, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-04-22T10:07:00+00:00", tz=tz) == (
            dt.datetime(2023, 4, 22, 9, 7, tzinfo=tz)
        )
        assert convert_from_iso("2023-04-22T10:07:00+01:00", tz=tz) == (
            dt.datetime(2023, 4, 22, 8, 7, tzinfo=tz)
        )

        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_from_iso("2023-03-ddT10:07:00+00:00")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_from_iso("2023-03-22THH:07:00+00:00")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_from_iso("2023-03-ddTHH:07:00+00:00")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_from_iso("2023-03-22T10:07:00+bad_tz")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            convert_from_iso("2023-03-22T10:07:00+00:00", tz="bad_tz")

    def test_strfdelta(self):
        tdelta = dt.timedelta(days=2, hours=3, minutes=5, seconds=8, microseconds=340)
        assert strfdelta(tdelta) == "02d 03h 05m 08s"
        assert strfdelta(tdelta, "{D}d {H}:{M:02}:{S:02}") == "2d 3:05:08"
        assert strfdelta(tdelta, "{D:2}d {H:2}:{M:02}:{S:02}") == " 2d  3:05:08"
        assert strfdelta(tdelta, "{H}h {S}s") == "51h 308s"
        assert strfdelta(12304, inputtype="s") == "00d 03h 25m 04s"
        assert strfdelta(620, "{H}:{M:02}", "m") == "10:20"
        assert strfdelta(49, "{D}d {H}h", "h") == "2d 1h"
        assert strfdelta(2, "{D}d {H}h", "d") == "2d 0h"
        assert strfdelta(3, "{W}w {D}d {H}h", "w") == "3w 0d 0h"
        assert strfdelta(3, "{D}d {H}h", "w") == "21d 0h"

    def test_add_time(self):
        tz = ZoneInfo("Europe/Paris")

        # No particular date, in the middle of a year.
        dt_ref = dt.datetime(2023, 6, 2, 18, 11, 42, tzinfo=tz)
        # Add/subtract years.
        assert add_time(dt_ref, years=1) == (
            dt.datetime(2024, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=7) == (
            dt.datetime(2030, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-1) == (
            dt.datetime(2022, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-7) == (
            dt.datetime(2016, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        # Add/subtract months.
        assert add_time(dt_ref, months=1) == (
            dt.datetime(2023, 7, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=12) == (
            dt.datetime(2024, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=14) == (
            dt.datetime(2024, 8, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=84) == (
            dt.datetime(2030, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-1) == (
            dt.datetime(2023, 5, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-12) == (
            dt.datetime(2022, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-14) == (
            dt.datetime(2022, 4, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-84) == (
            dt.datetime(2016, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        # Add/subtract years and months.
        assert add_time(dt_ref, years=1, months=2) == (
            dt.datetime(2024, 8, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=-2) == (
            dt.datetime(2024, 4, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=-12) == (
            dt.datetime(2023, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-1, months=-12) == (
            dt.datetime(2021, 6, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=-14) == (
            dt.datetime(2023, 4, 2, 18, 11, 42, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-1, months=14) == (
            dt.datetime(2023, 8, 2, 18, 11, 42, tzinfo=tz)
        )

        # Use last month of a year as reference.
        dt_ref = dt.datetime(2023, 12, 20, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (dt.datetime(2024, 1, 20, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=14) == (
            dt.datetime(2025, 2, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=2) == (
            dt.datetime(2025, 2, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-12) == (
            dt.datetime(2022, 12, 20, 9, 7, tzinfo=tz)
        )

        # Use first month of a year as reference.
        dt_ref = dt.datetime(2023, 1, 20, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (dt.datetime(2023, 2, 20, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=14) == (
            dt.datetime(2024, 3, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=2) == (
            dt.datetime(2024, 3, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-4) == (
            dt.datetime(2022, 9, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-12) == (
            dt.datetime(2022, 1, 20, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-14) == (
            dt.datetime(2021, 11, 20, 9, 7, tzinfo=tz)
        )

        # Use last day of october (31 days) as reference.
        dt_ref = dt.datetime(2023, 10, 31, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (
            dt.datetime(2023, 11, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=4) == (dt.datetime(2024, 2, 29, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=16) == (
            dt.datetime(2025, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=4) == (
            dt.datetime(2025, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-1) == (
            dt.datetime(2023, 9, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-4) == (
            dt.datetime(2023, 6, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-8) == (
            dt.datetime(2023, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-16) == (
            dt.datetime(2022, 6, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-1, months=-4) == (
            dt.datetime(2022, 6, 30, 9, 7, tzinfo=tz)
        )

        # Use last day of september (30 days) as reference.
        dt_ref = dt.datetime(2023, 9, 30, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (
            dt.datetime(2023, 10, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=4) == (dt.datetime(2024, 1, 31, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=5) == (dt.datetime(2024, 2, 29, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=17) == (
            dt.datetime(2025, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=5) == (
            dt.datetime(2025, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-1) == (
            dt.datetime(2023, 8, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-4) == (
            dt.datetime(2023, 5, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-7) == (
            dt.datetime(2023, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-16) == (
            dt.datetime(2022, 5, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-1, months=-4) == (
            dt.datetime(2022, 5, 31, 9, 7, tzinfo=tz)
        )

        # Use last day of february (28 days) as reference.
        dt_ref = dt.datetime(2023, 2, 28, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (dt.datetime(2023, 3, 31, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=2) == (dt.datetime(2023, 4, 30, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=12) == (
            dt.datetime(2024, 2, 29, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=1) == (
            dt.datetime(2024, 3, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=-1) == (
            dt.datetime(2024, 1, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-1) == (
            dt.datetime(2023, 1, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-2) == (
            dt.datetime(2022, 12, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-4) == (
            dt.datetime(2022, 10, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-8) == (
            dt.datetime(2022, 6, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-12) == (
            dt.datetime(2022, 2, 28, 9, 7, tzinfo=tz)
        )

        # Use last day of leap year's february (29 days) as reference.
        dt_ref = dt.datetime(2020, 2, 29, 9, 7, tzinfo=tz)
        assert add_time(dt_ref, months=1) == (dt.datetime(2020, 3, 31, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=2) == (dt.datetime(2020, 4, 30, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, months=12) == (
            dt.datetime(2021, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=4) == (dt.datetime(2024, 2, 29, 9, 7, tzinfo=tz))
        assert add_time(dt_ref, years=1, months=1) == (
            dt.datetime(2021, 3, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=1, months=-1) == (
            dt.datetime(2021, 1, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-1) == (
            dt.datetime(2020, 1, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-2) == (
            dt.datetime(2019, 12, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-4) == (
            dt.datetime(2019, 10, 31, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-8) == (
            dt.datetime(2019, 6, 30, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, months=-12) == (
            dt.datetime(2019, 2, 28, 9, 7, tzinfo=tz)
        )
        assert add_time(dt_ref, years=-4) == (dt.datetime(2016, 2, 29, 9, 7, tzinfo=tz))

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    @pytest.mark.parametrize("complete_weeks", [False, True])
    def test_get_weeks(self, tz, complete_weeks):
        dt_start = dt.datetime(2023, 12, 21, tzinfo=tz)
        dt_end = dt.datetime(2024, 2, 3, tzinfo=tz)
        weeks = get_weeks(dt_start, dt_end, complete_weeks=complete_weeks)

        first_isoweek = dt.datetime.strftime(dt_start, "%G-W%V")
        assert first_isoweek in weeks
        if complete_weeks:
            assert weeks[first_isoweek]["start"] <= dt_start
        else:
            assert weeks[first_isoweek]["start"] == dt_start

        last_isoweek = dt.datetime.strftime(dt_end, "%G-W%V")
        assert last_isoweek in weeks
        if complete_weeks:
            assert weeks[last_isoweek]["end"] >= dt_end
        else:
            assert weeks[last_isoweek]["end"] == dt_end

        for isoweek, week_info in weeks.items():
            dt_start_isocal = week_info["start"].isocalendar()
            assert isoweek == f"{dt_start_isocal.year}-W{dt_start_isocal.week:02d}"
            assert week_info["week_num"] == dt_start_isocal.week
            assert week_info["start"] in week_info["dates"]
            assert week_info["end"] in week_info["dates"]
            assert week_info["start"] <= week_info["end"]
            if complete_weeks:
                assert len(week_info["dates"]) == 7
            else:
                assert 1 <= len(week_info["dates"]) <= 7

    @pytest.mark.parametrize("year", [2020, 2021, 2022, 2023, 2024])
    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    @pytest.mark.parametrize("complete_weeks", [False, True])
    def test_get_year_weeks(self, year, tz, complete_weeks):
        weeks = get_year_weeks(year, complete_weeks=complete_weeks, tz=tz)
        for isoweek, week_info in weeks.items():
            dt_start_isocal = week_info["start"].isocalendar()
            assert isoweek == f"{dt_start_isocal.year}-W{dt_start_isocal.week:02d}"
            assert week_info["week_num"] == dt_start_isocal.week
            assert week_info["start"] in week_info["dates"]
            assert week_info["end"] in week_info["dates"]
            assert week_info["start"] <= week_info["end"]
            if complete_weeks:
                assert len(week_info["dates"]) == 7
            else:
                assert 1 <= len(week_info["dates"]) <= 7

    @pytest.mark.parametrize("tz", [dt.timezone.utc, ZoneInfo("Europe/Paris")])
    @pytest.mark.parametrize("complete_weeks", [False, True])
    def test_get_month_weeks(self, tz, complete_weeks):
        year = 2024
        month = 2
        weeks = get_month_weeks(year, month, complete_weeks=complete_weeks, tz=tz)

        dt_start = dt.datetime(year, month, 1, tzinfo=tz)
        dt_start_isocal = dt_start.isocalendar()
        dt_end = dt.datetime(
            year, month, calendar.monthrange(year, month)[1], tzinfo=tz
        )

        first_isoweek = dt.datetime.strftime(dt_start, "%G-W%V")
        assert first_isoweek in weeks
        if complete_weeks:
            assert weeks[first_isoweek]["start"] <= dt_start
        else:
            assert weeks[first_isoweek]["start"] == dt_start

        last_isoweek = dt.datetime.strftime(dt_end, "%G-W%V")
        assert last_isoweek in weeks
        if complete_weeks:
            assert weeks[last_isoweek]["end"] >= dt_end
        else:
            assert weeks[last_isoweek]["end"] == dt_end

        for isoweek, week_info in weeks.items():
            dt_start_isocal = week_info["start"].isocalendar()
            assert isoweek == f"{dt_start_isocal.year}-W{dt_start_isocal.week:02d}"
            assert week_info["week_num"] == dt_start_isocal.week
            assert week_info["start"] in week_info["dates"]
            assert week_info["end"] in week_info["dates"]
            assert week_info["start"] <= week_info["end"]
            if complete_weeks:
                assert len(week_info["dates"]) == 7
            else:
                assert 1 <= len(week_info["dates"]) <= 7

        assert len(weeks) == 5

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_get_date_from_isoweek(self, tz):
        ret = _get_date_from_isoweek("2024-W01-1", tz=tz)
        assert ret == dt.datetime(2024, 1, 1, tzinfo=tz)

    def test_get_date_from_isoweek_errors(self):
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            _get_date_from_isoweek("whatever")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            _get_date_from_isoweek("2024-W01-666")
        with pytest.raises(BEMServerUICommonInvalidDatetimeError):
            _get_date_from_isoweek("2024-W01-1", tz="bad_tz")

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_get_period_from_isoweek(self, tz):
        dt_start, dt_end = get_period_from_isoweek("2024-W01", tz=tz)
        assert dt_start == dt.datetime(2024, 1, 1, tzinfo=tz)
        assert dt_end == dt.datetime(2024, 1, 7, tzinfo=tz)

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_get_isoweek_from_date(self, tz):
        dt_ref = dt.datetime(2024, 7, 24, tzinfo=tz)
        dt_ref_isocal = dt_ref.isocalendar()

        isoweek = get_isoweek_from_date(dt_ref)
        assert isoweek == f"{dt_ref_isocal.year}-W{dt_ref_isocal.week}"

        isoweek = get_isoweek_from_date(dt_ref, include_daynum=True)
        assert (
            isoweek
            == f"{dt_ref_isocal.year}-W{dt_ref_isocal.week}-{dt_ref.weekday() + 1}"
        )

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_get_weekend_periods(self, tz):
        # Start/end datetimes are not in weekends.
        dt_start = dt.datetime(2025, 1, 1, 23, 30, tzinfo=tz)
        dt_end = dt.datetime(2025, 3, 1, tzinfo=tz)
        weekend_periods = get_weekend_periods(dt_start, dt_end)

        assert len(weekend_periods) == 9
        for weekend in weekend_periods:
            assert len(weekend) == 2

        expected_first_weekend = [
            dt.datetime(2025, 1, 4, 0, 0, 0, 0, tzinfo=tz),
            dt.datetime(2025, 1, 5, 23, 59, 59, 999999, tzinfo=tz),
        ]
        assert weekend_periods[0] == expected_first_weekend

        # Start datetime is a Saturday.
        dt_start = dt.datetime(2025, 1, 5, 23, 30, tzinfo=tz)
        dt_end = dt.datetime(2025, 2, 1, tzinfo=tz)
        weekend_periods = get_weekend_periods(dt_start, dt_end)

        assert len(weekend_periods) == 5
        for weekend in weekend_periods:
            assert len(weekend) == 2

        expected_first_weekend = [
            dt.datetime(2025, 1, 4, 0, 0, 0, 0, tzinfo=tz),
            dt.datetime(2025, 1, 5, 23, 59, 59, 999999, tzinfo=tz),
        ]
        assert weekend_periods[0] == expected_first_weekend

        # Period is not much than a week.
        dt_start = dt.datetime(2025, 4, 11, 16, 43, tzinfo=tz)
        dt_end = dt.datetime(2025, 4, 18, tzinfo=tz)
        weekend_periods = get_weekend_periods(dt_start, dt_end)

        assert len(weekend_periods) == 1
        for weekend in weekend_periods:
            assert len(weekend) == 2

        expected_first_weekend = [
            dt.datetime(2025, 4, 12, 0, 0, 0, 0, tzinfo=tz),
            dt.datetime(2025, 4, 13, 23, 59, 59, 999999, tzinfo=tz),
        ]
        assert weekend_periods[0] == expected_first_weekend

    def test_get_default_night(self):
        default_night_times = get_default_night()
        assert len(default_night_times) == 2
        assert default_night_times[0] == dt.time(hour=22)
        assert default_night_times[1] == dt.time(hour=6)

    @pytest.mark.parametrize("tz", [None, dt.timezone.utc, ZoneInfo("Europe/Paris")])
    def test_get_night_periods(self, tz):
        # Default night time from 22:00 to 06:00.
        dt_start = dt.datetime(2025, 4, 15, tzinfo=tz)
        dt_end = dt.datetime(2025, 4, 25, tzinfo=tz)
        night_periods = get_night_periods(dt_start, dt_end)

        assert len(night_periods) == 10
        for night in night_periods:
            assert len(night) == 2
            assert night[0].hour == 22
            assert night[1].hour == 6

        # Default night time from 22:00 to 06:00, set start/end time for period.
        dt_start = dt.datetime(2025, 4, 15, 23, 30, tzinfo=tz)
        dt_end = dt.datetime(2025, 4, 25, 2, 22, tzinfo=tz)
        night_periods = get_night_periods(dt_start, dt_end)

        assert len(night_periods) == 10
        for night in night_periods:
            assert len(night) == 2
            assert night[0].hour == 22
            assert night[1].hour == 6

        # Custom night time from 23:15 to 07:30.
        dt_start = dt.datetime(2025, 4, 15, tzinfo=tz)
        dt_end = dt.datetime(2025, 4, 25, tzinfo=tz)
        t_night_start = dt.time(hour=23, minute=15)
        t_night_end = dt.time(hour=7, minute=30)
        night_periods = get_night_periods(
            dt_start, dt_end, t_night_start=t_night_start, t_night_end=t_night_end
        )

        assert len(night_periods) == 10
        for night in night_periods:
            assert len(night) == 2
            assert night[0].time() == t_night_start
            assert night[1].time() == t_night_end

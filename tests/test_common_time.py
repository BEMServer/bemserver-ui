"""Common time tests"""

import datetime as dt
from zoneinfo import ZoneInfo

import pytest

from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import (
    add_time,
    convert_from_iso,
    convert_html_form_datetime,
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

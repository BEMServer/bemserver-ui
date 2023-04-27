"""Common time tests"""
import datetime as dt
from zoneinfo import ZoneInfo
import pytest

from bemserver_ui.common.time import (
    convert_html_form_datetime,
    convert_from_iso,
    strfdelta,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


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

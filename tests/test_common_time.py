"""Common time tests"""
import datetime as dt
from zoneinfo import ZoneInfo
import pytest

from bemserver_ui.common.time import convert_html_form_datetime, convert_from_iso
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

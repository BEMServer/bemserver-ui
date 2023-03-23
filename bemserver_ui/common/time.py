"""Time tools."""

import datetime as dt
import zoneinfo as zi

from .exceptions import BEMServerUICommonInvalidDatetimeError


def convert_html_form_datetime(form_date, form_time, *, tz=dt.timezone.utc):
    """Convert an HTML input date and time to a timezone aware datetime instance.

    Received HTML POST form values are not localized and tz-aware.

    :param str form_date: HTML form input date value (YYYY-mm-dd).
    :param str form_date: HTML form input time value (HH:MM).
    :param `zoneinfo.ZoneInfo`|`datetime.timezone` tz: (optional, default UTC)
        The timezone to set to the converted datetime instance.
    :return `datetime.datetime`: The timezone aware datetime instance created.
    :raise `BEMServerUICommonInvalidDatetimeError`:
        When HTML form inputs are not valid.
    """
    try:
        ret = dt.datetime.strptime(f"{form_date} {form_time}", "%Y-%m-%d %H:%M")
    except (
        ValueError,
        TypeError,
    ) as exc:
        raise BEMServerUICommonInvalidDatetimeError from exc

    try:
        ret = ret.replace(tzinfo=tz)
    except (
        TypeError,
        zi.ZoneInfoNotFoundError,
    ) as exc:
        raise BEMServerUICommonInvalidDatetimeError from exc

    return ret


def convert_from_iso(dt_iso, *, tz=dt.timezone.utc):
    """Convert an ISO datetime to a timezone aware datetime instance.

    :param str dt_iso: HTML form input date value (YYYY-mm-ddTHH:MM:SS+00:00).
    :param `zoneinfo.ZoneInfo`|`datetime.timezone` tz: (optional, default UTC)
        The timezone to set to the converted datetime instance.
    :return `datetime.datetime`: The timezone aware datetime instance created.
    :raise `BEMServerUICommonInvalidDatetimeError`:
        When ISO datetime input is not valid.
    """
    try:
        ret = dt.datetime.fromisoformat(dt_iso)
    except (
        KeyError,
        ValueError,
        TypeError,
    ) as exc:
        raise BEMServerUICommonInvalidDatetimeError from exc

    tz_name = None
    if isinstance(tz, dt.timezone):
        tz_name = dt.datetime.now(tz=tz).tzname()
    elif isinstance(tz, zi.ZoneInfo):
        tz_name = tz.key
    elif tz is not None:
        raise BEMServerUICommonInvalidDatetimeError from TypeError

    if tz is not None and tz_name != ret.tzname():
        ret = ret.astimezone(tz)

    return ret

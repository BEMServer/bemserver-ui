"""Time tools."""
import datetime as dt
import zoneinfo as zi
from string import Formatter

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


# Inpired by https://stackoverflow.com/a/42320260
def strfdelta(tdelta, fmt="{D:02}d {H:02}h {M:02}m {S:02}s", inputtype="timedelta"):
    """Convert a datetime.timedelta object or a regular number to a custom-formatted
    string, just like the stftime() method does for datetime.datetime objects.

    The fmt argument allows custom formatting to be specified.
    Fields can include seconds, minutes, hours, days, and weeks. Each field is optional.

    Some examples:
        "{D:02}d {H:02}h {M:02}m {S:02}s" --> "05d 08h 04m 02s" (default)
        "{W}w {D}d {H}:{M:02}:{S:02}"     --> "4w 5d 8:04:02"
        "{D:2}d {H:2}:{M:02}:{S:02}"      --> " 5d  8:04:02"
        "{H}h {S}s"                       --> "72h 800s"

    The inputtype argument allows tdelta to be a regular number instead of the default,
    which is a datetime.timedelta object. Valid inputtype strings:
        "s", "seconds",
        "m", "minutes",
        "h", "hours",
        "d", "days",
        "w", "weeks"
    """
    # Convert tdelta to integer seconds.
    if inputtype == "timedelta":
        remainder = int(tdelta.total_seconds())
    elif inputtype in ["s", "seconds"]:
        remainder = int(tdelta)
    elif inputtype in ["m", "minutes"]:
        remainder = int(tdelta) * 60
    elif inputtype in ["h", "hours"]:
        remainder = int(tdelta) * 3600
    elif inputtype in ["d", "days"]:
        remainder = int(tdelta) * 86400
    elif inputtype in ["w", "weeks"]:
        remainder = int(tdelta) * 604800

    f = Formatter()
    desired_fields = [field_tuple[1] for field_tuple in f.parse(fmt)]
    possible_fields = ("W", "D", "H", "M", "S")
    constants = {"W": 604800, "D": 86400, "H": 3600, "M": 60, "S": 1}
    values = {}
    for field in possible_fields:
        if field in desired_fields and field in constants:
            values[field], remainder = divmod(remainder, constants[field])
    return f.format(fmt, **values)

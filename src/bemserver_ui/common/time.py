"""Time tools."""

import calendar
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


def convert_html_form_time(form_time):
    """Convert an HTML input time to a time instance.

    :param str form_date: HTML form input time value (HH:MM).
    :return `datetime.time`: The time instance created.
    :raise `BEMServerUICommonInvalidDatetimeError`:
        When HTML form inputs are not valid.
    """
    try:
        ret = dt.datetime.strptime(form_time, "%H:%M").time()
    except (
        ValueError,
        TypeError,
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


def add_time(dt_ref, years=0, months=0):
    """Add or subtract years and/or months to a datetime.
    Years and months are cumulated if used at the same time.

    :param `datetime.datetime` dt_ref: The datetime instance to update.
    :param int years: The number of years used to update dt_ref.
        If positive value, years are added.
        If negative value, years are subtracted.
    :param int months: The number of months used to update dt_ref.
        If positive value, months are added.
        If negative value, months are subtracted.
    :return `datetime.datetime`: A timezone aware datetime instance updated.
    """
    min_month = 1
    max_month = 12

    # First compute total offset years.
    extra_years, left_months = divmod(months, max_month)
    offset_years = years + extra_years

    # Then compute target month, based on left months (months without extra years).
    target_month = dt_ref.month + left_months

    # Adjust target month and offset years, if target months overflows.
    if target_month == 0:
        target_month = max_month
        offset_years -= 1
    elif target_month < min_month:
        target_month = max_month + target_month
        offset_years -= 1
    elif target_month > max_month:
        target_month -= max_month
        offset_years += 1

    # Set target year, based on reference year offseted.
    target_year = dt_ref.year + offset_years

    # Adjust target day, taking in account end of months and leap years.
    _, maxdays_in_refmonth = calendar.monthrange(dt_ref.year, dt_ref.month)
    _, maxdays_in_targetmonth = calendar.monthrange(target_year, target_month)
    is_maxdays_in_ref = dt_ref.day == maxdays_in_refmonth
    target_day = maxdays_in_targetmonth if is_maxdays_in_ref else dt_ref.day

    return dt.datetime(
        target_year,
        target_month,
        target_day,
        dt_ref.hour,
        dt_ref.minute,
        dt_ref.second,
        dt_ref.microsecond,
        tzinfo=dt_ref.tzinfo,
    )


def get_weeks(dt_start, dt_end, *, complete_weeks=True):
    weeks = {}

    if complete_weeks:
        # Extend bounds if start/end is not the first/last day of a week.
        if dt_start.weekday() != 0:
            nb_backward = dt_start.weekday()
            dt_start -= dt.timedelta(days=nb_backward)
        if dt_end.weekday() != 6:
            nb_forward = 6 - dt_end.weekday()
            dt_end += dt.timedelta(days=nb_forward)

    dt_current = dt_start
    while dt_current <= dt_end:
        dt_current_isocal = dt_current.isocalendar()

        cur_week = f"{dt_current_isocal.year}-W{dt_current_isocal.week:02d}"
        if cur_week not in weeks:
            weeks[cur_week] = {
                "week_num": dt_current_isocal.week,
                "start": None,
                "end": None,
                "dates": [],
            }

        weeks[cur_week]["dates"].append(dt_current)

        if dt_current == dt_start or dt_current_isocal.weekday == 1:
            weeks[cur_week]["start"] = dt_current

        if dt_current == dt_end or dt_current_isocal.weekday == 7:
            weeks[cur_week]["end"] = dt_current

        dt_current += dt.timedelta(days=1.0)

    return weeks


def get_year_weeks(year, *, complete_weeks=True, tz=dt.timezone.utc):
    dt_start = dt.datetime(year, 1, 1, tzinfo=tz)
    dt_end = dt.datetime(year, 12, 31, tzinfo=tz)
    return get_weeks(dt_start, dt_end, complete_weeks=complete_weeks)


def get_month_weeks(year, month, *, complete_weeks=True, tz=dt.timezone.utc):
    dt_start = dt.datetime(year, month, 1, tzinfo=tz)
    dt_end = dt.datetime(year, month, calendar.monthrange(year, month)[1], tzinfo=tz)
    return get_weeks(dt_start, dt_end, complete_weeks=complete_weeks)


def _get_date_from_isoweek(isoweek, *, tz=dt.timezone.utc):
    try:
        ret = dt.datetime.strptime(isoweek, "%G-W%V-%u")
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


def get_period_from_isoweek(isoweek, *, tz=dt.timezone.utc):
    isoweek_firstday = 1
    dt_start = _get_date_from_isoweek(f"{isoweek}-{isoweek_firstday}", tz=tz)
    dt_end = _get_date_from_isoweek(f"{isoweek}-{isoweek_firstday + 6}", tz=tz)
    return dt_start, dt_end


def get_isoweek_from_date(date, *, include_daynum=False):
    isoweek_format = "%G-W%V-%u" if include_daynum else "%G-W%V"
    return dt.datetime.strftime(date, isoweek_format)


def get_weekend_periods(dt_start, dt_end):
    """Get the list of weekend periods between 2 dates.
    Time part is ignored.

    Reminder on weekday concept: Monday is 0 and Sunday is 6.
    Weekend days are set to be Saturday (5) and Sunday (6).

    :param `datetime.datetime` dt_start: Start of calculation period
    :param `datetime.datetime` dt_end: End of calculation period
    :return `[[datetime.datetime]]`:
        A list of timezone aware datetime instances for each weekend period.
    """
    weekend_days = [5, 6]

    # Ignore time part of the given period.
    dt_start = dt_start.replace(hour=0, minute=0, second=0, microsecond=0)
    dt_end = dt_end.replace(hour=0, minute=0, second=0, microsecond=0)

    # As we want complete weekend period, ensure that:
    #  - the start datetime includes the first weekend day possible.
    min_weekend_days = min(weekend_days)
    if dt_start.weekday() in weekend_days and dt_start.weekday() > min_weekend_days:
        dt_start -= dt.timedelta(days=1.0) * (dt_start.weekday() - min_weekend_days)
    #  - and the end datetime includes the last weekdend day possible.
    max_weekend_day = max(weekend_days)
    if dt_end.weekday() in weekend_days and dt_end.weekday() < max_weekend_day:
        dt_end += dt.timedelta(days=1.0) * (max_weekend_day - dt_end.weekday())

    weekend_length = len(weekend_days)  # Number of days counted in a weekend.

    # Get all weekend dates from the whole given period.
    weekend_dates = [
        day
        for day in [
            dt_start + dt.timedelta(n) for n in range((dt_end - dt_start).days + 1)
        ]
        if day.weekday() in weekend_days
    ]

    # Group each weekend dates together.
    weekend_periods = []
    index = 0
    while index + weekend_length <= len(weekend_dates):
        weekend_period = []
        for n in range(weekend_length):
            weekend_period.append(weekend_dates[index + n])

        weekend_period[-1] += dt.timedelta(
            hours=23.0, minutes=59.0, seconds=59.0, microseconds=999999
        )

        weekend_periods.append(weekend_period)
        index += weekend_length

    return weekend_periods


def get_default_night():
    """Get the default night start and end times."""
    return [dt.time(hour=22), dt.time(hour=6)]


def get_night_periods(dt_start, dt_end, t_night_start=None, t_night_end=None):
    """Get the list of night periods between 2 dates.
    Time part if given period is ignored.

    :param `datetime.datetime` dt_start: Start of calculation period
    :param `datetime.datetime` dt_end: End of calculation period
    :param `datetime.datetime` t_night_start:
        (optional, default 22:00) Start of night period
    :param `datetime.datetime` t_night_end:
        (optional, default 06:00) End of night period
    :return `[[datetime.datetime]]`:
        A list of timezone aware datetime instances for each night in given period.
    """
    default_night_times = get_default_night()
    if t_night_start is None:
        t_night_start = default_night_times[0]
    if t_night_end is None:
        t_night_end = default_night_times[1]

    td_night_start = dt.timedelta(
        hours=t_night_start.hour,
        minutes=t_night_start.minute,
        seconds=t_night_start.second,
        microseconds=t_night_start.microsecond,
    )
    td_night_end = dt.timedelta(
        days=1.0,
        hours=t_night_end.hour,
        minutes=t_night_end.minute,
        seconds=t_night_end.second,
        microseconds=t_night_end.microsecond,
    )

    # Ignore time part of the given period.
    dt_start = dt_start.replace(hour=0, minute=0, second=0, microsecond=0)
    dt_end = dt_end.replace(hour=0, minute=0, second=0, microsecond=0)

    night_periods = []
    dt_current = dt_start
    while dt_current < dt_end:
        night_start = dt_current + td_night_start
        night_end = dt_current + td_night_end
        night_periods.append([night_start, night_end])
        dt_current += dt.timedelta(days=1)

    return night_periods

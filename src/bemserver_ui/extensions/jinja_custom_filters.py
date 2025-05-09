"""Custom fitlers for Jinja"""

import zoneinfo

from markupsafe import Markup, escape

from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import convert_from_iso


def init_app(app):
    @app.template_filter("iso_datetime_format")
    def iso_datetime_format(iso_datetime, *, tz_name="UTC", default="unknown"):
        """Convert an ISO datetime to a human readable string.

        Examples:
            2022-03-21T14:55:08.442000Z
                becomes 2022-03-21T15:55:08.442000+01:00 in Europe/Paris timezone
            2022-03-21T14:55:08.442000+01:00
                becomes 2022-03-21T15:55:08.442000Z in UTC
        """
        try:
            tz = zoneinfo.ZoneInfo(tz_name)
        except (TypeError, zoneinfo.ZoneInfoNotFoundError):
            tz = zoneinfo.ZoneInfo("UTC")

        try:
            ret = convert_from_iso(iso_datetime, tz=tz)
        except BEMServerUICommonInvalidDatetimeError:
            return default

        return ret.isoformat()

    @app.template_filter("is_dict")
    def is_dict(obj_instance):
        """Test if an object instance is of dictionary type."""
        return isinstance(obj_instance, dict)

    @app.template_filter("crlf2html")
    def crlf2html(value):
        """Securely replace all carriage return ("\r") and new line characters ("\n").

        "&#13;" replaces "\r"
        "&#10;" replaces "\n"
        """
        safe_value = str(escape(value))
        formatted_value = safe_value.replace("\r", "&#13;")
        formatted_value = formatted_value.replace("\n", "&#10;")
        return Markup(formatted_value)

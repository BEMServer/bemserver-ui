"""Custom fitlers for Jinja"""
import zoneinfo


from bemserver_ui.common.time import convert_from_iso
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


def init_app(app):
    @app.template_filter("iso_datetime_format")
    def iso_datetime_format(iso_datetime, *, tz_name="UTC", default="unknown"):
        """Convert an ISO datetime to a human readable string.

        Examples:
            2022-03-21T14:55:08.442000+01:00 becomes 21/03/2022, 13:55:08 UTC
            2022-03-21T14:55:08.442000+01:00 becomes 21/03/2022, 14:55:08 UTC+0100
        """
        try:
            tz = zoneinfo.ZoneInfo(tz_name)
        except (TypeError, zoneinfo.ZoneInfoNotFoundError):
            tz = zoneinfo.ZoneInfo("UTC")

        try:
            ret = convert_from_iso(iso_datetime, tz=tz)
        except BEMServerUICommonInvalidDatetimeError:
            return default

        return ret.strftime("%d/%m/%Y, %H:%M:%S UTC%z")

    @app.template_filter("is_dict")
    def is_dict(obj_instance):
        """Test if an object instance is of dictionary type."""
        return isinstance(obj_instance, dict)

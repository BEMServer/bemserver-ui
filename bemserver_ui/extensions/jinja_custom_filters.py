"""Custom fitlers for Jinja"""
import datetime as dt


def init_app(app):
    @app.template_filter("iso_datetime_format")
    def iso_datetime_format(iso_datetime, *, default="unknown"):
        """Convert an ISO datetime to a human readable string.

        Example:
            2022-03-21T14:55:08.442000+01:00 becomes 21/03/2022, 13:55:08 UTC
        """
        try:
            ret = dt.datetime.fromisoformat(iso_datetime)
        except (
            ValueError,
            TypeError,
        ):
            return default
        else:
            return ret.strftime("%d/%m/%Y, %H:%M:%S %Z")

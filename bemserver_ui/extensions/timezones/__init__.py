"""BEMServer UI timezones"""

import flask
import json
from pathlib import Path
from textwrap import dedent


def _load_timezones():
    timezones_filepath = Path(__file__).parent / "timezones.json"
    with timezones_filepath.open("r") as fp:
        return json.load(fp)


def init_app(app):
    @app.route(f"{app.static_url_path}/scripts/modules/tools/timezones.js")
    def generate_timezones_es6_module():
        tz_defaults = {
            "name": (app.config.get("BEMSERVER_TIMEZONE_NAME") or "UTC"),
        }

        tz_data = _load_timezones()

        module_content = dedent(
            f"""\
            export const tzDefaults = {tz_defaults};
            export const tzData = {tz_data};

            export function getTzInfo(tzName) {{
                return tzName in tzData ? tzData[tzName] : tzData[tzDefaults.name];
            }}
            """
        )

        return flask.make_response(
            module_content,
            200,
            {"Content-Type": "text/javascript"},
        )


def get_tz_info(tz_name):
    tz_data = _load_timezones()
    try:
        return tz_data[tz_name]
    except KeyError:
        return tz_data["UTC"]

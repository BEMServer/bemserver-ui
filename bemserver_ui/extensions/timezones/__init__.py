"""BEMServer UI timezones"""

import flask
import json
from textwrap import dedent

from .timezones import TimezoneTool


def init_app(app):
    @app.route(f"{app.static_url_path}/scripts/modules/tools/timezones.js")
    def generate_timezones_es6_module():
        tz_tool = TimezoneTool()
        tz_tool.prepare_data()

        default_tz_name = app.config.get("BEMSERVER_TIMEZONE_NAME") or "UTC"
        default_tz_region = tz_tool.get_tz_info(default_tz_name)["region"]

        module_content = dedent(
            f"""\
            export class TimezoneTool {{

                constructor() {{
                    this.defaultTzName = {default_tz_name!r};
                    this.defaultTzRegion = {default_tz_region!r};

                    this.timezones = {json.dumps(tz_tool.timezones)};
                    this.regions = {json.dumps(tz_tool.regions)};
                    this.areasByRegion = {json.dumps(tz_tool.areas_by_region)};
                    this.timezonesByRegionByArea = {json.dumps(
                        tz_tool.timezones_by_region_by_area
                    )};
                }}

                tzExists(tzName) {{
                    return tzName in this.timezones;
                }}

                getTzInfo(tzName) {{
                    if (!this.tzExists(tzName)) {{
                        tzName = this.defaultTzName;
                    }}
                    return this.timezones[tzName];
                }}
            }}
            """
        )

        return flask.make_response(
            module_content,
            200,
            {"Content-Type": "text/javascript"},
        )


def get_tz_info(tz_name):
    tz_tool = TimezoneTool()
    return tz_tool.get_tz_info(tz_name)

"""Analysis parameters internal API"""

import flask

from bemserver_ui.common.time import get_month_weeks

blp = flask.Blueprint("parameters", __name__, url_prefix="/parameters")


@blp.route("/weeks/<int:year>/<int:month>")
def month_weeks(year, month):
    weeks = get_month_weeks(year, month)

    for week_info in weeks.values():
        week_info["start"] = week_info["start"].date().isoformat()
        week_info["end"] = week_info["end"].date().isoformat()
        for i in range(0, len(week_info["dates"])):
            week_info["dates"][i] = week_info["dates"][i].date().isoformat()

    return flask.jsonify(weeks)

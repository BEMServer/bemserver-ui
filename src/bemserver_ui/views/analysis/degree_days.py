"""Degree days analysis views"""

import flask

from bemserver_api_client.enums import DegreeDaysType

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("degree_days", __name__, url_prefix="/degree_days")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    dd_types = {x.name: x.value for x in DegreeDaysType}
    return flask.render_template(
        "pages/analysis/degree_days.html",
        dd_types=dd_types,
        dd_type_default=DegreeDaysType.heating.name,
    )

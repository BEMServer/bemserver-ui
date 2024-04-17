"""Weather data analysis views"""

import flask

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("weather", __name__, url_prefix="/weather")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template(
        "pages/analysis/weather.html",
        forecast_nbdays=5,
    )

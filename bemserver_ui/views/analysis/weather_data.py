"""Weather data analysis views"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("weather_data", __name__, url_prefix="/weather_data")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template("pages/analysis/weather_data/explore.html")

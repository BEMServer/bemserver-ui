"""Outlier data service views"""

import flask

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("weather_data", __name__, url_prefix="/weather_data")


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required
@ensure_campaign_context
def manage():
    return flask.render_template("pages/services/weather_data/manage.html")

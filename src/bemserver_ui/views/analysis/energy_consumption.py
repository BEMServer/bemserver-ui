"""Energy consumption analysis views"""

import flask

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("energy_consumption", __name__, url_prefix="/energy_consumption")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template("pages/analysis/energy_consumption.html")

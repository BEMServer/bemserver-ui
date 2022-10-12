"""Timeseries data states internal API"""
import flask

from bemserver_ui.extensions import auth


blp = flask.Blueprint(
    "timeseries_datastates", __name__, url_prefix="/timeseries_datastates"
)


@blp.route("/")
@auth.signin_required
def retrieve_list():
    resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")
    return flask.jsonify({"data": resp.data})

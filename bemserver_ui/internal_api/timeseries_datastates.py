"""Timeseries data states internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth


blp = flask.Blueprint(
    "timeseries_datastates", __name__, url_prefix="/timeseries_datastates"
)


@blp.route("/")
@auth.signin_required
def retrieve_list():
    try:
        resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while getting timeseries data states!",
            response=exc.errors,
        )

    return flask.jsonify(
        {
            "data": resp.data,
        }
    )

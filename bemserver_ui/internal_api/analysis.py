"""Analysis internal API"""
import flask
import json

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("analysis", __name__, url_prefix="/analysis")


@blp.route("/completeness")
@auth.signin_required
@ensure_campaign_context
def retrieve_completeness():

    filters = {}
    if "start_time" in flask.request.args:
        filters["start_time"] = flask.request.args["start_time"]
    if "end_time" in flask.request.args:
        filters["end_time"] = flask.request.args["end_time"]
    if "timeseries" in flask.request.args:
        filters["timeseries"] = [
            int(i) for i in flask.request.args["timeseries"].split(",")
        ]
    if "data_state" in flask.request.args:
        filters["data_state"] = flask.request.args["data_state"]
    if "bucket_width_value" in flask.request.args:
        filters["bucket_width_value"] = flask.request.args["bucket_width_value"]
    if "bucket_width_unit" in flask.request.args:
        filters["bucket_width_unit"] = flask.request.args["bucket_width_unit"]
    try:
        # Get completeness data.
        analysis_resp = flask.g.api_client.analysis.get_completeness(**filters)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)
    return flask.jsonify({"data": analysis_resp.data})

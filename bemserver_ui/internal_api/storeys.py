"""Storeys internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("storeys", __name__, url_prefix="/storeys")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        storey_resp = flask.g.api_client.storeys.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Storey not found!")

    try:
        storey_property_data_resp = \
            flask.g.api_client.storey_property_data.getall(zone_id=id)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while retrieving storey property data!",
            response=exc.errors)

    return flask.jsonify({
        "type": "storey",
        "general": storey_resp.data,
        "properties": storey_property_data_resp.data,
    })

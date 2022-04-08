"""Zones internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("zones", __name__, url_prefix="/zones")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        zone_resp = flask.g.api_client.zones.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Zone not found!")

    try:
        zone_property_data_resp = \
            flask.g.api_client.zone_property_data.getall(zone_id=id)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while retrieving zone property data!",
            response=exc.errors)

    return flask.jsonify({
        "type": "zone",
        "general": zone_resp.data,
        "properties": zone_property_data_resp.data,
    })

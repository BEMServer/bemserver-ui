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

    # Retrieve zone property data (all available, filled and not with values).
    zone_properties = []
    zone_properties_resp = flask.g.api_client.zone_properties.getall()
    for zone_property in zone_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            zone_property["structural_element_property_id"])
        zone_property["property_id"] = zone_property.pop("id")
        zone_property["name"] = struct_property_resp.data["name"]
        zone_property["description"] = struct_property_resp.data["description"]

        zone_property["value"] = None
        zone_property_data_resp = flask.g.api_client.zone_property_data.getall(
            zone_id=id, zone_property_id=zone_property["property_id"])
        if len(zone_property_data_resp.data) == 1:
            zone_property["value"] = zone_property_data_resp.data[0]["value"]

        zone_properties.append(zone_property)

    return flask.jsonify({
        "type": "zone",
        "general": zone_resp.data,
        "properties": zone_properties,
    })

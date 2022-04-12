"""Buildings internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("buildings", __name__, url_prefix="/buildings")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        building_resp = flask.g.api_client.buildings.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Building not found!")

    # Retrieve building property data (all available, filled and not with values).
    building_properties = []
    building_properties_resp = flask.g.api_client.building_properties.getall()
    for building_property in building_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            building_property["structural_element_property_id"])
        building_property["property_id"] = building_property.pop("id")
        building_property["name"] = struct_property_resp.data["name"]
        building_property["description"] = struct_property_resp.data["description"]

        building_property["value"] = None
        building_property_data_resp = flask.g.api_client.site_property_data.getall(
            building_id=id, building_property_id=building_property["property_id"])
        if len(building_property_data_resp.data) == 1:
            building_property["value"] = building_property_data_resp.data[0]["value"]

        building_properties.append(building_property)

    return flask.jsonify({
        "type": "building",
        "general": building_resp.data,
        "properties": building_properties,
    })

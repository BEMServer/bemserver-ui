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

    # Retrieve storey property data (all available, filled and not with values).
    storey_properties = []
    storey_properties_resp = flask.g.api_client.storey_properties.getall()
    for storey_property in storey_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            storey_property["structural_element_property_id"])
        storey_property["property_id"] = storey_property.pop("id")
        storey_property["name"] = struct_property_resp.data["name"]
        storey_property["description"] = struct_property_resp.data["description"]

        storey_property["value"] = None
        storey_property_data_resp = flask.g.api_client.site_property_data.getall(
            storey_id=id, storey_property_id=storey_property["property_id"])
        if len(storey_property_data_resp.data) == 1:
            storey_property["id"] = storey_property_data_resp.data[0]["id"]
            storey_property["value"] = storey_property_data_resp.data[0]["value"]

        storey_properties.append(storey_property)

    return flask.jsonify({
        "type": "storey",
        "general": storey_resp.data,
        "properties": storey_properties,
    })

"""Spaces internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("spaces", __name__, url_prefix="/spaces")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        space_resp = flask.g.api_client.spaces.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Space not found!")

    # Retrieve space property data (all available, filled and not with values).
    space_properties = []
    space_properties_resp = flask.g.api_client.space_properties.getall()
    for space_property in space_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            space_property["structural_element_property_id"])
        space_property["property_id"] = space_property.pop("id")
        space_property["name"] = struct_property_resp.data["name"]
        space_property["description"] = struct_property_resp.data["description"]

        space_property["value"] = None
        space_property_data_resp = flask.g.api_client.site_property_data.getall(
            space_id=id, space_property_id=space_property["property_id"])
        if len(space_property_data_resp.data) == 1:
            space_property["value"] = space_property_data_resp.data[0]["value"]

        space_properties.append(space_property)

    return flask.jsonify({
        "type": "space",
        "general": space_resp.data,
        "properties": space_properties,
    })

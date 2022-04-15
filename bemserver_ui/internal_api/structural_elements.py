"""Structural elements internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements")


@blp.route("/<string:type>/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(type, id):
    try:
        ret_resp = getattr(flask.g.api_client, f"{type}s").getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description=f"{type} not found!")

    return flask.jsonify({
        "type": type,
        "structural_element": ret_resp.data,
        "etag": ret_resp.etag,
    })


@blp.route("/<string:type>/<int:id>/properties")
@auth.signin_required
@ensure_campaign_context
def retrieve_property_data(type, id):
    available_properties = {}
    properties_resp = getattr(flask.g.api_client, f"{type}_properties").getall()
    for property in properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            property["structural_element_property_id"])
        property["name"] = struct_property_resp.data["name"]
        property["description"] = struct_property_resp.data["description"]
        available_properties[property["id"]] = property

    properties = []
    api_propdata_resource = getattr(flask.g.api_client, f"{type}_property_data")
    property_data_resp = api_propdata_resource.getall(**{f"{type}_id": id})
    for property_data in property_data_resp.data:
        property = available_properties.pop(property_data[f"{type}_property_id"])
        property["structural_element_property_id"] = property.pop("id")
        property["id"] = property_data["id"]
        property["value"] = property_data["value"]
        # Get ETag.
        property_data_resp = api_propdata_resource.getone(property["id"])
        property["etag"] = property_data_resp.etag
        properties.append(property)

    return flask.jsonify({
        "type": type,
        "properties": properties,
    })

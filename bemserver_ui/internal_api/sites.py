"""Sites internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("sites", __name__, url_prefix="/sites")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        site_resp = flask.g.api_client.sites.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Site not found!")

    # Retrieve site property data (all available, filled and not with values).
    site_properties = []
    site_properties_resp = flask.g.api_client.site_properties.getall()
    for site_property in site_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            site_property["structural_element_property_id"])
        site_property["property_id"] = site_property.pop("id")
        site_property["name"] = struct_property_resp.data["name"]
        site_property["description"] = struct_property_resp.data["description"]

        site_property["value"] = None
        site_property_data_resp = flask.g.api_client.site_property_data.getall(
            site_id=id, site_property_id=site_property["property_id"])
        if len(site_property_data_resp.data) == 1:
            site_property["id"] = site_property_data_resp.data[0]["id"]
            site_property["value"] = site_property_data_resp.data[0]["value"]

        site_properties.append(site_property)

    return flask.jsonify({
        "type": "site",
        "general": site_resp.data,
        "properties": site_properties,
    })

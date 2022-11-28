"""Structural elements internal API"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES


blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements"
)


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    campaign_id = flask.g.campaign_ctxt.id
    structural_elements = {}
    for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
        structural_elements[struct_elmt] = (
            getattr(flask.g.api_client, f"{struct_elmt}s")
            .getall(campaign_id=campaign_id, sort="+name")
            .data
        )
    return flask.jsonify(structural_elements)


@blp.route("/types")
@auth.signin_required
def retrieve_types():
    return flask.jsonify(FULL_STRUCTURAL_ELEMENT_TYPES)


@blp.route("/<string:type>")
@auth.signin_required
@ensure_campaign_context
def retrieve_list_for(type):
    campaign_id = flask.g.campaign_ctxt.id
    if type[:-1] not in FULL_STRUCTURAL_ELEMENT_TYPES:
        flask.abort(404, description=f'"{type}" structural element not found!')

    api_endpoint = getattr(flask.g.api_client, f"{type}")
    type_resp = api_endpoint.getall(campaign_id=campaign_id, sort="+name")
    return flask.jsonify(type_resp.data)


@blp.route("/<string:type>/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(type, id):
    ret_resp = getattr(flask.g.api_client, f"{type}s").getone(id)
    return flask.jsonify(
        {
            "type": type,
            "structural_element": ret_resp.data,
            "etag": ret_resp.etag,
        }
    )


@blp.route("/<string:type>/<int:id>/properties")
@auth.signin_required
@ensure_campaign_context
def retrieve_property_data(type, id):
    api_prop_resource = getattr(flask.g.api_client, f"{type}_properties")
    properties_resp = api_prop_resource.getall()
    available_properties = {}
    for property in properties_resp.data:
        available_properties[property["id"]] = property

    api_propdata_resource = getattr(flask.g.api_client, f"{type}_property_data")
    property_data_resp = api_propdata_resource.getall(**{f"{type}_id": id})

    properties = []
    for property_data in property_data_resp.data:
        strut_elmt_property = available_properties[
            property_data[f"{type}_property_id"]
        ]["structural_element_property"]
        for k, v in strut_elmt_property.items():
            property_data[k] = v
        properties.append(property_data)

    return flask.jsonify(
        {
            "type": type,
            "properties": properties,
        }
    )

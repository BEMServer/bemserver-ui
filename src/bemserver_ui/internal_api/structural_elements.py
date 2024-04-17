"""Structural elements internal API"""

import zoneinfo

import flask

from bemserver_ui.common.const import (
    FULL_STRUCTURAL_ELEMENT_TYPES,
    STRUCTURAL_ELEMENT_TYPES,
)
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError
from bemserver_ui.common.time import convert_html_form_datetime
from bemserver_ui.common.tree import build_tree
from bemserver_ui.extensions import Roles, auth, ensure_campaign_context

blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements"
)


def register_blueprint(api_blp):
    api_blp.register_blueprint(blp)


def _build_tree_sites(
    campaign_id,
    *,
    structural_element_types=STRUCTURAL_ELEMENT_TYPES,
    is_draggable=False,
):
    # Get all structure elements data for campaign.
    structural_elements_data = {}
    for structural_element_type in structural_element_types:
        api_resource = getattr(flask.g.api_client, f"{structural_element_type}s")
        api_resource_resp = api_resource.getall(campaign_id=campaign_id, sort="+name")
        structural_elements_data[structural_element_type] = api_resource_resp.data

    # Build structural elements tree.
    return build_tree(structural_elements_data, is_draggable=is_draggable)


def _build_tree_zones(campaign_id, *, is_draggable=False):
    zones_resp = flask.g.api_client.zones.getall(campaign_id=campaign_id, sort="+name")
    return build_tree({"zone": zones_resp.data}, is_draggable=is_draggable)


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
        flask.abort(404, description=f'"{type!r}" structural element not found!')

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


@blp.route("/site/<int:id>/fetch_weather_data", methods=["PUT"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def fetch_weather_data(id):
    tz = zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)
    try:
        dt_start = convert_html_form_datetime(
            flask.request.json["start_date"],
            flask.request.json["start_time"],
            tz=tz,
        )
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid start datetime!")
    try:
        dt_end = convert_html_form_datetime(
            flask.request.json["end_date"],
            flask.request.json["end_time"],
            tz=tz,
        )
    except BEMServerUICommonInvalidDatetimeError:
        flask.abort(422, description="Invalid end datetime!")

    flask.g.api_client.sites.download_weather_data(
        id,
        dt_start.isoformat(),
        dt_end.isoformat(),
    )

    return flask.jsonify({"success": True})


@blp.route("/tree/sites")
@auth.signin_required
@ensure_campaign_context
def retrieve_tree_sites():
    kwargs = {}
    if "draggable" in flask.request.args:
        kwargs["is_draggable"] = flask.request.args["draggable"]
    if "types" in flask.request.args:
        kwargs["structural_element_types"] = flask.request.args["types"].split(",")
    # Structural elements full tree data.
    sites_tree_data = _build_tree_sites(flask.g.campaign_ctxt.id, **kwargs)
    return flask.jsonify({"data": sites_tree_data})


@blp.route("/tree/zones")
@auth.signin_required
@ensure_campaign_context
def retrieve_tree_zones():
    kwargs = {}
    if "draggable" in flask.request.args:
        kwargs["is_draggable"] = flask.request.args["draggable"]
    # Zones tree data.
    zones_tree_data = _build_tree_zones(flask.g.campaign_ctxt.id, **kwargs)
    return flask.jsonify({"data": zones_tree_data})

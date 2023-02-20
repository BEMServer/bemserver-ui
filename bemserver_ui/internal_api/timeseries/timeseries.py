"""Timeseries internal API"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES
from bemserver_ui.views.structural_elements.structural_elements import (
    _build_tree_sites,
    _build_tree_zones,
    _search_tree_node,
)


blp = flask.Blueprint("timeseries", __name__, url_prefix="/timeseries")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    filters = {"campaign_id": flask.g.campaign_ctxt.id}
    if "page_size" in flask.request.args:
        filters["page_size"] = flask.request.args["page_size"]
    if "page" in flask.request.args:
        filters["page"] = flask.request.args["page"]
    if "search" in flask.request.args:
        filters["in_name"] = flask.request.args["search"]
    if "campaign_scope_id" in flask.request.args:
        filters["campaign_scope_id"] = flask.request.args["campaign_scope_id"]
    for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
        if f"{struct_elmt}_id" in flask.request.args:
            filters[f"{struct_elmt}_id"] = flask.request.args[f"{struct_elmt}_id"]
        if (
            struct_elmt not in ["space", "zone"]
            and f"recurse_{struct_elmt}_id" in flask.request.args
        ):
            filters[f"recurse_{struct_elmt}_id"] = flask.request.args[
                f"recurse_{struct_elmt}_id"
            ]

    # Get timeseries list.
    timeseries_resp = flask.g.api_client.timeseries.getall(sort="+name", **filters)

    return flask.jsonify(
        {"data": timeseries_resp.data, "pagination": timeseries_resp.pagination}
    )


@blp.route("/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_one(id):
    timeseries_resp = flask.g.api_client.timeseries.getone(id)
    return flask.jsonify(timeseries_resp.toJSON())


@blp.route("/<int:id>/properties")
@auth.signin_required
@ensure_campaign_context
def retrieve_property_data(id):
    properties_resp = flask.g.api_client.timeseries_properties.getall()
    available_properties = {}
    for property in properties_resp.data:
        available_properties[property["id"]] = property

    property_data_resp = flask.g.api_client.timeseries_property_data.getall(
        **{"timeseries_id": id}
    )

    properties = []
    for property in property_data_resp.data:
        ts_property = available_properties.pop(property["property_id"])
        for k, v in ts_property.items():
            if k in property:
                continue
            property[k] = v
        properties.append(property)

    return flask.jsonify(properties)


@blp.route("/<int:id>/structural_elements")
@auth.signin_required
@ensure_campaign_context
def retrieve_structural_elements(id):
    campaign_id = flask.g.campaign_ctxt.id
    tree_sites = _build_tree_sites(campaign_id)
    tree_zones = _build_tree_zones(campaign_id)

    data = {}
    for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
        data[struct_elmt_type] = []
        api_ts_by_struct_elmt = getattr(
            flask.g.api_client, f"timeseries_by_{struct_elmt_type}s"
        )
        ts_struct_elmt_resp = api_ts_by_struct_elmt.getall(
            timeseries_id=id, sort="+name"
        )
        data[struct_elmt_type] = ts_struct_elmt_resp.data
        for ts_struct_elmt in data[struct_elmt_type]:
            # Get ETag.
            link_resp = api_ts_by_struct_elmt.getone(ts_struct_elmt["id"])
            ts_struct_elmt["etag"] = link_resp.etag
            # Get structural element tree node data.
            ts_struct_elmt["structural_element"] = _search_tree_node(
                tree_sites if struct_elmt_type != "zone" else tree_zones,
                struct_elmt_type,
                link_resp.data[f"{struct_elmt_type}_id"],
            )

    return flask.jsonify(
        {
            "data": data,
            "structural_element_types": FULL_STRUCTURAL_ELEMENT_TYPES,
        }
    )


@blp.route("/<int:id>/structural_elements", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def post_structural_elements(id):
    struct_elmt_type = flask.request.json["type"]
    struct_elmt_id = flask.request.json["id"]

    api_tsbystructelmt_resource = getattr(
        flask.g.api_client, f"timeseries_by_{struct_elmt_type}s"
    )
    payload = {"timeseries_id": id, f"{struct_elmt_type}_id": struct_elmt_id}
    ret_resp = api_tsbystructelmt_resource.create(payload)

    return flask.jsonify(
        {
            "data": ret_resp.data,
            "etag": ret_resp.etag,
        }
    )


@blp.route("/<int:id>/remove_structural_elements", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def remove_structural_elements(id):
    struct_elmt_type = flask.request.json["type"]
    rel_id = flask.request.json["rel_id"]
    etag = flask.request.json["etag"]

    api_tsbystructelmt_resource = getattr(
        flask.g.api_client, f"timeseries_by_{struct_elmt_type}s"
    )
    api_tsbystructelmt_resource.delete(rel_id, etag=etag)

    return flask.jsonify({"success": True})

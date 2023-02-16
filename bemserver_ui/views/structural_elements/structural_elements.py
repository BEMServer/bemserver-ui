"""Structural elements views"""
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles, ensure_campaign_context
from bemserver_ui.common.const import (
    STRUCTURAL_ELEMENT_TYPES,
    FULL_STRUCTURAL_ELEMENT_TYPES,
)


blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements"
)


def _extract_data(data, data_type, parent_data=None, *, is_draggable=False):
    node_level = 0
    full_path = data["name"]
    if parent_data is not None:
        node_level = parent_data["node_level"] + 1
        if len(parent_data["full_path"]) > 0:
            full_path = " / ".join([parent_data["full_path"], full_path])
    return {
        "node_id": f"{data_type}-{data['id']}",
        "node_level": node_level,
        "id": data["id"],
        "name": data["name"],
        "type": data_type,
        "is_draggable": is_draggable,
        "is_selectable": True,
        "path": "" if parent_data is None else parent_data["full_path"],
        "full_path": full_path,
        "parent_node_id": None if parent_data is None else parent_data["node_id"],
        "nodes": [],
    }


def _build_tree_sites(
    campaign_id,
    *,
    structural_element_types=STRUCTURAL_ELEMENT_TYPES,
    is_draggable=False,
):
    # Get all structure elements for campaign.
    structural_elements = {}
    for structural_element_type in structural_element_types:
        api_resource = getattr(flask.g.api_client, f"{structural_element_type}s")
        api_resource_resp = api_resource.getall(campaign_id=campaign_id, sort="+name")
        structural_elements[structural_element_type] = api_resource_resp.data

    # Build structural elements tree.
    tree_data = []
    for site in structural_elements.get("site", []):
        site_data = _extract_data(site, "site", is_draggable=is_draggable)
        for building in structural_elements.get("building", []):
            if building["site_id"] != site["id"]:
                continue
            building_data = _extract_data(
                building, "building", site_data, is_draggable=is_draggable
            )
            for storey in structural_elements.get("storey", []):
                if storey["building_id"] != building["id"]:
                    continue
                storey_data = _extract_data(
                    storey, "storey", building_data, is_draggable=is_draggable
                )
                for space in structural_elements.get("space", []):
                    if space["storey_id"] != storey["id"]:
                        continue
                    space_data = _extract_data(
                        space, "space", storey_data, is_draggable=is_draggable
                    )
                    storey_data["nodes"].append(space_data)
                building_data["nodes"].append(storey_data)
            site_data["nodes"].append(building_data)
        tree_data.append(site_data)
    return tree_data


def _build_tree_zones(campaign_id, *, is_draggable=False):
    zones_resp = flask.g.api_client.zones.getall(campaign_id=campaign_id, sort="+name")
    tree_data = []
    for zone in zones_resp.data:
        zone_data = _extract_data(zone, "zone", is_draggable=is_draggable)
        tree_data.append(zone_data)
    return tree_data


def _get_node_level_from_type(node_type):
    level = 0
    if node_type == "building":
        level = 1
    elif node_type == "storey":
        level = 2
    elif node_type == "space":
        level = 3
    return level


def _search_tree_node(tree, node_type, node_id):
    node_level = _get_node_level_from_type(node_type)
    for node in tree:
        if node["type"] == node_type and node["id"] == node_id:
            return node
        if len(node["nodes"]) > 0 and node_level > node["node_level"]:
            ret = _search_tree_node(node["nodes"], node_type, node_id)
            if ret is not None:
                return ret
    return None


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    tab = flask.request.args.get("tab", "sites")
    return flask.render_template("pages/structural_elements/explore.html", tab=tab)


@blp.route("/<string:type>/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create(type):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "ifc_id": flask.request.form["ifc_id"],
        }

        if type in ("site", "zone"):
            payload["campaign_id"] = flask.g.campaign_ctxt.id
        elif type == "building":
            payload["site_id"] = flask.request.form["site"]
        elif type == "storey":
            payload["building_id"] = flask.request.form["building"]
        elif type == "space":
            payload["storey_id"] = flask.request.form["storey"]

        api_resource = getattr(flask.g.api_client, f"{type}s")
        ret_resp = api_resource.create(payload)
        flask.flash(f"New {type} created: {ret_resp.data['name']}", "success")
        return flask.redirect(
            flask.url_for(
                "structural_elements.edit",
                type=type,
                id=ret_resp.data["id"],
                tab="properties",
            )
        )

    # Get parent type and list.
    parent_type = None
    parents = []
    if type not in ("site", "zone"):
        if type == "building":
            parent_type = "site"
        elif type == "storey":
            parent_type = "building"
        elif type == "space":
            parent_type = "storey"
        parents = (
            getattr(flask.g.api_client, f"{parent_type}s")
            .getall(campaign_id=flask.g.campaign_ctxt.id, sort="+name")
            .data
        )

    return flask.render_template(
        "pages/structural_elements/create.html",
        type=type,
        parent_type=parent_type,
        parents=parents,
    )


@blp.route("/<string:type>/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(type, id):
    tab = flask.request.args.get("tab", "general")

    api_prop_resource = getattr(flask.g.api_client, f"{type}_properties")
    properties_resp = api_prop_resource.getall()
    available_properties = {}
    for property in properties_resp.data:
        for k, v in property["structural_element_property"].items():
            property[k] = v
        available_properties[property["id"]] = property

    api_propdata_resource = getattr(flask.g.api_client, f"{type}_property_data")
    property_data_resp = api_propdata_resource.getall(**{f"{type}_id": id})

    properties = {}
    for property in property_data_resp.data:
        strut_elmt_property = available_properties.pop(property[f"{type}_property_id"])
        for k, v in strut_elmt_property["structural_element_property"].items():
            property[k] = v

        # Get ETag.
        property_data_resp = api_propdata_resource.getone(property["id"])
        property["etag"] = property_data_resp.etag

        properties[property[f"{type}_property_id"]] = property

    api_resource = getattr(flask.g.api_client, f"{type}s")

    if flask.request.method == "GET":
        ret_resp = api_resource.getone(id)

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "ifc_id": flask.request.form["ifc_id"],
        }
        ret_resp = api_resource.update(id, payload, etag=flask.request.form["editEtag"])
        flask.flash(f"{type} updated: {ret_resp.data['name']}", "success")

        # Update property values, only if value has changed.
        for prop_id, prop_data in properties.items():
            # Flask form is special with checkboxes, it sets:
            #  - "on" if a checkbox input is checked
            #  - nothing is checkbox is not checked
            # In the second case, as the input field is not event in the request,
            #  and assuming current property type is boolean,
            #  we set a default value to "off".
            prop_value = flask.request.form.get(f"property-{prop_id}", "off")
            # For boolean properties, format value to minified "boolean" string.
            if prop_data["value_type"] == "boolean":
                prop_value = "true" if prop_value == "on" else "false"
            payload = {
                f"{type}_id": ret_resp.data["id"],
                f"{type}_property_id": prop_id,
                "value": prop_value,
            }
            if payload["value"] == prop_data["value"]:
                continue
            try:
                api_propdata_resource.update(
                    prop_data["id"],
                    payload,
                    etag=flask.request.form[f"property-{prop_id}-etag"],
                )
            except bac_exc.BEMServerAPIValidationError:
                flask.flash(
                    f"Error while setting {prop_data['name']} property!", "warning"
                )
            else:
                flask.flash(f"{prop_data['name']} property updated!", "success")

        return flask.redirect(flask.url_for("structural_elements.explore"))

    return flask.render_template(
        "pages/structural_elements/edit.html",
        type=type,
        structural_element=ret_resp.data,
        etag=ret_resp.etag,
        properties=properties,
        available_properties=available_properties,
        tab=tab,
    )


@blp.route("/<string:type>/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(type, id):
    api_resource = getattr(flask.g.api_client, f"{type}s")
    api_resource.delete(id, etag=flask.request.form["delEtag"])
    flask.flash(f"{type} deleted!", "success")
    return flask.redirect(flask.url_for("structural_elements.explore"))


@blp.route("/<string:type>/<int:id>/create_property", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create_property(type, id):
    # Flask form is special with checkboxes, it sets:
    #  - "on" if a checkbox input is checked
    #  - nothing is checkbox is not checked
    # In the second case, as the input field is not event in the request,
    #  and assuming current property type is boolean, we set a default value to "off".
    prop_value = flask.request.form.get("availablePropertyValue", "off")
    # For boolean properties, format value to minified "boolean" string.
    if flask.request.form["availablePropertyValueType"] == "boolean":
        prop_value = "true" if prop_value == "on" else "false"
    payload = {
        f"{type}_id": id,
        f"{type}_property_id": flask.request.form["availableProperty"],
        "value": prop_value,
    }
    api_resource = getattr(flask.g.api_client, f"{type}_property_data")
    api_resource.create(payload)
    flask.flash("Property defined!", "success")

    return flask.redirect(
        flask.url_for("structural_elements.edit", type=type, id=id, tab="properties")
    )


@blp.route(
    "/<string:type>/<int:id>/property/<int:property_id>/delete", methods=["POST"]
)
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete_property(type, id, property_id):
    api_resource = getattr(flask.g.api_client, f"{type}_property_data")
    api_resource.delete(
        property_id, etag=flask.request.form[f"delPropertyEtag-{property_id}"]
    )
    flask.flash("Property deleted!", "success")
    return flask.redirect(
        flask.url_for("structural_elements.edit", id=id, type=type, tab="properties")
    )


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        flask.g.api_client.io.upload_sites_csv(
            flask.g.campaign_ctxt.id,
            {k: v.stream for k, v in flask.request.files.items()},
        )
        flask.flash("Sites data uploaded!", "success")
        return flask.redirect(flask.url_for("structural_elements.explore"))

    return flask.render_template(
        "pages/structural_elements/upload.html",
        structural_element_types=FULL_STRUCTURAL_ELEMENT_TYPES,
    )

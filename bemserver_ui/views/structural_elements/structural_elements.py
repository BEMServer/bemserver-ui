"""Structural elements views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements")


def _extract_data(data, data_type):
    return {
        "id": data["id"],
        "name": data["name"],
        "type": data_type,
        "nodes": [],
    }


def _build_tree(campaign_id):
    # Get all structure elements for campaign.
    structural_elements = {}
    for structural_element_type in ["site", "building", "storey", "space"]:
        api_resource = getattr(flask.g.api_client, f"{structural_element_type}s")
        try:
            structural_elements[structural_element_type] = \
                api_resource.getall(campaign_id=campaign_id, sort="+name").data
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, response=exc.errors)

    # Build structural elements tree.
    tree_data = []
    for site in structural_elements["site"]:
        site_data = _extract_data(site, "site")
        for building in structural_elements["building"]:
            if building["site_id"] != site["id"]:
                continue
            building_data = _extract_data(building, "building")
            for storey in structural_elements["storey"]:
                if storey["building_id"] != building["id"]:
                    continue
                storey_data = _extract_data(storey, "storey")
                for space in structural_elements["space"]:
                    if space["storey_id"] != storey["id"]:
                        continue
                    space_data = _extract_data(space, "space")
                    storey_data["nodes"].append(space_data)
                building_data["nodes"].append(storey_data)
            site_data["nodes"].append(building_data)
        tree_data.append(site_data)
    return tree_data


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def manage():
    # This page retrieves all the structural elements of selected campaign.
    # Those structural elements are rendered in a tree view.
    # To do this, just build the entire tree (sites/buildings/storeys/spaces).

    campaign_id = flask.g.campaign_ctxt.id

    # Structural elements tree data.
    sites_tree_data = _build_tree(campaign_id)

    # Zones "tree" data.
    try:
        zones_resp = flask.g.api_client.zones.getall(
            campaign_id=campaign_id, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)
    else:
        zones_tree_data = []
        for zone in zones_resp.data:
            zone_data = _extract_data(zone, "zone")
            zones_tree_data.append(zone_data)

    return flask.render_template(
        "pages/structural_elements/manage.html", sites_tree_data=sites_tree_data,
        zones_tree_data=zones_tree_data)


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
        try:
            ret_resp = api_resource.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description=f"Error while creating the {type}!",
                response=exc.errors)
        else:
            flask.flash(f"New {type} created: {ret_resp.data['name']}", "success")
            return flask.redirect(flask.url_for(
                "structural_elements.edit", type=type, id=ret_resp.data["id"],
                tab="properties"))

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
        parents = getattr(flask.g.api_client, f"{parent_type}s").getall(
            campaign_id=flask.g.campaign_ctxt.id, sort="+name").data

    return flask.render_template(
        "pages/structural_elements/create.html",
        type=type, parent_type=parent_type, parents=parents)


@blp.route("/<string:type>/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(type, id):
    api_prop_resource = getattr(flask.g.api_client, f"{type}_properties")
    try:
        properties_resp = api_prop_resource.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)
    available_properties = {}
    for property in properties_resp.data:
        for k, v in property["structural_element_property"].items():
            property[k] = v
        available_properties[property["id"]] = property

    api_propdata_resource = getattr(flask.g.api_client, f"{type}_property_data")
    try:
        property_data_resp = api_propdata_resource.getall(**{f"{type}_id": id})
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    properties = {}
    for property in property_data_resp.data:
        strut_elmt_property = available_properties.pop(property[f"{type}_property_id"])
        for k, v in strut_elmt_property["structural_element_property"].items():
            property[k] = v

        # Get ETag.
        try:
            property_data_resp = api_propdata_resource.getone(property["id"])
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, f"{property['name']} property not found!")
        property["etag"] = property_data_resp.etag

        properties[property[f"{type}_property_id"]] = property

    api_resource = getattr(flask.g.api_client, f"{type}s")

    if flask.request.method == "GET":
        try:
            ret_resp = api_resource.getone(id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description=f"{type} not found!")

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "ifc_id": flask.request.form["ifc_id"],
        }
        try:
            ret_resp = api_resource.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description=f"Error while updating the {type}!",
                response=exc.errors)
        else:
            flask.flash(f"{type} updated: {ret_resp.data['name']}", "success")

            # Update property values, only if value has changed.
            for prop_id, prop_data in properties.items():
                payload = {
                    f"{type}_id": ret_resp.data["id"],
                    f"{type}_property_id": prop_id,
                    "value": flask.request.form[f"property-{prop_id}"],
                }
                if payload["value"] == prop_data["value"]:
                    continue
                try:
                    api_propdata_resource.update(
                        prop_data["id"], payload,
                        etag=flask.request.form[f"property-{prop_id}-etag"])
                except bac.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while setting {prop_data['name']} property!",
                        "warning")
                else:
                    flask.flash(f"{prop_data['name']} property updated!", "success")

            return flask.redirect(flask.url_for("structural_elements.manage"))

    tab = flask.request.args.get("tab", "general")

    return flask.render_template(
        "pages/structural_elements/edit.html", type=type,
        structural_element=ret_resp.data, etag=ret_resp.etag, properties=properties,
        available_properties=available_properties, tab=tab)


@blp.route("/<string:type>/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(type, id):
    api_resource = getattr(flask.g.api_client, f"{type}s")
    try:
        api_resource.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description=f"{type} not found!")
    else:
        flask.flash(f"{type} deleted!", "success")

    return flask.redirect(flask.url_for("structural_elements.manage"))


@blp.route("/<string:type>/<int:id>/create_property", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create_property(type, id):
    payload = {
        f"{type}_id": id,
        f"{type}_property_id": flask.request.form["availableProperty"],
        "value": flask.request.form["availablePropertyValue"],
    }
    api_resource = getattr(flask.g.api_client, f"{type}_property_data")
    try:
        api_resource.create(payload)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description=f"Error while setting the property for {type}!",
            response=exc.errors)
    else:
        flask.flash("Property defined!", "success")

    return flask.redirect(
        flask.url_for('structural_elements.edit', type=type, id=id, tab="properties"))


@blp.route(
    "/<string:type>/<int:id>/delete_property/<int:property_id>", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete_property(type, id, property_id):
    api_resource = getattr(flask.g.api_client, f"{type}_property_data")
    try:
        api_resource.delete(
            property_id, etag=flask.request.form[f"delPropertyEtag-{property_id}"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Property not found!")
    else:
        flask.flash("Property deleted!", "success")

    return flask.redirect(
        flask.url_for('structural_elements.edit', id=id, type=type, tab="properties"))

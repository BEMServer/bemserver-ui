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
    tree_data = []
    # Get all sites.
    try:
        sites_resp = flask.g.api_client.sites.getall(
            campaign_id=campaign_id, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)
    # For each site...
    for site in sites_resp.data:
        site_data = _extract_data(site, "site")
        # ...get all buildings.
        try:
            buildings_resp = flask.g.api_client.buildings.getall(
                site_id=site["id"], sort="+name")
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, response=exc.errors)
        # For each building...
        for building in buildings_resp.data:
            building_data = _extract_data(building, "building")
            # ...get storeys.
            try:
                storeys_resp = flask.g.api_client.storeys.getall(
                    building_id=building["id"], sort="+name")
            except bac.BEMServerAPIValidationError as exc:
                flask.abort(422, response=exc.errors)
            # For each storey...
            for storey in storeys_resp.data:
                storey_data = _extract_data(storey, "storey")
                # ...get spaces.
                try:
                    spaces_resp = flask.g.api_client.spaces.getall(
                        storey_id=storey["id"], sort="+name")
                except bac.BEMServerAPIValidationError as exc:
                    flask.abort(422, response=exc.errors)
                for space in spaces_resp.data:
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
            parents = flask.g.api_client.sites.getall(
                campaign_id=flask.g.campaign_ctxt.id, sort="+name").data
        elif type == "storey":
            parent_type = "building"
            sites = flask.g.api_client.sites.getall(
                campaign_id=flask.g.campaign_ctxt.id, sort="+name").data
            for site in sites:
                buildings = flask.g.api_client.buildings.getall(
                    site_id=site["id"], sort="+name").data
                parents.extend(buildings)
        elif type == "space":
            parent_type = "storey"
            sites = flask.g.api_client.sites.getall(
                campaign_id=flask.g.campaign_ctxt.id, sort="+name").data
            for site in sites:
                buildings = flask.g.api_client.buildings.getall(
                    site_id=site["id"], sort="+name").data
                for building in buildings:
                    storeys = flask.g.api_client.storeys.getall(
                        building_id=building["id"], sort="+name").data
                    parents.extend(storeys)
        # XXX: API need an update to get directly parent for the current campaign only
        # parents = getattr(flask.g.api_client, f"{type}s").getall(
        #     campaign_id=flask.g.campaign_ctxt.id, sort="+name").data

    return flask.render_template(
        "pages/structural_elements/create.html",
        type=type, parent_type=parent_type, parents=parents)


@blp.route("/<string:type>/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(type, id):
    available_properties = {}
    properties_resp = getattr(flask.g.api_client, f"{type}_properties").getall()
    for property in properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            property["structural_element_property_id"])
        property["name"] = struct_property_resp.data["name"]
        property["description"] = struct_property_resp.data["description"]
        available_properties[property["id"]] = property

    properties = {}
    api_propdata_resource = getattr(flask.g.api_client, f"{type}_property_data")
    property_data_resp = api_propdata_resource.getall(**{f"{type}_id": id})
    for property_data in property_data_resp.data:
        property = available_properties.pop(
            property_data[f"{type}_property_id"])
        property["property_id"] = property.pop("id")
        property["id"] = property_data["id"]
        property["value"] = property_data["value"]
        # Get ETag.
        property_data_resp = api_propdata_resource.getone(property["id"])
        property["etag"] = property_data_resp.etag
        properties[property_data[f"{type}_property_id"]] = property

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

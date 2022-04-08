"""Structural elements views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint(
    "structural_elements", __name__, url_prefix="/structural_elements")


def _extract_data(data, data_type):
    return {
        "id": data["id"],
        "name": data["name"],
        "type": data_type,
        "data_url": flask.url_for(f"api.{data_type}s.retrieve_data", id=data["id"]),
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

    # Zones tree data.
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

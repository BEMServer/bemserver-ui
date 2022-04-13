"""Storeys views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("storeys", __name__, url_prefix="/storeys")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    properties_resp = flask.g.api_client.storey_properties.getall()
    properties = []
    for property in properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            property["structural_element_property_id"])
        property["name"] = struct_property_resp.data["name"]
        property["description"] = struct_property_resp.data["description"]
        properties.append(property)

    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "building_id": flask.request.form["building"],
            "ifc_id": flask.request.form["ifc_id"],
        }
        try:
            ret = flask.g.api_client.storeys.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the storey!",
                response=exc.errors)
        else:
            flask.flash(f"New storey created: {ret.data['name']}", "success")

            # Add property values.
            for property in properties:
                payload = {
                    "storey_id": ret.data["id"],
                    "storey_property_id": property["id"],
                    "value": flask.request.form.get(f"property-{property['id']}", ""),
                }
                try:
                    flask.g.api_client.storey_property_data.create(payload)
                except bac.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while setting {property['name']} property!", "warning")

            return flask.redirect(flask.url_for("structural_elements.manage"))

    try:
        buildings_resp = flask.g.api_client.buildings.getall(sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    return flask.render_template(
        "pages/structural_elements/storeys/create.html", buildings=buildings_resp.data,
        properties=properties)

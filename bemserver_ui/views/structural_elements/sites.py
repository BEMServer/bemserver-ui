"""Sites views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("sites", __name__, url_prefix="/sites")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    properties_resp = flask.g.api_client.site_properties.getall()
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
            "campaign_id": flask.g.campaign_ctxt.id,
            "ifc_id": flask.request.form["ifc_id"],
        }
        try:
            ret = flask.g.api_client.sites.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the site!",
                response=exc.errors)
        else:
            flask.flash(f"New site created: {ret.data['name']}", "success")

            # Add property values.
            for property in properties:
                payload = {
                    "site_id": ret.data["id"],
                    "site_property_id": property["id"],
                    "value": flask.request.form.get(f"property-{property['id']}", ""),
                }
                try:
                    flask.g.api_client.site_property_data.create(payload)
                except bac.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while setting {property['name']} property!", "warning")

            return flask.redirect(flask.url_for("structural_elements.manage"))

    return flask.render_template(
        "pages/structural_elements/sites/create.html", properties=properties)


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(id):
    # Retrieve all available site property data.
    properties = []
    properties_resp = flask.g.api_client.site_properties.getall()
    for property in properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            property["structural_element_property_id"])
        property["property_id"] = property.pop("id")
        property["name"] = struct_property_resp.data["name"]
        property["description"] = struct_property_resp.data["description"]

        # Get property values (and ETags, just when GET page).
        property["value"] = ""
        if flask.request.method == "GET":
            property["etag"] = ""
        property_data_resp = flask.g.api_client.site_property_data.getall(
            site_id=id, site_property_id=property["property_id"])
        if len(property_data_resp.data) == 1:

            property["id"] = property_data_resp.data[0]["id"]
            property_data_resp = flask.g.api_client.site_property_data.getone(
                property["id"])

            property["value"] = property_data_resp.data["value"]
            if flask.request.method == "GET":
                property["etag"] = property_data_resp.etag

        properties.append(property)

    if flask.request.method == "GET":
        try:
            site_resp = flask.g.api_client.sites.getone(id)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Site not found!")

    elif flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "ifc_id": flask.request.form["ifc_id"],
        }
        try:
            site_resp = flask.g.api_client.sites.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating the site!",
                response=exc.errors)
        else:
            flask.flash(f"Site updated: {site_resp.data['name']}", "success")

            # Update (or add) property values.
            # 1. Property is in form, update its value.
            # 2. Property is NOT in form*, add a default value.
            #  (* it should have been created after the form was rendered)
            for property in properties:
                form_fieldname = f"property-{property['property_id']}"
                payload = {
                    "site_id": site_resp.data["id"],
                    "site_property_id": property["property_id"],
                    "value": flask.request.form.get(form_fieldname, ""),
                }
                form_fieldetag = flask.request.form.get(f"{form_fieldname}-etag", "")
                was_updated = False
                try:
                    if form_fieldname in flask.request.form and form_fieldetag != "":
                        # Update only if value has changed.
                        if property["value"] != payload["value"]:
                            flask.g.api_client.site_property_data.update(
                                property["id"], payload, etag=form_fieldetag)
                            was_updated = True
                    else:
                        flask.g.api_client.site_property_data.create(payload)
                        was_updated = True
                except bac.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while setting {property['name']} property!", "warning")
                else:
                    if was_updated:
                        flask.flash(f"{property['name']} property updated!", "success")

            return flask.redirect(flask.url_for("structural_elements.manage"))

    return flask.render_template(
        "pages/structural_elements/sites/edit.html", site=site_resp.data,
        etag=site_resp.etag, properties=properties)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.sites.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Site not found!")
    else:
        flask.flash("Site deleted!", "success")

    return flask.redirect(flask.url_for("structural_elements.manage"))

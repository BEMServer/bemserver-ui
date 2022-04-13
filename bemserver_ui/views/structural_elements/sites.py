"""Sites views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("sites", __name__, url_prefix="/sites")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
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
            return flask.redirect(
                flask.url_for("sites.edit", id=ret.data["id"], tab="properties"))

    return flask.render_template("pages/structural_elements/sites/create.html")


@blp.route("/<int:id>/create_property", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create_property(id):
    payload = {
        "site_id": id,
        "site_property_id": flask.request.form["availableProperty"],
        "value": flask.request.form["availablePropertyValue"],
    }
    try:
        flask.g.api_client.site_property_data.create(payload)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while setting the property!",
            response=exc.errors)
    else:
        flask.flash("Property defined!", "success")

    return flask.redirect(flask.url_for('sites.edit', id=id, tab="properties"))


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(id):

    available_properties = {}
    site_properties_resp = flask.g.api_client.site_properties.getall()
    for site_property in site_properties_resp.data:
        struct_property_resp = flask.g.api_client.structural_element_properties.getone(
            site_property["structural_element_property_id"])
        site_property["name"] = struct_property_resp.data["name"]
        site_property["description"] = struct_property_resp.data["description"]
        available_properties[site_property["id"]] = site_property

    site_properties = {}
    site_property_data_resp = flask.g.api_client.site_property_data.getall(site_id=id)
    for site_property_data in site_property_data_resp.data:
        site_property = available_properties.pop(site_property_data["site_property_id"])
        site_property["property_id"] = site_property.pop("id")
        site_property["id"] = site_property_data["id"]
        site_property["value"] = site_property_data["value"]
        # Get ETag.
        property_data_resp = \
            flask.g.api_client.site_property_data.getone(site_property["id"])
        site_property["etag"] = property_data_resp.etag
        site_properties[site_property_data["site_property_id"]] = site_property

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

            # Update property values, only if value has changed.
            for prop_id, prop_data in site_properties.items():
                payload = {
                    "site_id": site_resp.data["id"],
                    "site_property_id": prop_id,
                    "value": flask.request.form[f"property-{prop_id}"],
                }
                if payload["value"] == prop_data["value"]:
                    continue
                try:
                    flask.g.api_client.site_property_data.update(
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
        "pages/structural_elements/sites/edit.html", site=site_resp.data,
        etag=site_resp.etag, properties=site_properties,
        available_properties=available_properties, tab=tab)


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


@blp.route("/<int:id>/delete_property/<int:property_id>", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete_property(id, property_id):
    try:
        flask.g.api_client.site_property_data.delete(
            property_id, etag=flask.request.form[f"delPropertyEtag-{property_id}"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Property not found!")
    else:
        flask.flash("Property deleted!", "success")

    return flask.redirect(flask.url_for('sites.edit', id=id, tab="properties"))

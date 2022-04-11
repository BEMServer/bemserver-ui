"""Structural element properties views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint(
    "structural_element_properties", __name__,
    url_prefix="/structural_element_properties")


STRUCTURAL_ELEMENTS = ["site", "building", "storey", "space", "zone"]


def set_used_in(props_data):
    prop_ids = {}
    for struct_elmt in STRUCTURAL_ELEMENTS:
        api_resource = getattr(flask.g.api_client, f"{struct_elmt}_properties")
        try:
            props_resp = api_resource.getall()
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, response=exc.errors)
        prop_ids[struct_elmt] = [
            x["structural_element_property_id"] for x in props_resp.data]

    for prop_data in props_data:
        prop_data["used_in"] = {}
        for struct_elmt in STRUCTURAL_ELEMENTS:
            prop_data["used_in"][struct_elmt] = \
                prop_data["id"] in prop_ids[struct_elmt]


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        props_resp = flask.g.api_client.structural_element_properties.getall(
            sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    props_data = props_resp.data
    set_used_in(props_data)

    return flask.render_template(
        "pages/structural_elements/properties/list.html", properties=props_data,
        structural_elements=STRUCTURAL_ELEMENTS)


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        try:
            ret_resp = flask.g.api_client.structural_element_properties.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the property!",
                response=exc.errors)
        else:
            prop_name = ret_resp.data["name"]
            flask.flash(f"New property created: {prop_name}", "success")

            payload = {"structural_element_property_id": ret_resp.data["id"]}
            for x in STRUCTURAL_ELEMENTS:
                if x in flask.request.form:
                    api_resource = getattr(flask.g.api_client, f"{x}_properties")
                    try:
                        api_resource.create(payload)
                    except bac.BEMServerAPIValidationError:
                        flask.flash(
                            f"Error while adding {prop_name} property to {x}s!",
                            "error")
                    else:
                        flask.flash(f"{prop_name} property added to {x}s", "success")

            return flask.redirect(flask.url_for("structural_element_properties.list"))

    return flask.render_template(
        "pages/structural_elements/properties/create.html",
        structural_elements=STRUCTURAL_ELEMENTS)


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        try:
            prop_resp = flask.g.api_client.structural_element_properties.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="Error while updating the property!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Property not found!")
        else:
            prop_name = prop_resp.data["name"]
            flask.flash(f"{prop_name} property updated!", "success")

            payload = {"structural_element_property_id": prop_resp.data["id"]}
            for x in STRUCTURAL_ELEMENTS:
                api_resource = getattr(flask.g.api_client, f"{x}_properties")
                x_props = api_resource.getall(structural_element_property_id=id)
                # Property is requested to be associated to structural element.
                # Is property already attach to structural element?
                # 1. Yes, nothing to do.
                # 2. No, create association.
                if x in flask.request.form:
                    if len(x_props.data) <= 0:
                        try:
                            api_resource.create(payload)
                        except bac.BEMServerAPIValidationError:
                            flask.flash(
                                f"Error while adding {prop_name} property to {x}s!",
                                "error")
                        else:
                            flask.flash(
                                f"{prop_name} property added to {x}s", "success")
                # Property is NOT requested to be associated.
                # Is property currently attach to structural element?
                # 1. Yes, remove association.
                # 2. No, nothing to do.
                elif len(x_props.data) == 1:
                    try:
                        api_resource.delete(x_props.data[0]["id"])
                    except bac.BEMServerAPINotFoundError:
                        flask.flash(
                            f"{prop_name} property is already removed for {x}s!",
                            "warning")
                    else:
                        flask.flash(
                            f"{prop_name} property removed from {x}s", "success")

            return flask.redirect(flask.url_for("structural_element_properties.list"))

    try:
        prop_resp = flask.g.api_client.structural_element_properties.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Property not found!")

    prop_data = prop_resp.data
    set_used_in([prop_data])

    return flask.render_template(
        "pages/structural_elements/properties/edit.html", property=prop_data,
        etag=prop_resp.etag, structural_elements=STRUCTURAL_ELEMENTS)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.structural_element_properties.delete(
            id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Property not found!")
    else:
        # TODO: also delete property from site, building, storey, space, zone...?
        flask.flash("Property deleted!", "success")

    return flask.redirect(flask.url_for("structural_element_properties.list"))

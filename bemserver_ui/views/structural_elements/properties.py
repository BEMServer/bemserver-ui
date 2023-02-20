"""Structural element properties views"""
from copy import deepcopy
import urllib.parse
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES


blp = flask.Blueprint("properties", __name__, url_prefix="/properties")


def extend_props_data(props_data):
    prop_ids = {}
    for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
        api_resource = getattr(flask.g.api_client, f"{struct_elmt}_properties")
        props_resp = api_resource.getall()
        prop_ids[struct_elmt] = [
            x["structural_element_property_id"] for x in props_resp.data
        ]

    for prop_data in props_data:
        prop_data["used_in"] = {}
        for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
            prop_data["used_in"][struct_elmt] = prop_data["id"] in prop_ids[struct_elmt]
        prop_data["is_orphan"] = not any(
            [prop_data["used_in"][x] for x in FULL_STRUCTURAL_ELEMENT_TYPES]
        )


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def list():
    filters = {x: True for x in FULL_STRUCTURAL_ELEMENT_TYPES}
    filters["orphan"] = True
    # Get requested filters.
    if flask.request.method == "POST":
        for x in FULL_STRUCTURAL_ELEMENT_TYPES:
            filters[x] = x in flask.request.form
        filters["orphan"] = "orphan" in flask.request.form

    props_resp = flask.g.api_client.structural_element_properties.getall(sort="+name")
    props_data = props_resp.data
    extend_props_data(props_data)
    total_count = len(props_data)

    # Apply filters, if needed.
    is_filtered = False
    if not all(filters.values()):
        is_filtered = True
        all_props_data = deepcopy(props_data)
        props_data = []
        for prop_data in all_props_data:
            if filters["orphan"] and prop_data["is_orphan"]:
                props_data.append(prop_data)
            else:
                for struct_elmt in FULL_STRUCTURAL_ELEMENT_TYPES:
                    if filters[struct_elmt] and prop_data["used_in"][struct_elmt]:
                        props_data.append(prop_data)
                        break

    return flask.render_template(
        "pages/structural_elements/properties/list.html",
        properties=props_data,
        structural_elements=FULL_STRUCTURAL_ELEMENT_TYPES,
        filters=filters,
        is_filtered=is_filtered,
        total_count=total_count,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "value_type": flask.request.form["value_type"],
            "unit_symbol": flask.request.form["unit_symbol"],
            "description": flask.request.form["description"],
        }
        ret_resp = flask.g.api_client.structural_element_properties.create(payload)
        prop_name = ret_resp.data["name"]
        flask.flash(f"New property created: {prop_name}", "success")

        payload = {"structural_element_property_id": ret_resp.data["id"]}
        for x in FULL_STRUCTURAL_ELEMENT_TYPES:
            if x in flask.request.form:
                api_resource = getattr(flask.g.api_client, f"{x}_properties")
                try:
                    api_resource.create(payload)
                except bac_exc.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while adding {prop_name} property to {x}s!", "error"
                    )
                else:
                    flask.flash(f"{prop_name} property added to {x}s", "success")

        url_next = urllib.parse.unquote(
            flask.request.args.get("next")
            or flask.url_for("structural_elements.properties.list")
        )

        return flask.redirect(url_next)

    url_cancel = urllib.parse.unquote(
        flask.request.args.get("back")
        or flask.url_for("structural_elements.properties.list")
    )

    return flask.render_template(
        "pages/structural_elements/properties/create.html",
        structural_elements=FULL_STRUCTURAL_ELEMENT_TYPES,
        url_cancel=url_cancel,
    )


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "unit_symbol": flask.request.form["unit_symbol"],
            "description": flask.request.form["description"],
        }
        prop_resp = flask.g.api_client.structural_element_properties.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        prop_name = prop_resp.data["name"]
        flask.flash(f"{prop_name} property updated!", "success")

        payload = {"structural_element_property_id": prop_resp.data["id"]}
        for x in FULL_STRUCTURAL_ELEMENT_TYPES:
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
                    except bac_exc.BEMServerAPIValidationError:
                        flask.flash(
                            f"Error while adding {prop_name} property to {x}s!",
                            "error",
                        )
                    else:
                        flask.flash(f"{prop_name} property added to {x}s", "success")
            # Property is NOT requested to be associated.
            # Is property currently attach to structural element?
            # 1. Yes, remove association.
            # 2. No, nothing to do.
            elif len(x_props.data) == 1:
                try:
                    api_resource.delete(x_props.data[0]["id"])
                except bac_exc.BEMServerAPINotFoundError:
                    flask.flash(
                        f"{prop_name} property is already removed for {x}s!",
                        "warning",
                    )
                else:
                    flask.flash(f"{prop_name} property removed from {x}s", "success")

        return flask.redirect(flask.url_for("structural_elements.properties.list"))

    prop_resp = flask.g.api_client.structural_element_properties.getone(id)
    prop_data = prop_resp.data
    extend_props_data([prop_data])

    return flask.render_template(
        "pages/structural_elements/properties/edit.html",
        property=prop_data,
        etag=prop_resp.etag,
        structural_elements=FULL_STRUCTURAL_ELEMENT_TYPES,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.structural_element_properties.delete(
        id, etag=flask.request.form["delEtag"]
    )
    flask.flash("Property deleted!", "success")
    return flask.redirect(flask.url_for("structural_elements.properties.list"))

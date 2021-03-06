"""Timeseries views"""
from copy import deepcopy
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context, Roles
from bemserver_ui.common.const import FULL_STRUCTURAL_ELEMENT_TYPES

from ..structural_elements.structural_elements import (
    _build_tree_sites,
    _build_tree_zones,
)


blp = flask.Blueprint("timeseries", __name__, url_prefix="/timeseries")


def prepare_pagination(pagination, nb_total_links=5):
    start_page = 1
    has_start_ellipsis = False
    end_page = 1
    has_end_ellipsis = False

    if "page" in pagination:
        nb_links_per_side = int(nb_total_links / 2)
        start_nb_links = min(
            [nb_links_per_side, pagination["page"] - pagination["first_page"]]
        )
        end_nb_links = min(
            [nb_links_per_side, pagination["last_page"] - pagination["page"]]
        )

        tmp_start_nb_links = start_nb_links + (nb_links_per_side - end_nb_links)
        end_nb_links = end_nb_links + (nb_links_per_side - start_nb_links)
        start_nb_links = tmp_start_nb_links
        del tmp_start_nb_links

        if "previous_page" in pagination:
            start_page = max([start_page, pagination["page"] - start_nb_links])
            has_start_ellipsis = start_page > pagination["first_page"]

        end_page = pagination["last_page"]
        if "next_page" in pagination:
            end_page = min([end_page, pagination["page"] + end_nb_links])
            has_end_ellipsis = end_page < pagination["last_page"]

    pagination["nav_links"] = {
        "start_page": start_page,
        "end_page": end_page,
        "has_start_ellipsis": has_start_ellipsis,
        "has_end_ellipsis": has_end_ellipsis,
    }
    return pagination


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required
@ensure_campaign_context
def list():
    campaign_id = flask.g.campaign_ctxt.id

    filters = {
        "campaign_id": campaign_id,
        "campaign_scope_id": None,
        "page_size": 10,
        **{f"{x}_id": None for x in FULL_STRUCTURAL_ELEMENT_TYPES},
    }
    # Get requested filters.
    if flask.request.method == "POST":
        if flask.request.form["campaign_scope"] != "None":
            filters["campaign_scope_id"] = flask.request.form["campaign_scope"]
        for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
            filter_value = flask.request.form.get(struct_elmt_type, "None") or "None"
            if filter_value != "None":
                filters[f"{struct_elmt_type}_id"] = filter_value
        if "page_size" in flask.request.form:
            filters["page_size"] = int(flask.request.form["page_size"])
        if "page" in flask.request.form and flask.request.form["page"] != "":
            filters["page"] = int(flask.request.form["page"])
    is_filtered = filters["campaign_scope_id"] is not None or any(
        [filters[f"{x}_id"] is not None for x in FULL_STRUCTURAL_ELEMENT_TYPES]
    )

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=campaign_id, sort="+name"
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    campaign_scopes_by_id = {}
    for campaign_scope in campaign_scopes_resp.data:
        campaign_scopes_by_id[campaign_scope["id"]] = campaign_scope

    structural_elements = {}
    for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
        structural_elements[struct_elmt_type] = (
            getattr(flask.g.api_client, f"{struct_elmt_type}s")
            .getall(campaign_id=campaign_id)
            .data
        )

    try:
        # Get timeseries list applying filters.
        timeseries_resp = flask.g.api_client.timeseries.getall(**filters, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    timeseries_data = deepcopy(timeseries_resp.data)
    for ts_data in timeseries_data:
        ts_data["campaign_scope_name"] = campaign_scopes_by_id[
            ts_data["campaign_scope_id"]
        ]["name"]

    return flask.render_template(
        "pages/timeseries/list.html",
        timeseries=timeseries_data,
        campaign_scopes=campaign_scopes_resp.data,
        filters=filters,
        is_filtered=is_filtered,
        pagination=prepare_pagination(timeseries_resp.pagination),
        structural_elements=structural_elements,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "campaign_id": flask.g.campaign_ctxt.id,
            "campaign_scope_id": flask.request.form["campaign_scope_id"],
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "unit_symbol": flask.request.form["unit_symbol"],
        }
        try:
            ret = flask.g.api_client.timeseries.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="An error occured while creating the timeseries!",
                response=exc.errors,
            )
        else:
            flask.flash(f"New timeseries created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("timeseries.list"))

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=flask.g.campaign_ctxt.id, sort="+name"
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/timeseries/create.html", campaign_scopes=campaign_scopes_resp.data
    )


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(id):
    try:
        properties_resp = flask.g.api_client.timeseries_properties.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)
    available_properties = {x["id"]: x for x in properties_resp.data}

    try:
        property_data_resp = flask.g.api_client.timeseries_property_data.getall(
            **{"timeseries_id": id}
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    properties = {}
    for property in property_data_resp.data:
        ts_property = available_properties.pop(property["property_id"])
        for k, v in ts_property.items():
            if k in property:
                continue
            property[k] = v

        # Get ETag.
        try:
            property_data_resp = flask.g.api_client.timeseries_property_data.getone(
                property["id"]
            )
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, f"{property['name']} property not found!")
        property["etag"] = property_data_resp.etag

        properties[property["property_id"]] = property

    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "unit_symbol": flask.request.form["unit_symbol"],
        }
        try:
            timeseries_resp = flask.g.api_client.timeseries.update(
                id, payload, etag=flask.request.form["editEtag"]
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="An error occured while updating the timeseries!",
                response=exc.errors,
            )
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Timeseries not found!")
        else:
            flask.flash(
                f"{timeseries_resp.data['name']} timeseries updated!", "success"
            )

            # Update property values, only if value has changed.
            for prop_id, prop_data in properties.items():
                payload = {
                    "id": timeseries_resp.data["id"],
                    "property_id": prop_id,
                    "value": flask.request.form[f"property-{prop_id}"],
                }
                if payload["value"] == prop_data["value"]:
                    continue
                try:
                    flask.g.api_client.timeseries_property_data.update(
                        prop_data["id"],
                        payload,
                        etag=flask.request.form[f"property-{prop_id}-etag"],
                    )
                except bac.BEMServerAPIValidationError:
                    flask.flash(
                        f"Error while setting {prop_data['name']} property!", "warning"
                    )
                else:
                    flask.flash(f"{prop_data['name']} property updated!", "success")

            return flask.redirect(flask.url_for("timeseries.list"))

    try:
        timeseries_resp = flask.g.api_client.timeseries.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries not found!")

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getone(
            timeseries_resp.data["campaign_scope_id"]
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    timeseries_data = deepcopy(timeseries_resp.data)
    timeseries_data["campaign_scope_name"] = campaign_scopes_resp.data["name"]

    tab = flask.request.args.get("tab", "general")

    return flask.render_template(
        "pages/timeseries/edit.html",
        timeseries=timeseries_data,
        etag=timeseries_resp.etag,
        properties=properties,
        available_properties=available_properties,
        tab=tab,
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.timeseries.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries not found!")
    else:
        flask.flash("Timeseries deleted!", "success")

    return flask.redirect(flask.url_for("timeseries.list"))


@blp.route("/<int:id>/property", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create_property(id):
    payload = {
        "timeseries_id": id,
        "property_id": flask.request.form["availableProperty"],
        "value": flask.request.form["availablePropertyValue"],
    }
    try:
        flask.g.api_client.timeseries_property_data.create(payload)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while setting the timeseries property value!",
            response=exc.errors,
        )
    else:
        flask.flash("Property value defined!", "success")

    return flask.redirect(flask.url_for("timeseries.edit", id=id, tab="properties"))


@blp.route("/<int:id>/property/<int:property_id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete_property(id, property_id):
    try:
        flask.g.api_client.timeseries_property_data.delete(
            property_id, etag=flask.request.form[f"delPropertyEtag-{property_id}"]
        )
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Property not found!")
    else:
        flask.flash("Property value deleted!", "success")

    return flask.redirect(flask.url_for("timeseries.edit", id=id, tab="properties"))


@blp.route("/manage_structural_elements")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def manage_structural_elements():
    campaign_id = flask.g.campaign_ctxt.id

    # Structural elements tree data.
    sites_tree_data = _build_tree_sites(campaign_id, is_draggable=True)
    # Zones "tree" data.
    zones_tree_data = _build_tree_zones(campaign_id, is_draggable=True)

    return flask.render_template(
        "pages/timeseries/manage_structural_elements.html",
        sites_tree_data=sites_tree_data,
        zones_tree_data=zones_tree_data,
    )


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        try:
            flask.g.api_client.io.upload_timeseries_csv(
                flask.g.campaign_ctxt.id, flask.request.files
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="Error while uploading timeseries files!",
                response=exc.errors,
            )
        else:
            flask.flash("Timeseries uploaded!", "success")
            return flask.redirect(flask.url_for("timeseries.list"))

    return flask.render_template("pages/timeseries/upload.html")

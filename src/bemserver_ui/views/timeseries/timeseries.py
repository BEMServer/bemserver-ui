"""Timeseries views"""

import json
from copy import deepcopy

import flask

from bemserver_api_client.enums import WeatherParameter

from bemserver_ui.common.const import (
    FULL_STRUCTURAL_ELEMENT_TYPES,
    STRUCTURAL_ELEMENT_TYPES,
)
from bemserver_ui.extensions import Roles, auth, ensure_campaign_context

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


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def list():
    campaign_id = flask.g.campaign_ctxt.id

    # Get campaign scopes data.
    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=campaign_id, sort="+name"
    )
    campaign_scopes_by_id = {}
    for campaign_scope in campaign_scopes_resp.data:
        campaign_scopes_by_id[campaign_scope["id"]] = campaign_scope

    # Get timeseries properties.
    ts_props_resp = flask.g.api_client.timeseries_properties.getall()
    ts_props_by_id = {x["id"]: x for x in ts_props_resp.data}

    # Build timeseries filters from query args.
    # `filters` are for API request and `ui_filers` is just values for UI components.
    filters = {
        "campaign_id": campaign_id,
        "campaign_scope_id": None,
        "page_size": 10,
    }
    ui_filters = {}

    # Filter timeseries for a campaign scope only.
    if (
        "campaign_scope_id" in flask.request.args
        and flask.request.args["campaign_scope_id"] != "None"
    ):
        campaign_scope_id = flask.request.args["campaign_scope_id"]
        if campaign_scope_id in [str(x) for x in campaign_scopes_by_id.keys()]:
            filters["campaign_scope_id"] = campaign_scope_id

    # Filter value to search in timeseries name.
    if "in_name" in flask.request.args:
        filters["in_name"] = flask.request.args["in_name"]

    # Filters for timeseries location (site/building..., recursively or not, and zone).
    recurse_prefix = ""
    if "structural_element_recursive" in flask.request.args:
        recurse_prefix = "recurse_"
        ui_filters["structural_element_recursive"] = "on"

    for struct_elmt_type in STRUCTURAL_ELEMENT_TYPES:
        struct_elmt_filter_key = f"{recurse_prefix}{struct_elmt_type}_id"
        if struct_elmt_filter_key in flask.request.args:
            struct_elmt_filter_value = flask.request.args[struct_elmt_filter_key]
            filters[struct_elmt_filter_key] = struct_elmt_filter_value
            ui_filters["structural_element_filter_type"] = struct_elmt_type
            ui_filters["structural_element_filter_id"] = struct_elmt_filter_value

    if "zone_id" in flask.request.args and flask.request.args["zone_id"] != "":
        filters["zone_id"] = flask.request.args["zone_id"]

    # Filters on timeseries properties.
    prop_filters = {}
    for ts_prop_id, ts_prop in ts_props_by_id.items():
        ts_prop_arg_name = f"prop_{ts_prop_id}"
        if ts_prop_arg_name in flask.request.args:
            raw_prop_value = str(flask.request.args[ts_prop_arg_name])
            ui_filters[ts_prop_arg_name] = raw_prop_value
            prop_value = raw_prop_value
            if ts_prop["value_type"] == "boolean":
                prop_value = "true" if prop_value == "on" else "false"
            prop_filters[ts_prop["name"]] = prop_value
    if len(prop_filters.keys()) > 0:
        filters["properties"] = json.dumps(prop_filters)

    are_prop_filters_not_defined = ts_props_by_id.keys() != prop_filters.keys()

    # Query args to set current page and page size.
    if "page_size" in flask.request.args:
        filters["page_size"] = int(flask.request.args["page_size"])
    if "page" in flask.request.args and flask.request.args["page"] != "":
        filters["page"] = int(flask.request.args["page"])

    # Is there any filter value (different then default) defined.
    is_filtered = (
        filters.get("in_name", "") != ""
        or filters["campaign_scope_id"] is not None
        or any(
            [
                filters.get(f"{recurse_prefix}{x}_id") is not None
                or filters.get(f"{x}_id") is not None
                for x in FULL_STRUCTURAL_ELEMENT_TYPES
            ]
        )
        or filters.get("properties", None) is not None
    )

    # Get timeseries list applying filters.
    timeseries_resp = flask.g.api_client.timeseries.getall(**filters, sort="+name")
    timeseries_data = deepcopy(timeseries_resp.data)
    for ts_data in timeseries_data:
        ts_data["campaign_scope_name"] = campaign_scopes_by_id[
            ts_data["campaign_scope_id"]
        ]["name"]

    # Get timeseries data states for stats.
    ts_data_states_resp = flask.g.api_client.timeseries_datastates.getall()

    return flask.render_template(
        "pages/timeseries/list.html",
        timeseries=timeseries_data,
        campaign_scopes=campaign_scopes_resp.data,
        filters={**filters, **ui_filters},
        is_filtered=is_filtered,
        pagination=prepare_pagination(timeseries_resp.pagination),
        ts_data_states=ts_data_states_resp.data,
        ts_properties=ts_props_resp.data,
        are_prop_filters_not_defined=are_prop_filters_not_defined,
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
        ret = flask.g.api_client.timeseries.create(payload)
        flask.flash(f"New timeseries created: {ret.data['name']}", "success", delay=5)
        return flask.redirect(flask.url_for("timeseries.list"))

    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id, sort="+name"
    )

    return flask.render_template(
        "pages/timeseries/create.html", campaign_scopes=campaign_scopes_resp.data
    )


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def edit(id):
    properties_resp = flask.g.api_client.timeseries_properties.getall()
    available_properties = {x["id"]: x for x in properties_resp.data}

    property_data_resp = flask.g.api_client.timeseries_property_data.getall(
        **{"timeseries_id": id}
    )

    properties = {}
    for property in property_data_resp.data:
        ts_property = available_properties.pop(property["property_id"])
        for k, v in ts_property.items():
            if k in property:
                continue
            property[k] = v

        # Get ETag.
        property_data_resp = flask.g.api_client.timeseries_property_data.getone(
            property["id"]
        )
        property["etag"] = property_data_resp.etag

        properties[property["property_id"]] = property

    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "unit_symbol": flask.request.form["unit_symbol"],
        }
        timeseries_resp = flask.g.api_client.timeseries.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        flask.flash(
            f"{timeseries_resp.data['name']} timeseries updated!", "success", delay=5
        )

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
                "timeseries_id": timeseries_resp.data["id"],
                "property_id": prop_id,
                "value": prop_value,
            }
            if payload["value"] == prop_data["value"]:
                continue
            flask.g.api_client.timeseries_property_data.update(
                prop_data["id"],
                payload,
                etag=flask.request.form[f"property-{prop_id}-etag"],
            )
            flask.flash(f"{prop_data['name']} attribute updated!", "success", delay=5)

        return flask.redirect(flask.url_for("timeseries.list"))

    timeseries_resp = flask.g.api_client.timeseries.getone(id)

    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getone(
        timeseries_resp.data["campaign_scope_id"]
    )

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
    flask.g.api_client.timeseries.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("Timeseries deleted!", "success", delay=5)
    return flask.redirect(flask.url_for("timeseries.list"))


@blp.route("/<int:id>/property", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create_property(id):
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
        "timeseries_id": id,
        "property_id": flask.request.form["availableProperty"],
        "value": prop_value,
    }
    flask.g.api_client.timeseries_property_data.create(payload)
    flask.flash("Attribute value defined!", "success", delay=5)

    return flask.redirect(flask.url_for("timeseries.edit", id=id, tab="attributes"))


@blp.route("/<int:id>/property/<int:property_id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete_property(id, property_id):
    flask.g.api_client.timeseries_property_data.delete(
        property_id, etag=flask.request.form[f"delPropertyEtag-{property_id}"]
    )
    flask.flash("Attribute value deleted!", "success", delay=5)
    return flask.redirect(flask.url_for("timeseries.edit", id=id, tab="attributes"))


@blp.route("/manage_structural_elements")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def manage_structural_elements():
    return flask.render_template("pages/timeseries/manage_structural_elements.html")


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        flask.g.api_client.io.upload_timeseries_csv(
            flask.g.campaign_ctxt.id,
            {k: v.stream for k, v in flask.request.files.items()},
        )
        flask.flash("Timeseries uploaded!", "success", delay=5)
        return flask.redirect(flask.url_for("timeseries.list"))

    return flask.render_template("pages/timeseries/upload.html")


@blp.route("/semantic_setup")
@auth.signin_required
@ensure_campaign_context
def semantic_setup():
    energies_resp = flask.g.api_client.energies.getall()
    energy_end_uses_resp = flask.g.api_client.energy_end_uses.getall()
    energy_prod_technos_resp = flask.g.api_client.energy_prod_technologies.getall()

    energy_by_id = {x["id"]: x["name"] for x in energies_resp.data}
    energy_use_by_id = {x["id"]: x["name"] for x in energy_end_uses_resp.data}
    energy_prod_techno_by_id = {
        x["id"]: x["name"] for x in energy_prod_technos_resp.data
    }

    weather_params = {x.name: x.value for x in WeatherParameter}

    return flask.render_template(
        "pages/timeseries/semantic_setup.html",
        energies=energy_by_id,
        energy_end_uses=energy_use_by_id,
        weather_params=weather_params,
        energy_prod_technos=energy_prod_techno_by_id,
    )

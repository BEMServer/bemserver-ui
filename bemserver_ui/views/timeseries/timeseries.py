"""Timeseries views"""
from copy import deepcopy
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("timeseries", __name__, url_prefix="/timeseries")


def prepare_pagination(pagination, nb_total_links=5):
    nb_links_per_side = int(nb_total_links / 2)
    start_nb_links = \
        min([nb_links_per_side, pagination["page"] - pagination["first_page"]])
    end_nb_links = \
        min([nb_links_per_side, pagination["last_page"] - pagination["page"]])

    tmp_start_nb_links = start_nb_links + (nb_links_per_side - end_nb_links)
    end_nb_links = end_nb_links + (nb_links_per_side - start_nb_links)
    start_nb_links = tmp_start_nb_links
    del tmp_start_nb_links

    start_page = 1
    has_start_ellipsis = False
    if "previous_page" in pagination:
        start_page = max([start_page, pagination["page"] - start_nb_links])
        has_start_ellipsis = start_page > pagination["first_page"]

    end_page = pagination["last_page"]
    has_end_ellipsis = False
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

    filters = {"campaign_id": campaign_id, "campaign_scope_id": None, "page_size": 10}
    # Get requested filters.
    if flask.request.method == "POST":
        if flask.request.form["campaign_scope"] != "None":
            filters["campaign_scope_id"] = flask.request.form["campaign_scope"]
        if "page_size" in flask.request.form:
            filters["page_size"] = int(flask.request.form["page_size"])
        if "page" in flask.request.form:
            filters["page"] = int(flask.request.form["page"])
    is_filtered = filters["campaign_scope_id"] is not None

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=campaign_id, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    campaign_scopes_by_id = {}
    for campaign_scope in campaign_scopes_resp.data:
        campaign_scopes_by_id[campaign_scope["id"]] = campaign_scope

    try:
        # Get timeseries list applying filters.
        timeseries_resp = flask.g.api_client.timeseries.getall(
            **filters, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    timeseries_data = deepcopy(timeseries_resp.data)
    for ts_data in timeseries_data:
        ts_data["campaign_scope_name"] = \
            campaign_scopes_by_id[ts_data["campaign_scope_id"]]["name"]

    return flask.render_template(
        "pages/timeseries/list.html", timeseries=timeseries_data,
        campaign_scopes=campaign_scopes_resp.data,
        filters=filters, is_filtered=is_filtered,
        pagination=prepare_pagination(timeseries_resp.pagination))


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required
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
                422, description="An error occured while creating the timeseries!",
                response=exc.errors)
        else:
            flask.flash(f"New timeseries created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("timeseries.list"))

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=flask.g.campaign_ctxt.id, sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/timeseries/create.html", campaign_scopes=campaign_scopes_resp.data)


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "unit_symbol": flask.request.form["unit_symbol"],
        }
        try:
            timeseries_resp = flask.g.api_client.timeseries.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating the timeseries!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Timeseries not found!")
        else:
            flask.flash(
                f"{timeseries_resp.data['name']} timeseries updated!", "success")
            return flask.redirect(flask.url_for("timeseries.list"))

    try:
        timeseries_resp = flask.g.api_client.timeseries.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries not found!")

    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getone(
            timeseries_resp.data["campaign_scope_id"])
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    timeseries_data = deepcopy(timeseries_resp.data)
    timeseries_data["campaign_scope_name"] = campaign_scopes_resp.data["name"]

    return flask.render_template(
        "pages/timeseries/edit.html", timeseries=timeseries_data,
        etag=timeseries_resp.etag)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required
def delete(id):
    try:
        flask.g.api_client.timeseries.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Timeseries not found!")
    else:
        flask.flash("Timeseries deleted!", "success")

    return flask.redirect(flask.url_for("timeseries.list"))

"""Campaigns views"""
import zoneinfo
import flask

import bemserver_api_client.exceptions as bac_exc

from bemserver_ui.extensions import auth, Roles
from bemserver_ui.extensions.campaign_context import (
    deduce_campaign_state,
    CAMPAIGN_STATE_OVERALL,
)
from bemserver_ui.extensions.timezones import get_tz_info
from bemserver_ui.common.time import convert_html_form_datetime, convert_from_iso
from bemserver_ui.common.exceptions import BEMServerUICommonInvalidDatetimeError


blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/", methods=["GET", "POST"])
@auth.signin_required
def list():
    ui_filters = {
        "state": CAMPAIGN_STATE_OVERALL,
        "in_name": None,
    }
    api_filters = {}
    # Get requested filters.
    if flask.request.method == "GET":
        ui_filters["state"] = flask.request.args.get("state", CAMPAIGN_STATE_OVERALL)
        if "in_name" in flask.request.args:
            ui_filters["in_name"] = flask.request.args["in_name"]
            api_filters["in_name"] = ui_filters["in_name"]
    elif flask.request.method == "POST":
        ui_filters["state"] = flask.request.form["state"]
        if flask.request.form["in_name"] != "":
            ui_filters["in_name"] = flask.request.form["in_name"]
            api_filters["in_name"] = ui_filters["in_name"]

    is_filtered = ui_filters["state"] != CAMPAIGN_STATE_OVERALL or (
        ui_filters["in_name"] is not None and ui_filters["in_name"] != ""
    )

    # Get campaign list.
    campaigns_resp = flask.g.api_client.campaigns.getall(
        sort="+name",
        **api_filters,
    )

    campaigns = []
    for x in campaigns_resp.data:
        x["timezone_info"] = get_tz_info(x["timezone"])
        x["state"] = deduce_campaign_state(x)
        if (
            ui_filters["state"] == CAMPAIGN_STATE_OVERALL
            or x["state"] == ui_filters["state"]
        ):
            campaigns.append(x)

    return flask.render_template(
        "pages/campaigns/list.html",
        campaigns=campaigns,
        filters=ui_filters,
        is_filtered=is_filtered,
    )


@blp.route("/<int:id>")
@auth.signin_required
def view(id):
    tab = flask.request.args.get("tab", "general")

    campaign_resp = flask.g.api_client.campaigns.getone(id)

    campaign = campaign_resp.data
    campaign["state"] = deduce_campaign_state(campaign)
    campaign["timezone_info"] = get_tz_info(campaign["timezone"])

    campaign_scopes = []
    ugroups = []
    if flask.session["user"]["data"]["is_admin"]:
        # Get campaign scopes
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(campaign_id=id)
        campaign_scopes = campaign_scopes_resp.data

        # Get campaign's user groups.
        ugroups_resp = flask.g.api_client.user_groups_by_campaigns.getall(
            campaign_id=id
        )
        for x in ugroups_resp.data:
            try:
                ugroup_resp = flask.g.api_client.user_groups.getone(
                    id=x["user_group_id"]
                )
            except bac_exc.BEMServerAPINotFoundError:
                # Here, just ignore if a user group has been deleted.
                pass
            else:
                ugroup_data = ugroup_resp.data
                ugroup_data["rel_id"] = x["id"]
                ugroups.append(ugroup_data)

    return flask.render_template(
        "pages/campaigns/view.html",
        campaign=campaign,
        etag=campaign_resp.etag,
        user_groups=ugroups,
        campaign_scopes=campaign_scopes,
        tab=tab,
    )


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "timezone": flask.request.form["timezone"],
            "description": flask.request.form["description"],
        }
        # Dates/times received from the HTML POST form are not localized and tz-aware.
        tz = zoneinfo.ZoneInfo(payload["timezone"])
        if flask.request.form["start_date"] != "":
            try:
                start_time = convert_html_form_datetime(
                    flask.request.form["start_date"],
                    flask.request.form.get("start_time", "00:00") or "00:00",
                    tz=tz,
                )
            except BEMServerUICommonInvalidDatetimeError:
                flask.abort(422, description="Invalid start datetime!")
            else:
                payload["start_time"] = start_time.isoformat()
        if flask.request.form["end_date"] != "":
            try:
                end_time = convert_html_form_datetime(
                    flask.request.form["end_date"],
                    flask.request.form.get("end_time", "23:59") or "23:59",
                    tz=tz,
                )
            except BEMServerUICommonInvalidDatetimeError:
                flask.abort(422, description="Invalid end datetime!")
            else:
                payload["end_time"] = end_time.isoformat()

        campaign_resp = flask.g.api_client.campaigns.create(payload)
        flask.flash(f"New campaign created: {campaign_resp.data['name']}", "success")
        url_next = flask.request.args.get("next") or flask.url_for("campaigns.list")
        return flask.redirect(url_next)

    return flask.render_template("pages/campaigns/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "timezone": flask.request.form["timezone"],
            "description": flask.request.form["description"],
        }

        # Dates/times received from the HTML POST form are not localized and tz-aware.
        tz = zoneinfo.ZoneInfo(payload["timezone"])
        if flask.request.form["start_date"] != "":
            try:
                start_time = convert_html_form_datetime(
                    flask.request.form["start_date"],
                    flask.request.form.get("start_time", "00:00") or "00:00",
                    tz=tz,
                )
            except BEMServerUICommonInvalidDatetimeError:
                flask.abort(422, description="Invalid start datetime!")
            else:
                payload["start_time"] = start_time.isoformat()
        if flask.request.form["end_date"] != "":
            try:
                end_time = convert_html_form_datetime(
                    flask.request.form["end_date"],
                    flask.request.form.get("end_time", "23:59") or "23:59",
                    tz=tz,
                )
            except BEMServerUICommonInvalidDatetimeError:
                flask.abort(422, description="Invalid end datetime!")
            else:
                payload["end_time"] = end_time.isoformat()

        flask.g.api_client.campaigns.update(
            id, payload, etag=flask.request.form["editEtag"]
        )
        flask.flash("Campaign updated!", "success")
        return flask.redirect(flask.url_for("campaigns.view", id=id))

    campaign_resp = flask.g.api_client.campaigns.getone(id)

    campaign_data = campaign_resp.data
    campaign_tz = zoneinfo.ZoneInfo(campaign_data["timezone"])

    try:
        full_start_time = convert_from_iso(
            campaign_data.get("start_time"), tz=campaign_tz
        )
    except BEMServerUICommonInvalidDatetimeError:
        campaign_data["start_date"] = ""
    else:
        campaign_data["start_date"] = full_start_time.date()
        campaign_data["start_time"] = full_start_time.time().strftime("%H:%M")

    try:
        full_end_time = convert_from_iso(campaign_data.get("end_time"), tz=campaign_tz)
    except BEMServerUICommonInvalidDatetimeError:
        campaign_data["end_date"] = ""
    else:
        campaign_data["end_date"] = full_end_time.date()
        campaign_data["end_time"] = full_end_time.time().strftime("%H:%M")

    return flask.render_template(
        "pages/campaigns/edit.html", campaign=campaign_data, etag=campaign_resp.etag
    )


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    flask.g.api_client.campaigns.delete(id, etag=flask.request.form["delEtag"])
    flask.flash("Campaign deleted!", "success")
    return flask.redirect(flask.url_for("campaigns.list"))


@blp.route("/<int:id>/manage_groups", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def manage_groups(id):
    campaign_resp = flask.g.api_client.campaigns.getone(id)

    if flask.request.method == "POST":
        user_group_ids = [x.split("-")[1] for x in flask.request.form.keys()]
        for user_group_id in user_group_ids:
            flask.g.api_client.user_groups_by_campaigns.create(
                {
                    "campaign_id": id,
                    "user_group_id": user_group_id,
                }
            )
        if len(user_group_ids) > 0:
            flask.flash("User added to selected group(s)!", "success")

    # Get campaign's user groups.
    groups_resp = flask.g.api_client.user_groups_by_campaigns.getall(campaign_id=id)
    groups = []
    group_ids = []
    for x in groups_resp.data:
        group_resp = flask.g.api_client.user_groups.getone(id=x["user_group_id"])
        group_data = group_resp.data
        group_data["rel_id"] = x["id"]
        groups.append(group_data)
        group_ids.append(group_data["id"])

    # Get available groups (all groups - campaign's user groups).
    all_groups_resp = flask.g.api_client.user_groups.getall()
    available_groups = []
    for x in all_groups_resp.data:
        if x["id"] not in group_ids:
            available_groups.append(x)

    return flask.render_template(
        "pages/campaigns/manage_groups.html",
        campaign=campaign_resp.data,
        etag=campaign_resp.etag,
        user_groups=groups,
        available_groups=available_groups,
    )


@blp.route("/<int:id>/remove_user_group", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def remove_user_group(id):
    rel_id = flask.request.args["rel_id"]
    flask.g.api_client.user_groups_by_campaigns.delete(rel_id)
    flask.flash("User group removed from campaign!", "success")
    return flask.redirect(flask.request.args["next"])

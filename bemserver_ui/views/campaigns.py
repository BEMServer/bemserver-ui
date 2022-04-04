"""Campaigns views"""
import datetime as dt
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles


blp = flask.Blueprint("campaigns", __name__, url_prefix="/campaigns")


def convert_form_datetime_to_iso(form_date, form_time, tz=dt.timezone.utc):
    try:
        ret = dt.datetime.strptime(f"{form_date} {form_time}", "%Y-%m-%d %H:%M")
    except (ValueError, TypeError,):
        return None
    else:
        ret = ret.replace(tzinfo=tz)
        return ret.isoformat()


@blp.route("/")
@auth.signin_required(roles=[Roles.admin])
def list():
    try:
        campaigns = flask.g.api_client.campaigns.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    return flask.render_template(
        "pages/campaigns/list.html", campaigns=campaigns.data)


@blp.route("/<int:id>/view")
@auth.signin_required
def view(id):
    try:
        campaign = flask.g.api_client.campaigns.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign not found!")

    return flask.render_template(
        "pages/campaigns/view.html", campaign=campaign.data, etag=campaign.etag)


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }
        start_time = convert_form_datetime_to_iso(
            flask.request.form["start_date"],
            flask.request.form.get("start_time", "00:00") or "00:00")
        end_time = convert_form_datetime_to_iso(
            flask.request.form["end_date"],
            flask.request.form.get("end_time", "23:59") or "23:59")

        if start_time is not None:
            payload["start_time"] = start_time
        if end_time is not None:
            payload["end_time"] = end_time

        try:
            ret = flask.g.api_client.campaigns.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the campaign!",
                response=exc.errors)
        else:
            flask.flash(f"New campaign created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("campaigns.list"))

    return flask.render_template("pages/campaigns/create.html")


@blp.route("/<int:id>/edit", methods=["GET", "POST"])
@auth.signin_required
def edit(id):
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
        }

        start_time = convert_form_datetime_to_iso(
            flask.request.form["start_date"],
            flask.request.form.get("start_time", "00:00") or "00:00")
        end_time = convert_form_datetime_to_iso(
            flask.request.form["end_date"],
            flask.request.form.get("end_time", "23:59") or "23:59")

        if start_time is not None:
            payload["start_time"] = start_time
        if end_time is not None:
            payload["end_time"] = end_time

        try:
            campaign = flask.g.api_client.campaigns.update(
                id, payload, etag=flask.request.form["editEtag"])
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while updating the campaign!",
                response=exc.errors)
        except bac.BEMServerAPINotFoundError:
            flask.abort(404, description="Campaign not found!")
        else:
            flask.flash("Campaign updated!", "success")
            return flask.redirect(flask.url_for("campaigns.view", id=id))

    try:
        campaign = flask.g.api_client.campaigns.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign not found!")

    campaign_data = campaign.data
    try:
        full_start_time = dt.datetime.fromisoformat(campaign_data["start_time"])
    except (KeyError, ValueError, TypeError,):
        campaign_data["start_date"] = ""
    else:
        campaign_data["start_date"] = full_start_time.date()
        campaign_data["start_time"] = full_start_time.time().strftime("%H:%M")
    try:
        full_end_time = dt.datetime.fromisoformat(campaign_data["end_time"])
    except (KeyError, ValueError, TypeError,):
        campaign_data["end_date"] = ""
    else:
        campaign_data["end_date"] = full_end_time.date()
        campaign_data["end_time"] = full_end_time.time().strftime("%H:%M")

    return flask.render_template(
        "pages/campaigns/edit.html", campaign=campaign_data, etag=campaign.etag)


@blp.route("/<int:id>/delete", methods=["POST"])
@auth.signin_required(roles=[Roles.admin])
def delete(id):
    try:
        flask.g.api_client.campaigns.delete(id, etag=flask.request.form["delEtag"])
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Campaign not found!")
    else:
        flask.flash("Campaign deleted!", "success")

    return flask.redirect(flask.url_for("campaigns.list"))

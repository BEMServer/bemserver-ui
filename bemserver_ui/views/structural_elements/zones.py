"""Zones views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("zones", __name__, url_prefix="/zones")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "campaign_id": flask.g.campaign_ctxt.id,
        }
        try:
            ret = flask.g.api_client.zones.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the zone!",
                response=exc.errors)
        else:
            flask.flash(f"New zone created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("structural_elements.manage"))

    return flask.render_template("pages/structural_elements/zones/create.html")

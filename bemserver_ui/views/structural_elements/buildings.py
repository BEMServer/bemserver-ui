"""Buildings views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("buildings", __name__, url_prefix="/buildings")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "site_id": flask.request.form["site"],
        }
        try:
            ret = flask.g.api_client.buildings.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the building!",
                response=exc.errors)
        else:
            flask.flash(f"New building created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("structural_elements.manage"))

    try:
        sites_resp = flask.g.api_client.sites.getall(sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    return flask.render_template(
        "pages/structural_elements/buildings/create.html", sites=sites_resp.data)

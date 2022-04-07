"""Spaces views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, Roles, ensure_campaign_context


blp = flask.Blueprint("spaces", __name__, url_prefix="/spaces")


@blp.route("/create", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def create():
    if flask.request.method == "POST":
        payload = {
            "name": flask.request.form["name"],
            "description": flask.request.form["description"],
            "storey_id": flask.request.form["storey"],
        }
        try:
            ret = flask.g.api_client.spaces.create(payload)
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422, description="An error occured while creating the space!",
                response=exc.errors)
        else:
            flask.flash(f"New space created: {ret.data['name']}", "success")
            return flask.redirect(flask.url_for("structural_elements.manage"))

    try:
        storeys_resp = flask.g.api_client.storeys.getall(sort="+name")
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    return flask.render_template(
        "pages/structural_elements/spaces/create.html", storeys=storeys_resp.data)

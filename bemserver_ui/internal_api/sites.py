"""Sites internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("sites", __name__, url_prefix="/sites")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        site_resp = flask.g.api_client.sites.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Site not found!")

    try:
        site_property_data_resp = \
            flask.g.api_client.site_property_data.getall(site_id=id)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while retrieving site property data!",
            response=exc.errors)

    return flask.jsonify({
        "type": "site",
        "general": site_resp.data,
        "properties": site_property_data_resp.data,
    })

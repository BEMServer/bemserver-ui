"""Spaces internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("spaces", __name__, url_prefix="/spaces")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        space_resp = flask.g.api_client.spaces.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Space not found!")

    try:
        space_property_data_resp = \
            flask.g.api_client.space_property_data.getall(zone_id=id)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while retrieving space property data!",
            response=exc.errors)

    return flask.jsonify({
        "type": "space",
        "general": space_resp.data,
        "properties": space_property_data_resp.data,
    })

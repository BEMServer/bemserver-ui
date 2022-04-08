"""Buildings internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("buildings", __name__, url_prefix="/buildings")


@blp.route("/<int:id>/retrieve_data")
@auth.signin_required
@ensure_campaign_context
def retrieve_data(id):
    try:
        building_resp = flask.g.api_client.buildings.getone(id)
    except bac.BEMServerAPINotFoundError:
        flask.abort(404, description="Building not found!")

    try:
        building_property_data_resp = \
            flask.g.api_client.building_property_data.getall(zone_id=id)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422, description="An error occured while retrieving building property data!",
            response=exc.errors)

    return flask.jsonify({
        "type": "building",
        "general": building_resp.data,
        "properties": building_property_data_resp.data,
    })

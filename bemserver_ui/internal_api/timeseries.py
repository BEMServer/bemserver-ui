"""Timeseries internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("timeseries", __name__, url_prefix="/timeseries")


@blp.route("/<int:id>/properties")
@auth.signin_required
@ensure_campaign_context
def retrieve_property_data(id):
    try:
        properties_resp = flask.g.api_client.timeseries_properties.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)
    available_properties = {}
    for property in properties_resp.data:
        available_properties[property["id"]] = property

    try:
        property_data_resp = \
            flask.g.api_client.timeseries_property_data.getall(**{"timeseries_id": id})
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, response=exc.errors)

    properties = []
    for property in property_data_resp.data:
        ts_property = available_properties.pop(property["property_id"])
        for k, v in ts_property.items():
            if k in property:
                continue
            property[k] = v
        properties.append(property)

    return flask.jsonify(properties)

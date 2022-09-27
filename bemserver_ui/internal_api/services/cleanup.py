"""Cleanup service internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth


blp = flask.Blueprint("cleanup", __name__, url_prefix="/cleanup")


@blp.route("/", methods=["POST"])
@auth.signin_required
def enable():
    payload = {
        "campaign_id": flask.request.json["campaign_id"],
        "is_enabled": flask.request.json["is_enabled"],
    }
    try:
        cleanup_resp = flask.g.api_client.st_cleanup_by_campaign.create(payload)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while trying to enable the cleanup service!",
            response=exc.errors,
        )
    return flask.jsonify(cleanup_resp.toJSON())


@blp.route("/<int:id>/", methods=["PUT"])
@auth.signin_required
def update_state(id):
    payload = {"is_enabled": flask.request.json["is_enabled"]}
    etag = flask.request.headers["ETag"]
    try:
        cleanup_resp = flask.g.api_client.st_cleanup_by_campaign.update(
            id,
            payload,
            etag=etag,
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(
            422,
            description="Error while trying to update cleanup service state!",
            response=exc.errors,
        )
    return flask.jsonify(cleanup_resp.toJSON())

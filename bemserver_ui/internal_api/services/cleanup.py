"""Cleanup service internal API"""
import flask

from bemserver_ui.extensions import auth


blp = flask.Blueprint("cleanup", __name__, url_prefix="/cleanup")


@blp.route("/", methods=["POST"])
@auth.signin_required
def enable():
    payload = {
        "campaign_id": flask.request.json["campaign_id"],
        "is_enabled": flask.request.json["is_enabled"],
    }
    cleanup_resp = flask.g.api_client.st_cleanup_by_campaign.create(payload)
    return flask.jsonify(cleanup_resp.toJSON())


@blp.route("/<int:id>/", methods=["PUT"])
@auth.signin_required
def update_state(id):
    payload = {"is_enabled": flask.request.json["is_enabled"]}
    etag = flask.request.headers["ETag"]
    cleanup_resp = flask.g.api_client.st_cleanup_by_campaign.update(
        id,
        payload,
        etag=etag,
    )
    return flask.jsonify(cleanup_resp.toJSON())

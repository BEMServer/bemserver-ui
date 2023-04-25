"""Download weather data service internal API"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("weather_data", __name__, url_prefix="/weather_data")


@blp.route("/list")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    filters = {
        "campaign_id": flask.g.campaign_ctxt.id,
    }
    if "in_site_name" in flask.request.args:
        filters["in_site_name"] = flask.request.args["in_site_name"]
    if "is_enabled" in flask.request.args:
        filters["is_enabled"] = flask.request.args["is_enabled"]
    # Get download weather data service state for each site of current campaign.
    service_resp = flask.g.api_client.st_download_weather_by_site.get_full(
        sort="+site_name",
        **filters,
    )
    return flask.jsonify(service_resp.data)


@blp.route("/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_one(id):
    # Get weather data service state.
    service_resp = flask.g.api_client.st_download_weather_by_site.getone(id=id)
    return flask.jsonify(service_resp.toJSON())


@blp.route("/", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def enable():
    payload = {
        "site_id": flask.request.json["site_id"],
        "is_enabled": flask.request.json["is_enabled"],
    }
    service_resp = flask.g.api_client.st_download_weather_by_site.create(payload)
    return flask.jsonify(service_resp.toJSON())


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required
@ensure_campaign_context
def update_state(id):
    payload = {"is_enabled": flask.request.json["is_enabled"]}
    etag = flask.request.headers["ETag"]
    service_resp = flask.g.api_client.st_download_weather_by_site.update(
        id,
        payload,
        etag=etag,
    )
    return flask.jsonify(service_resp.toJSON())

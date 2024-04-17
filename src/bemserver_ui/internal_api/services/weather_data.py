"""Download weather data service internal API"""

import flask

from bemserver_ui.extensions import auth, ensure_campaign_context

blp = flask.Blueprint("weather_data", __name__, url_prefix="/weather_data")


def _retrieve_list(forecast=False):
    filters = {
        "campaign_id": flask.g.campaign_ctxt.id,
    }
    if "in_site_name" in flask.request.args:
        filters["in_site_name"] = flask.request.args["in_site_name"]
    if "is_enabled" in flask.request.args:
        filters["is_enabled"] = flask.request.args["is_enabled"]

    # Get download weather data service state for each site of current campaign.
    api_resource_name = f"st_download_weather{'_forecast' if forecast else ''}_by_site"
    api_resource = getattr(flask.g.api_client, api_resource_name)
    service_resp = api_resource.get_full(sort="+site_name", **filters)

    return flask.jsonify(service_resp.data)


def _retrieve_one(id, forecast=False):
    # Get weather data service state.
    api_resource_name = f"st_download_weather{'_forecast' if forecast else ''}_by_site"
    api_resource = getattr(flask.g.api_client, api_resource_name)
    service_resp = api_resource.getone(id=id)

    return flask.jsonify(service_resp.toJSON())


def _enable(forecast=False):
    payload = {
        "site_id": flask.request.json["site_id"],
        "is_enabled": flask.request.json["is_enabled"],
    }

    api_resource_name = f"st_download_weather{'_forecast' if forecast else ''}_by_site"
    api_resource = getattr(flask.g.api_client, api_resource_name)
    service_resp = api_resource.create(payload)

    return flask.jsonify(service_resp.toJSON())


def _update_state(id, forecast=False):
    payload = {"is_enabled": flask.request.json["is_enabled"]}
    etag = flask.request.headers["ETag"]

    api_resource_name = f"st_download_weather{'_forecast' if forecast else ''}_by_site"
    api_resource = getattr(flask.g.api_client, api_resource_name)
    service_resp = api_resource.update(id, payload, etag=etag)

    return flask.jsonify(service_resp.toJSON())


@blp.route("/list")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    return _retrieve_list()


@blp.route("/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_one(id):
    return _retrieve_one(id)


@blp.route("/", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def enable():
    return _enable()


@blp.route("/<int:id>", methods=["PUT"])
@auth.signin_required
@ensure_campaign_context
def update_state(id):
    return _update_state(id)


@blp.route("/forecast/list")
@auth.signin_required
@ensure_campaign_context
def retrieve_forecast_list():
    return _retrieve_list(forecast=True)


@blp.route("/forecast/<int:id>")
@auth.signin_required
@ensure_campaign_context
def retrieve_forecast_one(id):
    return _retrieve_one(id, forecast=True)


@blp.route("/forecast/", methods=["POST"])
@auth.signin_required
@ensure_campaign_context
def forecast_enable():
    return _enable(forecast=True)


@blp.route("/forecast/<int:id>", methods=["PUT"])
@auth.signin_required
@ensure_campaign_context
def forecast_update_state(id):
    return _update_state(id, forecast=True)

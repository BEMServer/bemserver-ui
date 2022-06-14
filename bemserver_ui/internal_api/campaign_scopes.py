"""Campaign scopes internal API"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("campaign_scopes", __name__, url_prefix="/campaign_scopes")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    try:
        campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=flask.g.campaign_ctxt.id, sort="+name"
        )
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    campaign_scopes_data = campaign_scopes_resp.toJSON()

    return flask.jsonify(campaign_scopes_data)

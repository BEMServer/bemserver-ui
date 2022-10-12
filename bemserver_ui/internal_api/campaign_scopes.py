"""Campaign scopes internal API"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("campaign_scopes", __name__, url_prefix="/campaign_scopes")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def retrieve_list():
    campaign_scopes_resp = flask.g.api_client.campaign_scopes.getall(
        campaign_id=flask.g.campaign_ctxt.id, sort="+name"
    )
    return flask.jsonify(campaign_scopes_resp.toJSON())

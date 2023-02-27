"""Index page"""
import flask

from bemserver_api_client import __version__ as api_client_version

import bemserver_ui
from bemserver_ui.extensions import auth
from bemserver_ui.extensions.campaign_context import CampaignState
from bemserver_ui.extensions.plugins import PLUGINS_LOADED
from bemserver_ui.common.const import (
    BEMSERVER_APP_LABELS,
    FULL_STRUCTURAL_ELEMENT_TYPES,
)


blp = flask.Blueprint("main", __name__)


def init_app(app):
    app.register_blueprint(blp)


@blp.route("/")
@blp.route("/index")
@auth.signin_required
def index():
    if flask.g.campaign_ctxt.has_campaign:
        return flask.redirect(flask.url_for("structural_elements.explore"))
    return flask.redirect(
        flask.url_for("campaigns.list", state=CampaignState.ongoing.value)
    )


@blp.route("/home")
@auth.signin_required
def home():

    campaign_scopes_count_overall = 0
    cs_resp = flask.g.api_client.campaign_scopes.getall()
    campaign_scopes_count_overall = len(cs_resp.data)

    campaign_scopes_count = 0
    if flask.g.campaign_ctxt.has_campaign:
        cs_resp = flask.g.api_client.campaign_scopes.getall(
            campaign_id=flask.g.campaign_ctxt.id,
        )
        campaign_scopes_count = len(cs_resp.data)

    ts_count_overall = 0
    ts_resp = flask.g.api_client.timeseries.getall(page_size=1)
    ts_count_overall = ts_resp.pagination["total"]

    ts_count = 0
    if flask.g.campaign_ctxt.has_campaign:
        ts_resp = flask.g.api_client.timeseries.getall(
            page_size=1,
            campaign_id=flask.g.campaign_ctxt.id,
        )
        ts_count = ts_resp.pagination["total"]

    struct_elmt_count_overall = {x: 0 for x in FULL_STRUCTURAL_ELEMENT_TYPES}
    struct_elmt_count = {x: 0 for x in FULL_STRUCTURAL_ELEMENT_TYPES}
    for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
        api_resource = getattr(flask.g.api_client, f"{struct_elmt_type}s")
        struct_elmt_resp = api_resource.getall()
        struct_elmt_count_overall[struct_elmt_type] = len(struct_elmt_resp.data)
        if flask.g.campaign_ctxt.has_campaign:
            struct_elmt_resp = api_resource.getall(
                campaign_id=flask.g.campaign_ctxt.id,
            )
            struct_elmt_count[struct_elmt_type] = len(struct_elmt_resp.data)

    return flask.render_template(
        "pages/home.html",
        campaign_scopes_count_overall=campaign_scopes_count_overall,
        campaign_scopes_count=campaign_scopes_count,
        ts_count_overall=ts_count_overall,
        ts_count=ts_count,
        structural_element_types=FULL_STRUCTURAL_ELEMENT_TYPES,
        structural_element_count_overall=struct_elmt_count_overall,
        structural_element_count=struct_elmt_count,
    )


@blp.route("/about")
@auth.signin_required
def about():
    about_resp = flask.g.api_client.about.getall()

    about_versions = {}
    for app_name, app_version in about_resp.data["versions"].items():
        about_versions[BEMSERVER_APP_LABELS[app_name]] = app_version
    about_versions["API client"] = api_client_version
    about_versions["UI"] = bemserver_ui.__version__

    plugin_infos = {}
    for plugin_module in PLUGINS_LOADED:
        plugin_info = plugin_module.PLUGIN_INFO
        plugin_info["version"] = plugin_module.__version__
        plugin_infos[plugin_info["label"]] = plugin_info

    return flask.render_template(
        "pages/about.html",
        about_versions=about_versions,
        plugin_infos=plugin_infos,
    )

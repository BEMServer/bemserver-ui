"""Index page"""
import flask

import bemserver_ui
import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth
from bemserver_ui.common.const import (
    BEMSERVER_APP_LABELS,
    FULL_STRUCTURAL_ELEMENT_TYPES,
)


blp = flask.Blueprint("main", __name__)


@blp.route("/")
@blp.route("/index")
@blp.route("/home")
@auth.signin_required
def index():

    campaign_scopes_count_overall = 0
    try:
        cs_resp = flask.g.api_client.campaign_scopes.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)
    else:
        campaign_scopes_count_overall = len(cs_resp.data)

    campaign_scopes_count = 0
    if flask.g.campaign_ctxt.has_campaign:
        try:
            cs_resp = flask.g.api_client.campaign_scopes.getall(
                campaign_id=flask.g.campaign_ctxt.id,
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, description=exc.errors)
        else:
            campaign_scopes_count = len(cs_resp.data)

    ts_count_overall = 0
    try:
        ts_resp = flask.g.api_client.timeseries.getall(page_size=1)
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)
    else:
        ts_count_overall = ts_resp.pagination["total"]

    ts_count = 0
    if flask.g.campaign_ctxt.has_campaign:
        try:
            ts_resp = flask.g.api_client.timeseries.getall(
                page_size=1,
                campaign_id=flask.g.campaign_ctxt.id,
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, description=exc.errors)
        else:
            ts_count = ts_resp.pagination["total"]

    struct_elmt_count_overall = {x: 0 for x in FULL_STRUCTURAL_ELEMENT_TYPES}
    struct_elmt_count = {x: 0 for x in FULL_STRUCTURAL_ELEMENT_TYPES}
    for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
        api_resource = getattr(flask.g.api_client, f"{struct_elmt_type}s")
        try:
            struct_elmt_resp = api_resource.getall()
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(422, description=exc.errors)
        else:
            struct_elmt_count_overall[struct_elmt_type] = len(struct_elmt_resp.data)
        if flask.g.campaign_ctxt.has_campaign:
            try:
                struct_elmt_resp = api_resource.getall(
                    campaign_id=flask.g.campaign_ctxt.id,
                )
            except bac.BEMServerAPIValidationError as exc:
                flask.abort(422, description=exc.errors)
            else:
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
    try:
        about_resp = flask.g.api_client.about.getall()
    except bac.BEMServerAPIValidationError as exc:
        flask.abort(422, description=exc.errors)

    about_versions = {}
    for app_name, app_version in about_resp.data["versions"].items():
        about_versions[BEMSERVER_APP_LABELS[app_name]] = app_version
    about_versions["UI"] = bemserver_ui.__version__

    return flask.render_template("pages/about.html", about_versions=about_versions)

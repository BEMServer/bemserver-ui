"""Timeseries data views"""
import flask

import bemserver_ui.extensions.api_client as bac
from bemserver_ui.extensions import auth, ensure_campaign_context, Roles


blp = flask.Blueprint("timeseries_data", __name__, url_prefix="/timeseries_data")


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        try:
            flask.g.api_client.timeseries_data.upload_csv_by_names(
                flask.g.campaign_ctxt.id,
                flask.request.form["data_state"],
                flask.request.files,
            )
        except bac.BEMServerAPIValidationError as exc:
            flask.abort(
                422,
                description="Error while uploading file for timeseries data!",
                response=exc.errors,
            )
        else:
            flask.flash("Timeseries data uploaded!", "success")
            return flask.redirect(
                flask.url_for(flask.request.args.get("next") or "main.index")
            )

    ts_datastates_resp = flask.g.api_client.timeseries_datastates.getall(sort="+name")

    return flask.render_template(
        "pages/timeseries/data/upload.html",
        ts_datastates=ts_datastates_resp.data,
    )


@blp.route("/explore")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template("pages/timeseries/data/explore.html")

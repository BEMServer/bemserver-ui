"""Timeseries data views"""
import datetime as dt
import zoneinfo
import flask

from bemserver_api_client.enums import DataFormat, Aggregation
from bemserver_ui.extensions import auth, ensure_campaign_context, Roles
from bemserver_ui.common.tools import is_filestream_empty


blp = flask.Blueprint("timeseries_data", __name__, url_prefix="/timeseries_data")


@blp.route("/upload", methods=["GET", "POST"])
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def upload():
    if flask.request.method == "POST":
        for up_filename, up_filestream in flask.request.files.items():
            if not is_filestream_empty(up_filestream):
                flask.g.api_client.timeseries_data.upload_by_names(
                    flask.g.campaign_ctxt.id,
                    flask.request.form["data_state"],
                    up_filestream.stream.read(),
                    format=DataFormat.csv,
                )
                flask.flash(
                    f"Timeseries data uploaded from {up_filestream.filename}",
                    "success",
                )
            else:
                flask.flash(f"{up_filename} is empty!", "warning")
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


@blp.route("/completeness")
@auth.signin_required
@ensure_campaign_context
def completeness():
    return flask.render_template(
        "pages/timeseries/data/completeness.html",
        dt_end=dt.datetime.now(tz=zoneinfo.ZoneInfo(flask.g.campaign_ctxt.tz_name)),
    )


@blp.route("/<int:id>/download")
@auth.signin_required
@ensure_campaign_context
def download(id):
    data_state_id = flask.request.args["data_state"]
    start_time = flask.request.args["start_time"]
    end_time = flask.request.args["end_time"]

    aggregation = flask.request.args.get("agg")
    if aggregation == "none":
        aggregation = None
    duration = flask.request.args.get("duration")

    ts_resp = flask.g.api_client.timeseries.getone(id=id)

    if aggregation is not None and duration is not None:
        ts_data_csv = flask.g.api_client.timeseries_data.download_aggregate_by_names(
            flask.g.campaign_ctxt.id,
            start_time,
            end_time,
            data_state_id,
            [ts_resp.data["name"]],
            duration,
            aggregation=Aggregation(aggregation),
            format=DataFormat.csv,
        )
    else:
        ts_data_csv = flask.g.api_client.timeseries_data.download_by_names(
            flask.g.campaign_ctxt.id,
            start_time,
            end_time,
            data_state_id,
            [ts_resp.data["name"]],
            format=DataFormat.csv,
        )

    return ts_data_csv.send_file()


@blp.route("/delete")
@auth.signin_required(roles=[Roles.admin])
@ensure_campaign_context
def delete():
    # Just render page. Delete is performed with internal API call from JS module.
    return flask.render_template("pages/timeseries/data/delete.html")

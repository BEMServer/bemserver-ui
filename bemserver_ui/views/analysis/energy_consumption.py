"""Energy consumption analysis views"""
import flask

from bemserver_ui.extensions import auth, ensure_campaign_context


blp = flask.Blueprint("energy_consumption", __name__, url_prefix="/energy_consumption")


@blp.route("/")
@auth.signin_required
@ensure_campaign_context
def explore():
    return flask.render_template("pages/analysis/energy_consumption/explore.html")


@blp.route("/setup/<string:structural_element_type>/<int:structural_element_id>")
@auth.signin_required
@ensure_campaign_context
def setup(structural_element_type, structural_element_id):
    api_resource = getattr(flask.g.api_client, f"{structural_element_type}s")
    if structural_element_type == "site":
        struct_elmt_resp = api_resource.getone(id=structural_element_id)
        struct_elmt = struct_elmt_resp.data
        struct_elmt["type"] = structural_element_type
    else:
        # As we must check non sites's campaign (see below), we can not just getone...
        struct_elmt_resp = api_resource.getall(campaign_id=flask.g.campaign_ctxt.id)
        struct_elmt = None
        for cur_struct_elmt in struct_elmt_resp.data:
            if cur_struct_elmt["id"] == structural_element_id:
                struct_elmt = cur_struct_elmt
                struct_elmt["type"] = structural_element_type
                struct_elmt["campaign_id"] = flask.g.campaign_ctxt.id
                break

    # Check if campaign context is equal to this structural element campaign.
    #  Yes -> continue. No -> redirect to energy consumption explore page.
    if struct_elmt is None or struct_elmt["campaign_id"] != flask.g.campaign_ctxt.id:
        return flask.redirect(flask.url_for("analysis.energy_consumption.explore"))

    energy_sources_resp = flask.g.api_client.energy_sources.getall()
    energy_end_uses_resp = flask.g.api_client.energy_end_uses.getall()

    api_resource = getattr(
        flask.g.api_client,
        f"energy_cons_ts_by_{structural_element_type}s",
    )
    all_energy_cons_ts_resp = api_resource.getall(
        **{f"{structural_element_type}_id": structural_element_id}
    )

    energy_source_by_id = {x["id"]: x["name"] for x in energy_sources_resp.data}
    energy_use_by_id = {x["id"]: x["name"] for x in energy_end_uses_resp.data}

    ener_cons_config = {}
    defined_energy_sources = []
    defined_energy_uses = []
    for x in all_energy_cons_ts_resp.data:
        if x["source_id"] not in defined_energy_sources:
            defined_energy_sources.append(x["source_id"])
            ener_cons_config[x["source_id"]] = {
                "energy_source_id": x["source_id"],
                "energy_source_name": energy_source_by_id[x["source_id"]],
                "energy_uses": {},
            }
        if x["end_use_id"] not in defined_energy_uses:
            defined_energy_uses.append(x["end_use_id"])

        if x["end_use_id"] not in ener_cons_config[x["source_id"]]["energy_uses"]:
            # get timeseries name and unit symbol
            ts_resp = flask.g.api_client.timeseries.getone(x["timeseries_id"])
            ener_cons_config[x["source_id"]]["energy_uses"][x["end_use_id"]] = {
                "energy_use_id": x["end_use_id"],
                "energy_use_name": energy_use_by_id[x["end_use_id"]],
                "id": x["id"],
                "ts_id": x["timeseries_id"],
                "ts_name": ts_resp.data["name"],
                "ts_unit": ts_resp.data["unit_symbol"],
                "etag": api_resource.getone(x["id"]).etag,
            }

    for x in ener_cons_config.values():
        for energy_use_id, energy_use_name in energy_use_by_id.items():
            if energy_use_id not in x["energy_uses"]:
                x["energy_uses"][energy_use_id] = {
                    "energy_use_id": energy_use_id,
                    "energy_use_name": energy_use_name,
                    "id": None,
                    "ts_id": None,
                    "ts_name": None,
                    "ts_unit": None,
                    "etag": None,
                }

    available_energy_sources = []
    for x in energy_sources_resp.data:
        if x["id"] not in defined_energy_sources:
            available_energy_sources.append(x["id"])

    return flask.render_template(
        "pages/analysis/energy_consumption/setup.html",
        structural_element=struct_elmt,
        ener_cons_config=ener_cons_config,
        all_energy_sources=energy_source_by_id,
        defined_energy_sources=defined_energy_sources,
        available_energy_sources=available_energy_sources,
        all_energy_end_uses=energy_use_by_id,
        defined_energy_uses=defined_energy_uses,
    )

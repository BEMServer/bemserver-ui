"""A bunch of functions that automatically inject current campaign data
in urls and requests.
"""
import functools
import datetime as dt
import zoneinfo
import enum
import flask
from flask import url_for as flask_url_for
import werkzeug.exceptions as wexc

import bemserver_api_client.exceptions as bac


CAMPAIGN_CONTEXT_QUERY_ARG_NAME = "campaign_ctxt"
CAMPAIGN_STATE_OVERALL = "overall"


class CampaignState(enum.Enum):
    ongoing = "ongoing"
    closed = "closed"


def deduce_campaign_state(campaign_data, dt_now=None):
    campaign_tz = zoneinfo.ZoneInfo(campaign_data["timezone"])
    if dt_now is None:
        dt_now = dt.datetime.now(tz=campaign_tz)
    campaign_state = CampaignState.ongoing.value
    end_time = campaign_data.get("end_time")
    if end_time is not None:
        dt_end_time = dt.datetime.fromisoformat(end_time).astimezone(campaign_tz)
        if dt_end_time < dt_now:
            campaign_state = CampaignState.closed.value
    return campaign_state


class CampaignContext:
    def __init__(self, campaign_id=None):
        self.id = int(campaign_id) if campaign_id is not None else campaign_id
        self._load_campaigns()
        self._campaign = self._load_campaign()

    @property
    def campaign_states(self):
        return [x.value for x in CampaignState]

    @property
    def campaign_state_overall(self):
        return CAMPAIGN_STATE_OVERALL

    @property
    def campaigns(self):
        return self.campaigns_by_state[CAMPAIGN_STATE_OVERALL]

    @property
    def campaigns_by_state(self):
        return flask.session.get(
            "campaigns",
            {CAMPAIGN_STATE_OVERALL: [], **{x.value: [] for x in CampaignState}},
        )

    @property
    def has_campaign(self):
        return self._campaign is not None and self._campaign["data"] is not None

    @property
    def campaign(self):
        if self._campaign is not None:
            return self._campaign["data"]
        return None

    @property
    def tz_name(self):
        if self._campaign is not None:
            return self._campaign["data"]["timezone"]
        return flask.current_app.config.get("BEMSERVER_TIMEZONE_NAME") or "UTC"

    @property
    def name(self):
        if self._campaign is not None:
            return self._campaign["data"]["name"]
        return None

    def _load_campaigns(self):
        try:
            campaigns_resp = flask.g.api_client.campaigns.getall(
                sort="+name", etag=flask.session.get("campaigns_etag")
            )
        except bac.BEMServerAPINotModified:
            pass
        else:
            campaigns = {
                CAMPAIGN_STATE_OVERALL: [],
                **{x.value: [] for x in CampaignState},
            }
            dt_now = dt.datetime.now(tz=dt.timezone.utc)
            for campaign_data in campaigns_resp.data:
                campaign_state = deduce_campaign_state(campaign_data, dt_now)
                campaign_data["state"] = campaign_state
                campaigns[CAMPAIGN_STATE_OVERALL].append(campaign_data)
                campaigns[campaign_state].append(campaign_data)

            flask.session["campaigns"] = campaigns
            flask.session["campaigns_etag"] = campaigns_resp.etag

    def _load_campaign(self):
        if self.id is not None:
            try:
                campaign_resp = flask.g.api_client.campaigns.getone(self.id)
            except bac.BEMServerAPINotFoundError:
                pass
            else:
                campaign = campaign_resp.toJSON()
                campaign["data"]["state"] = deduce_campaign_state(campaign["data"])
                return campaign
        return None

    def get_data_for(self, campaign_id):
        for campaign in self.campaigns:
            if campaign["id"] == campaign_id:
                return campaign
        return None

    def toJSON(self):
        # Allows to set this response instance in a serializable object.
        return {
            "has_campaign": self.has_campaign,
            "tz_name": self.tz_name,
            "id": self.id,
            "name": self.name,
            "campaign": self.campaign,
        }


# Inspired from https://stackoverflow.com/a/57491317
def url_for_campaign(endpoint, **kwargs):
    if endpoint == "static":
        ignore_campaign = True
    else:
        ignore_campaign = kwargs.pop("ignore_campaign", False)

    forced_campaign = kwargs.pop("forced_campaign", None)

    if not ignore_campaign:
        if forced_campaign is not None:
            kwargs[CAMPAIGN_CONTEXT_QUERY_ARG_NAME] = forced_campaign
        elif (
            hasattr(flask.g, CAMPAIGN_CONTEXT_QUERY_ARG_NAME)
            and flask.g.campaign_ctxt.has_campaign
        ):
            kwargs[CAMPAIGN_CONTEXT_QUERY_ARG_NAME] = flask.g.campaign_ctxt.id

    return flask_url_for(endpoint, **kwargs)


def init_app(app):
    @app.before_request
    def load_campaign_context():
        if "user" in flask.session and flask.request.endpoint not in (
            "static",
            "flask_es6_endpoints",
            "es6_signed_user",
            "generate_timezones_es6_module",
        ):
            try:
                flask.g.campaign_ctxt = CampaignContext(
                    flask.request.args.get("forced_campaign", None)
                    or flask.request.args.get(CAMPAIGN_CONTEXT_QUERY_ARG_NAME)
                )
            except bac.BEMServerAPIAuthenticationError as exc:
                # XXX: Case of deactivated user while already using app.
                raise wexc.Unauthorized from exc

    # Monkey patch flask.url_for used in jinja templates.
    app.jinja_env.globals["url_for"] = url_for_campaign

    # Monkey patch main flask.url_for function.
    flask.url_for = url_for_campaign


def ensure_campaign_context(func=None):
    """Ensure that decorated view is loaded while a campaign is selected."""

    def ensure_campaign_context_internal(func):
        @functools.wraps(func)
        def decorated(*args, **kwargs):

            if not flask.g.campaign_ctxt.has_campaign:
                return flask.redirect(flask.url_for("main.index"))

            return func(*args, **kwargs)

        return decorated

    if func is not None:
        return ensure_campaign_context_internal(func)
    return ensure_campaign_context_internal

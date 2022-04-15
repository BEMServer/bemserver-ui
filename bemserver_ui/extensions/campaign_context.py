"""A bunch of functions that automatically inject current campaign data
in urls and requests.
"""
import functools
import flask
from flask import url_for as flask_url_for

import bemserver_ui.extensions.api_client.exceptions as bac


class CampaignContext:

    def __init__(self, campaign_id=None):
        self.id = campaign_id
        self._load_campaigns()
        self._load_campaign()

    @property
    def campaigns(self):
        return flask.session.get("campaigns", [])

    @property
    def has_campaign(self):
        return self._campaign is not None and self._campaign.data is not None

    @property
    def campaign(self):
        if self._campaign is not None:
            return self._campaign.data
        return None

    @property
    def name(self):
        if self._campaign is not None:
            return self._campaign.data["name"]
        return None

    def _load_campaigns(self):
        try:
            campaigns = flask.g.api_client.campaigns.getall(
                sort="+name", etag=flask.session.get("campaigns_etag"))
        except bac.BEMServerAPINotModified:
            pass
        else:
            flask.session["campaigns"] = campaigns.data
            flask.session["campaigns_etag"] = campaigns.etag

    def _load_campaign(self):
        self._campaign = None
        if self.id is not None:
            try:
                self._campaign = flask.g.api_client.campaigns.getone(self.id)
            except bac.BEMServerAPINotFoundError:
                pass


# Inspired from https://stackoverflow.com/a/57491317
def url_for_campaign(endpoint, **kwargs):

    if endpoint == "static":
        ignore_campaign = True
    else:
        ignore_campaign = kwargs.pop("ignore_campaign", False)

    forced_campaign = kwargs.pop("forced_campaign", None)

    if not ignore_campaign:
        if forced_campaign is not None:
            kwargs["campaign"] = forced_campaign
        elif flask.g.campaign_ctxt.has_campaign:
            kwargs["campaign"] = flask.g.campaign_ctxt.id

    return flask_url_for(endpoint, **kwargs)


def init_app(app):

    @app.before_request
    def load_campaign_context():
        if ("user" in flask.session and flask.request.endpoint != "static"
                and not flask.request.endpoint.startswith("api.")):
            flask.g.campaign_ctxt = CampaignContext(
                flask.request.args.get("forced_campaign", None)
                or flask.request.args.get("campaign")
            )

    # Monkey patch flask.url_for used in jinja templates.
    @app.context_processor
    def monkeypatch_url_for():
        return dict(url_for=url_for_campaign)

    # Monkey patch main flask.url_for function.
    flask.url_for = url_for_campaign


def ensure_campaign_context(func=None, has_campaign=True):
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

"""Extensions campaign context tests"""

import datetime as dt
import zoneinfo as zi

import pytest

import flask

from bemserver_ui.extensions.campaign_context import (
    CAMPAIGN_CONTEXT_QUERY_ARG_NAME,
    CAMPAIGN_STATE_OVERALL,
    FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME,
    IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME,
    CampaignContext,
    CampaignState,
    deduce_campaign_state,
    url_for_campaign,
)

CAMPAIGN_DATA_1 = {
    "description": "Nobatek buildings energy performance contracting",
    "id": 1,
    "name": "Nobatek offices EPC",
    "start_time": "2020-01-01T00:00:00+00:00",
    "timezone": "Europe/Paris",
    "state": CampaignState.ongoing.value,
}
CAMPAIGN_DATA_2 = {
    "description": "Innovative windows assessment",
    "end_time": "2022-06-30T22:00:00+00:00",
    "id": 2,
    "name": "BET windows tests",
    "start_time": "2021-05-31T22:00:00+00:00",
    "timezone": "Europe/Samara",
    "state": CampaignState.closed.value,
}


class CampaignContextMock(CampaignContext):
    def __init__(self, campaign_id=None):
        self._campaign_1 = {
            "data": CAMPAIGN_DATA_1,
            "etag": "44e37fe34654dfff82c4e157ca28847f0ac39e5d",
        }
        self._campaign_2 = {
            "data": CAMPAIGN_DATA_2,
            "etag": "238c65e33b4b3d5cc219f85329b34a8261b29dd6",
        }

        super().__init__(campaign_id=campaign_id)

    @property
    def campaigns_by_state(self):
        return self._campaigns

    @property
    def tz_name(self):
        if self._campaign is not None:
            return self._campaign["data"]["timezone"]
        return "UTC"

    def _load_campaigns(self):
        self._campaigns = {
            CAMPAIGN_STATE_OVERALL: [CAMPAIGN_DATA_1, CAMPAIGN_DATA_2],
            CampaignState.ongoing.value: [CAMPAIGN_DATA_1],
            CampaignState.closed.value: [CAMPAIGN_DATA_2],
        }

    def _load_campaign(self):
        campaign = None
        if self.id == 1:
            campaign = self._campaign_1
        elif self.id == 2:
            campaign = self._campaign_2
        return campaign


class TestExtensionCampaignContext:
    def test_deduce_campaign_state(self):
        tz_name = "Europe/Paris"
        tz = zi.ZoneInfo(tz_name)
        dt_now = dt.datetime.now(tz=tz)
        dt_end = dt.datetime(dt_now.year - 1, 1, 1, tzinfo=tz)

        campaign_data = {
            "timezone": tz_name,
            "end_time": dt_end.isoformat(),
        }
        assert deduce_campaign_state(campaign_data) == CampaignState.closed.value

        dt_end += dt.timedelta(days=1000)
        campaign_data["end_time"] = dt_end.isoformat()
        assert deduce_campaign_state(campaign_data) == CampaignState.ongoing.value

        campaign_data.pop("end_time")
        assert "end_time" not in campaign_data
        assert deduce_campaign_state(campaign_data) == CampaignState.ongoing.value

        for tz_name, exp_exc in [
            (None, TypeError),
            (666, TypeError),
            ("bad_tz", zi.ZoneInfoNotFoundError),
        ]:
            with pytest.raises(exp_exc):
                deduce_campaign_state({"timezone": tz_name})

    def test_campaign_states(self):
        assert CAMPAIGN_STATE_OVERALL == "overall"
        assert len(list(CampaignState)) == 2
        assert CampaignState.ongoing.value == "ongoing"
        assert CampaignState.closed.value == "closed"

    def test_campaign_ctxt_mock(self):
        campaign_ctxt = CampaignContextMock()
        assert campaign_ctxt.campaign_states == ["ongoing", "closed"]
        assert campaign_ctxt.campaign_state_overall == CAMPAIGN_STATE_OVERALL
        assert campaign_ctxt.campaigns == [CAMPAIGN_DATA_1, CAMPAIGN_DATA_2]
        assert (
            campaign_ctxt.campaigns
            == campaign_ctxt.campaigns_by_state[CAMPAIGN_STATE_OVERALL]
        )
        assert campaign_ctxt.campaigns_by_state[CampaignState.ongoing.value] == [
            CAMPAIGN_DATA_1
        ]
        assert campaign_ctxt.campaigns_by_state[CampaignState.closed.value] == [
            CAMPAIGN_DATA_2
        ]
        assert campaign_ctxt.id is None
        assert not campaign_ctxt.has_campaign
        assert campaign_ctxt.campaign is None
        assert campaign_ctxt.tz_name == "UTC"
        assert campaign_ctxt.name is None
        assert campaign_ctxt.toJSON() == {
            "has_campaign": False,
            "tz_name": "UTC",
            "id": None,
            "name": None,
            "campaign": None,
        }

        ret = campaign_ctxt.get_data_for(666)
        assert ret is None
        ret = campaign_ctxt.get_data_for(1)
        assert ret == CAMPAIGN_DATA_1

        campaign_ctxt = CampaignContextMock(666)
        assert campaign_ctxt.campaigns == [CAMPAIGN_DATA_1, CAMPAIGN_DATA_2]
        assert campaign_ctxt.campaigns_by_state[CampaignState.ongoing.value] == [
            CAMPAIGN_DATA_1
        ]
        assert campaign_ctxt.campaigns_by_state[CampaignState.closed.value] == [
            CAMPAIGN_DATA_2
        ]
        assert campaign_ctxt.id == 666
        assert not campaign_ctxt.has_campaign
        assert campaign_ctxt.campaign is None
        assert campaign_ctxt.tz_name == "UTC"
        assert campaign_ctxt.name is None
        assert campaign_ctxt.toJSON() == {
            "has_campaign": False,
            "tz_name": "UTC",
            "id": 666,
            "name": None,
            "campaign": None,
        }

        campaign_ctxt = CampaignContextMock(1)
        assert campaign_ctxt.campaigns == [CAMPAIGN_DATA_1, CAMPAIGN_DATA_2]
        assert campaign_ctxt.campaigns_by_state[CampaignState.ongoing.value] == [
            CAMPAIGN_DATA_1
        ]
        assert campaign_ctxt.campaigns_by_state[CampaignState.closed.value] == [
            CAMPAIGN_DATA_2
        ]
        assert campaign_ctxt.id == 1
        assert campaign_ctxt.has_campaign
        assert campaign_ctxt.campaign == CAMPAIGN_DATA_1
        assert campaign_ctxt.tz_name == CAMPAIGN_DATA_1["timezone"]
        assert campaign_ctxt.name == CAMPAIGN_DATA_1["name"]
        assert campaign_ctxt.toJSON() == {
            "has_campaign": True,
            "tz_name": CAMPAIGN_DATA_1["timezone"],
            "id": 1,
            "name": CAMPAIGN_DATA_1["name"],
            "campaign": CAMPAIGN_DATA_1,
        }

    def test_url_for_campaign_override(self, app):
        assert flask.url_for == url_for_campaign

        with app.app_context():
            assert app.jinja_env.globals["url_for"] == url_for_campaign

    def test_url_for_campaign_static_resources(self, app):
        # campaign context should never affect static resources
        with app.app_context():
            # 1. no campaign context
            flask.g.campaign_ctxt = CampaignContextMock()
            assert not flask.g.campaign_ctxt.has_campaign

            assert (
                url_for_campaign("static", **{"filename": "images/bemserver.svg"})
                == "http://localhost/static/images/bemserver.svg"
            )

            # forced_campaign_ctxt does nothing on static resources
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                    },
                )
                == "http://localhost/static/images/bemserver.svg"
            )
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                        "whatever": "nevermind",
                    },
                )
                == "http://localhost/static/images/bemserver.svg?whatever=nevermind"
            )

            # manual campaign_ctxt does nothing on static resources
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                        "whatever": "nevermind",
                    },
                )
                == "http://localhost/static/images/bemserver.svg?whatever=nevermind"
            )

            # 2. campaign context
            flask.g.campaign_ctxt = CampaignContextMock(1)
            assert flask.g.campaign_ctxt.has_campaign

            assert (
                url_for_campaign("static", **{"filename": "images/bemserver.svg"})
                == "http://localhost/static/images/bemserver.svg"
            )

            # forced_campaign_ctxt does nothing on static resources
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                    },
                )
                == "http://localhost/static/images/bemserver.svg"
            )
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                        "whatever": "nevermind",
                    },
                )
                == "http://localhost/static/images/bemserver.svg?whatever=nevermind"
            )

            # manual campaign_ctxt does nothing on static resources
            assert (
                url_for_campaign(
                    "static",
                    **{
                        "filename": "images/bemserver.svg",
                        CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                        "whatever": "nevermind",
                    },
                )
                == "http://localhost/static/images/bemserver.svg?whatever=nevermind"
            )

    def test_url_for_campaign_non_static_resources(self, app):
        # campaign context must always affect non static resources
        with app.app_context():
            # 1. no campaign context
            flask.g.campaign_ctxt = CampaignContextMock()
            assert not flask.g.campaign_ctxt.has_campaign

            assert url_for_campaign("timeseries.list") == "http://localhost/timeseries/"
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        "whatever": "nevermind",
                    },
                )
                == "http://localhost/timeseries/?whatever=nevermind"
            )

            # forced_campaign_ctxt defines query arg on non static resources
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                    },
                )
                == f"http://localhost/timeseries/?{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=42"
            )
            assert url_for_campaign(
                "timeseries.list",
                **{
                    "whatever": "nevermind",
                    FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                },
            ) == (
                "http://localhost/timeseries/?whatever=nevermind"
                f"&{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=42"
            )
            # ignore_campaign_ctxt take hold of forced_campaign_ctxt
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        "whatever": "nevermind",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                        IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: True,
                    },
                )
                == "http://localhost/timeseries/?whatever=nevermind"
            )

            # manual campaign_ctxt defines query arg on non static resources
            assert url_for_campaign(
                "timeseries.list",
                **{
                    CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                },
            ) == (f"http://localhost/timeseries/?{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1")
            assert url_for_campaign(
                "timeseries.list",
                **{
                    "whatever": "nevermind",
                    CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 1,
                },
            ) == (
                "http://localhost/timeseries/?whatever=nevermind"
                f"&{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1"
            )

            # 2. campaign context
            flask.g.campaign_ctxt = CampaignContextMock(1)
            assert flask.g.campaign_ctxt.has_campaign

            assert url_for_campaign("timeseries.list") == (
                f"http://localhost/timeseries/?{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1"
            )
            assert url_for_campaign(
                "timeseries.list",
                **{
                    "whatever": "nevermind",
                },
            ) == (
                "http://localhost/timeseries/?whatever=nevermind"
                f"&{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1"
            )

            # forced_campaign_ctxt take hold of context on non static resources
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                    },
                )
                == f"http://localhost/timeseries/?{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=42"
            )
            assert url_for_campaign(
                "timeseries.list",
                **{
                    "whatever": "nevermind",
                    FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                },
            ) == (
                "http://localhost/timeseries/?whatever=nevermind"
                f"&{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=42"
            )

            # ignore_campaign_ctxt to not apply context
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        "whatever": "nevermind",
                        IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: True,
                    },
                )
                == "http://localhost/timeseries/?whatever=nevermind"
            )

            # ignore_campaign_ctxt take hold of forced_campaign_ctxt
            assert (
                url_for_campaign(
                    "timeseries.list",
                    **{
                        "whatever": "nevermind",
                        FORCED_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                        IGNORE_CAMPAIGN_CONTEXT_QUERY_ARG_NAME: True,
                    },
                )
                == "http://localhost/timeseries/?whatever=nevermind"
            )

            # manual campaign_ctxt is replaced by context
            assert url_for_campaign(
                "timeseries.list",
                **{
                    CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                },
            ) == (f"http://localhost/timeseries/?{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1")
            assert url_for_campaign(
                "timeseries.list",
                **{
                    "whatever": "nevermind",
                    CAMPAIGN_CONTEXT_QUERY_ARG_NAME: 42,
                },
            ) == (
                "http://localhost/timeseries/?whatever=nevermind"
                f"&{CAMPAIGN_CONTEXT_QUERY_ARG_NAME}=1"
            )

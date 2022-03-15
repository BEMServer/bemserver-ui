"""BEMServer API client"""
import abc
import requests
import flask
from io import BytesIO
from apiclient import APIClient


class BaseResources(abc.ABC):
    endpoint_uri = None

    def __init__(self, apicli):
        super().__init__()
        self._apicli = apicli

    def enpoint_uri_by_id(self, id):
        return f"{self.endpoint_uri}{id}"

    def getall(self, *, etag=None, **kwargs):
        return self._apicli._getall(self.endpoint_uri, etag=etag, **kwargs)

    def getone(self, id, *, etag=None):
        return self._apicli._getone(self.enpoint_uri_by_id(id), etag=etag)

    def create(self, payload):
        return self._apicli._create(self.endpoint_uri, payload)

    def update(self, id, payload, *, etag=None):
        return self._apicli._update(self.enpoint_uri_by_id(id), payload, etag=etag)

    def delete(self, id, *, etag=None):
        return self._apicli._delete(self.enpoint_uri_by_id(id), etag=etag)


class UserByCampaignResources(BaseResources):
    endpoint_uri = "/usersbycampaigns/"

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError


class TimeseriesDataStateResources(BaseResources):
    endpoint_uri = "/timeseries_data_states/"


class TimeseriesPropertyResources(BaseResources):
    endpoint_uri = "/timeseries_properties/"


class TimeseriesPropertyDataResources(BaseResources):
    endpoint_uri = "/timeseries_property_data/"


class TimeseriesDataResources:
    endpoint_uri = "/timeseries-data/"
    endpoint_uri_agg = f"{endpoint_uri}aggregate"

    def __init__(self, apicli):
        self._apicli = apicli

    @property
    def _auth(self):
        if "auth_data" in flask.session:
            # HTTP basic auth.
            if flask.current_app.config["BEMSERVER_API_AUTH_METHOD"] == "http_basic":
                return (
                    flask.session["auth_data"]["email"],
                    flask.session["auth_data"]["password"]
                )
        return None

    @staticmethod
    def _process_errors(response):
        from . import process_client_error
        from .exceptions import BEMServerClientError

        if response.status_code < 200 or response.status_code >= 300:
            status_code = response.status_code
            if 300 <= status_code < 400:
                # Issue in BEMServer UI
                flask.abort(500, "A server error occured.")
            elif 400 <= status_code < 500:
                kwargs = {
                    "message": (
                        f"{status_code} Error: {response.reason} "
                        f"for url: {response.url}"
                    ),
                    "status_code": status_code,
                    "info": response.text,
                    "json": response.json(),
                }
                process_client_error(BEMServerClientError(**kwargs))
            elif 500 <= status_code < 600:
                # Issue in BEMServer
                flask.abort(500, "A server error occured. Please try again later.")

    def _send_file(self, raw_response):
        # Unpack content disposition header.
        raw_dispos = raw_response.headers["Content-Disposition"].split("; ")
        dispositions = {}
        for raw_dispo in raw_dispos:
            tmp = raw_dispo.split("=")
            if len(tmp) == 2:
                dispositions[tmp[0]] = tmp[1]
            else:
                dispositions[tmp[0]] = True
        # Build file response.
        as_attachment = dispositions.get("attachement", True)
        filename = dispositions.get("filename", "file")
        return flask.send_file(
            BytesIO(raw_response.content), download_name=filename,
            as_attachment=as_attachment)

    def upload_csv(self, data_state, csv_file):
        try:
            response = requests.post(
                self._apicli._build_uri(self.endpoint_uri),
                params={"data_state": data_state},
                files=csv_file,
                auth=self._auth)
        except Exception:
            # Server unreachable, content not parsable. There is not much we can do.
            flask.abort(500, "A server error occured. Please try again later.")
        self._process_errors(response)
        return response

    def download_csv(self, start_time, end_time, data_state, timeseries_ids):
        try:
            response = requests.get(
                self._apicli._build_uri(self.endpoint_uri),
                params={"start_time": start_time, "end_time": end_time,
                        "data_state": data_state, "timeseries": timeseries_ids},
                auth=self._auth)
        except Exception:
            # Server unreachable, content not parsable. There is not much we can do.
            flask.abort(500, "A server error occured. Please try again later.")
        self._process_errors(response)
        return self._send_file(response)

    def download_csv_aggregate(
            self, start_time, end_time, data_state, timeseries_ids, bucket_width,
            timezone="UTC", aggregation="avg"):
        try:
            response = requests.get(
                self._apicli._build_uri(self.endpoint_uri_agg),
                params={"start_time": start_time, "end_time": end_time,
                        "data_state": data_state, "timeseries": timeseries_ids,
                        "bucket_width": bucket_width, "timezone": timezone,
                        "aggregation": aggregation},
                auth=self._auth)
        except Exception:
            # Server unreachable, content not parsable. There is not much we can do.
            flask.abort(500, "A server error occured. Please try again later.")
        self._process_errors(response)
        return self._send_file(response)


class TimeseriesResources(BaseResources):
    endpoint_uri = "/timeseries/"


class TimeseriesGroupByUserResources(BaseResources):
    endpoint_uri = "/timeseries_groups_by_users/"

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError


class TimeseriesGroupByCampaignResources(BaseResources):
    endpoint_uri = "/timeseries_groups_by_campaigns/"

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError


class TimeseriesGroupResources(BaseResources):
    endpoint_uri = "/timeseries_groups/"


class UserResources(BaseResources):
    endpoint_uri = "/users/"

    def set_admin(self, id, state, *, etag=None):
        return self._apicli._update(
            self.enpoint_uri_by_id(id), {"value": state}, etag=etag)

    def set_active(self, id, state, *, etag=None):
        return self._apicli._update(
            self.enpoint_uri_by_id(id), {"value": state}, etag=etag)


class CampaignResources(BaseResources):
    endpoint_uri = "/campaigns/"


class EventStateResources(BaseResources):
    endpoint_uri = "/event_states/"

    def getone(self, id, *, etag=None):
        raise NotImplementedError

    def create(self, payload, *, etag=None):
        raise NotImplementedError

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError

    def delete(self, id, *, etag=None):
        raise NotImplementedError


class EventLevelResources(BaseResources):
    endpoint_uri = "/event_levels/"

    def getone(self, id, *, etag=None):
        raise NotImplementedError

    def create(self, payload, *, etag=None):
        raise NotImplementedError

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError

    def delete(self, id, *, etag=None):
        raise NotImplementedError


class EventCategoryResources(BaseResources):
    endpoint_uri = "/event_categories/"

    def getone(self, id, *, etag=None):
        raise NotImplementedError

    def create(self, payload, *, etag=None):
        raise NotImplementedError

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError

    def delete(self, id, *, etag=None):
        raise NotImplementedError


class EventChannelByUserResources(BaseResources):
    endpoint_uri = "/event_channels_by_users/"

    def __init__(self, apicli):
        self._apicli = apicli

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError


class EventChannelByCampaignResources:
    endpoint_uri = "/event_channels_by_campaigns/"

    def __init__(self, apicli):
        self._apicli = apicli

    def update(self, id, payload, *, etag=None):
        raise NotImplementedError


class EventChannelResources(BaseResources):
    endpoint_uri = "/event_channels/"


class EventResources(BaseResources):
    endpoint_uri = "/events/"


class BEMServerApiClient(APIClient):
    """API client"""

    _ETAG_HEADER_BY_HTTP_METHOD = {
        "get": "If-None-Match",
        "put": "If-Match",
        "delete": "If-Match",
    }

    def __init__(self, base_uri, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.base_uri = base_uri
        self.users = UserResources(self)
        self.campaigns = CampaignResources(self)
        self.users_bycampaigns = UserByCampaignResources(self)
        self.timeseries = TimeseriesResources(self)
        self.timeseries_groups = TimeseriesGroupResources(self)
        self.timeseries_groups_byusers = TimeseriesGroupByUserResources(self)
        self.timeseries_groups_bycampaigns = TimeseriesGroupByCampaignResources(self)
        self.timeseries_datastates = TimeseriesDataStateResources(self)
        self.timeseries_properties = TimeseriesPropertyResources(self)
        self.timeseries_propertiesdata = TimeseriesPropertyDataResources(self)
        self.timeseries_data = TimeseriesDataResources(self)
        self.events = EventResources(self)
        self.event_states = EventStateResources(self)
        self.event_levels = EventLevelResources(self)
        self.event_categories = EventCategoryResources(self)
        self.event_channels = EventChannelResources(self)
        self.event_channels_byusers = EventChannelByUserResources(self)
        self.event_channels_bycampaigns = EventChannelByCampaignResources(self)

    def _build_uri(self, endpoint_uri):
        return f"{self.base_uri}{endpoint_uri}"

    def _prepare_etag_header(self, http_method, etag):
        etag_header = {}
        if etag is not None:
            try:
                etag_header = {
                    self._ETAG_HEADER_BY_HTTP_METHOD[http_method.lower()]: etag}
            except KeyError:
                pass
        return etag_header

    def _getall(self, endpoint, *, etag=None, **kwargs):
        headers = self._prepare_etag_header("get", etag)
        return self.get(self._build_uri(endpoint), params=kwargs, headers=headers)

    def _getone(self, endpoint, *, etag=None):
        headers = self._prepare_etag_header("get", etag)
        return self.get(self._build_uri(endpoint), headers=headers)

    def _create(self, endpoint, payload):
        return self.post(self._build_uri(endpoint), data=payload)

    def _update(self, endpoint, payload, etag):
        headers = self._prepare_etag_header("put", etag)
        return self.put(self._build_uri(endpoint), data=payload, headers=headers)

    def _delete(self, endpoint, etag):
        headers = self._prepare_etag_header("delete", etag)
        return self.delete(self._build_uri(endpoint), headers=headers)

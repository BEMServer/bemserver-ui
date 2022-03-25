"""BEMServer API client resources"""
import abc


class BaseResources(abc.ABC):
    endpoint_base_uri = None
    disabled_endpoints = []

    def __init__(self, request_manager):
        self._req = request_manager

    def _verify_disabled(self, endpoint_name):
        if endpoint_name in self.disabled_endpoints:
            raise NotImplementedError(
                f"{self.__class__.__name__}.{endpoint_name} is disabled!")

    def enpoint_uri_by_id(self, id):
        return f"{self.endpoint_base_uri}{id}"

    def getall(self, *, etag=None, **kwargs):
        self._verify_disabled("getall")
        return self._req.getall(self.endpoint_base_uri, etag=etag, params=kwargs)

    def getone(self, id, *, etag=None):
        self._verify_disabled("getone")
        return self._req.getone(self.enpoint_uri_by_id(id), etag=etag)

    def create(self, payload):
        self._verify_disabled("create")
        return self._req.create(self.endpoint_base_uri, payload)

    def update(self, id, payload, *, etag=None):
        self._verify_disabled("update")
        return self._req.update(self.enpoint_uri_by_id(id), payload, etag=etag)

    def delete(self, id, *, etag=None):
        self._verify_disabled("delete")
        return self._req.delete(self.enpoint_uri_by_id(id), etag=etag)


class UserResources(BaseResources):
    endpoint_base_uri = "/users/"

    def set_admin(self, id, state, *, etag=None):
        endpoint = f"{self.enpoint_uri_by_id(id)}/set_admin"
        return self._req.update(endpoint, {"value": state}, etag=etag)

    def set_active(self, id, state, *, etag=None):
        endpoint = f"{self.enpoint_uri_by_id(id)}/set_active"
        return self._req.update(endpoint, {"value": state}, etag=etag)


class UserGroupResources(BaseResources):
    endpoint_base_uri = "/user_groups/"


class UserByUserGroupResources(BaseResources):
    endpoint_base_uri = "/users_by_user_groups/"
    disabled_endpoints = ["update"]


class CampaignResources(BaseResources):
    endpoint_base_uri = "/campaigns/"


class UserGroupByCampaignResources(BaseResources):
    endpoint_base_uri = "/user_groups_by_campaigns/"
    disabled_endpoints = ["update"]


class CampaignScopeResources(BaseResources):
    endpoint_base_uri = "/campaign_scopes/"


class TimeseriesResources(BaseResources):
    endpoint_base_uri = "/timeseries/"


class TimeseriesDataStateResources(BaseResources):
    endpoint_base_uri = "/timeseries_data_states/"


class TimeseriesPropertyResources(BaseResources):
    endpoint_base_uri = "/timeseries_properties/"


class TimeseriesPropertyDataResources(BaseResources):
    endpoint_base_uri = "/timeseries_property_data/"


class TimeseriesDataResources(BaseResources):
    endpoint_base_uri = "/timeseries-data/"
    disabled_endpoints = ["getall", "getone", "create", "update", "delete"]

    def upload_csv(self, data_state, csv_file):
        q_params = {"data_state": data_state}
        return self._req.upload(
            self.endpoint_base_uri, params=q_params, files=csv_file)

    def download_csv(self, start_time, end_time, data_state, timeseries_ids):
        q_params = {
            "start_time": start_time, "end_time": end_time,
            "data_state": data_state, "timeseries": timeseries_ids,
        }
        return self._req.download(self.endpoint_base_uri, params=q_params)

    def download_csv_aggregate(
            self, start_time, end_time, data_state, timeseries_ids, bucket_width,
            timezone="UTC", aggregation="avg"):
        q_params = {
            "start_time": start_time, "end_time": end_time,
            "data_state": data_state, "timeseries": timeseries_ids,
            "bucket_width": bucket_width, "timezone": timezone,
            "aggregation": aggregation,
        }
        return self._req.download(
            f"{self.endpoint_base_uri}aggregate", params=q_params)


class EventStateResources(BaseResources):
    endpoint_base_uri = "/event_states/"
    disabled_endpoints = ["getone", "create", "update", "delete"]


class EventLevelResources(BaseResources):
    endpoint_base_uri = "/event_levels/"
    disabled_endpoints = ["getone", "create", "update", "delete"]


class EventCategoryResources(BaseResources):
    endpoint_base_uri = "/event_categories/"
    disabled_endpoints = ["getone", "create", "update", "delete"]


class EventResources(BaseResources):
    endpoint_base_uri = "/events/"
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
                f"{self.__class__.__name__}.{endpoint_name} is disabled!"
            )

    def enpoint_uri_by_id(self, id):
        return f"{self.endpoint_base_uri}{str(id)}"

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


class AboutResources(BaseResources):
    endpoint_base_uri = "/about/"
    disabled_endpoints = ["getone", "create", "update", "delete"]


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


class UserGroupByCampaignScopeResources(BaseResources):
    endpoint_base_uri = "/user_groups_by_campaign_scopes/"
    disabled_endpoints = ["update"]


class TimeseriesResources(BaseResources):
    endpoint_base_uri = "/timeseries/"


class TimeseriesDataStateResources(BaseResources):
    endpoint_base_uri = "/timeseries_data_states/"


class TimeseriesPropertyResources(BaseResources):
    endpoint_base_uri = "/timeseries_properties/"


class TimeseriesPropertyDataResources(BaseResources):
    endpoint_base_uri = "/timeseries_property_data/"


class TimeseriesDataResources(BaseResources):
    endpoint_base_uri = "/timeseries_data/"
    disabled_endpoints = ["getall", "getone", "create", "update", "delete"]

    def enpoint_uri_by_campaign(self, campaign_id):
        return f"{self.endpoint_base_uri}campaign/{str(campaign_id)}/"

    def upload_csv(self, data_state, csv_file):
        return self._req.upload(
            self.endpoint_base_uri,
            params={"data_state": data_state},
            files=csv_file,
        )

    def upload_csv_by_names(self, campaign_id, data_state, csv_file):
        return self._req.upload(
            self.enpoint_uri_by_campaign(campaign_id),
            params={"data_state": data_state},
            files=csv_file,
        )

    def download_csv(
        self,
        start_time,
        end_time,
        data_state,
        timeseries_ids,
    ):
        return self._req.download(
            self.endpoint_base_uri,
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_ids,
            },
        )

    def download_csv_by_names(
        self,
        campaign_id,
        start_time,
        end_time,
        data_state,
        timeseries_names,
    ):
        return self._req.download(
            self.enpoint_uri_by_campaign(campaign_id),
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_names,
            },
        )

    def download_csv_aggregate(
        self,
        start_time,
        end_time,
        data_state,
        timeseries_ids,
        bucket_width,
        timezone="UTC",
        aggregation="avg",
    ):
        return self._req.download(
            f"{self.endpoint_base_uri}aggregate",
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_ids,
                "bucket_width": bucket_width,
                "timezone": timezone,
                "aggregation": aggregation,
            },
        )

    def download_csv_aggregate_by_names(
        self,
        campaign_id,
        start_time,
        end_time,
        data_state,
        timeseries_names,
        bucket_width,
        timezone="UTC",
        aggregation="avg",
    ):
        return self._req.download(
            f"{self.enpoint_uri_by_campaign(campaign_id)}aggregate",
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_names,
                "bucket_width": bucket_width,
                "timezone": timezone,
                "aggregation": aggregation,
            },
        )

    def delete(self, start_time, end_time, data_state, timeseries_ids):
        return self._req._execute(
            "DELETE",
            self.endpoint_base_uri,
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_ids,
            },
        )

    def delete_by_names(
        self,
        campaign_id,
        start_time,
        end_time,
        data_state,
        timeseries_names,
    ):
        return self._req._execute(
            "DELETE",
            self.endpoint_uri_by_campaign(campaign_id),
            params={
                "start_time": start_time,
                "end_time": end_time,
                "data_state": data_state,
                "timeseries": timeseries_names,
            },
        )


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


class SiteResources(BaseResources):
    endpoint_base_uri = "/sites/"


class BuildingResources(BaseResources):
    endpoint_base_uri = "/buildings/"


class StoreyResources(BaseResources):
    endpoint_base_uri = "/storeys/"


class SpaceResources(BaseResources):
    endpoint_base_uri = "/spaces/"


class ZoneResources(BaseResources):
    endpoint_base_uri = "/zones/"


class StructuralElementPropertyResources(BaseResources):
    endpoint_base_uri = "/structural_element_properties/"


class SitePropertyResources(BaseResources):
    endpoint_base_uri = "/site_properties/"
    disabled_endpoints = ["update"]


class BuildingPropertyResources(BaseResources):
    endpoint_base_uri = "/building_properties/"
    disabled_endpoints = ["update"]


class StoreyPropertyResources(BaseResources):
    endpoint_base_uri = "/storey_properties/"
    disabled_endpoints = ["update"]


class SpacePropertyResources(BaseResources):
    endpoint_base_uri = "/space_properties/"
    disabled_endpoints = ["update"]


class ZonePropertyResources(BaseResources):
    endpoint_base_uri = "/zone_properties/"
    disabled_endpoints = ["update"]


class SitePropertyDataResources(BaseResources):
    endpoint_base_uri = "/site_property_data/"


class BuildingPropertyDataResources(BaseResources):
    endpoint_base_uri = "/building_property_data/"


class StoreyPropertyDataResources(BaseResources):
    endpoint_base_uri = "/storey_property_data/"


class SpacePropertyDataResources(BaseResources):
    endpoint_base_uri = "/space_property_data/"


class ZonePropertyDataResources(BaseResources):
    endpoint_base_uri = "/zone_property_data/"


class TimeseriesBySiteResources(BaseResources):
    endpoint_base_uri = "/timeseries_by_sites/"
    disabled_endpoints = ["update"]


class TimeseriesByBuildingResources(BaseResources):
    endpoint_base_uri = "/timeseries_by_buildings/"
    disabled_endpoints = ["update"]


class TimeseriesByStoreyResources(BaseResources):
    endpoint_base_uri = "/timeseries_by_storeys/"
    disabled_endpoints = ["update"]


class TimeseriesBySpaceResources(BaseResources):
    endpoint_base_uri = "/timeseries_by_spaces/"
    disabled_endpoints = ["update"]


class TimeseriesByZoneResources(BaseResources):
    endpoint_base_uri = "/timeseries_by_zones/"
    disabled_endpoints = ["update"]


class IOResources(BaseResources):
    endpoint_base_uri = "/io/"
    disabled_endpoints = ["getall", "getone", "create", "update", "delete"]

    def upload_timeseries_csv(self, campaign_id, timeseries_csv):
        endpoint = f"{self.endpoint_base_uri}timeseries"
        q_params = {"campaign_id": campaign_id}
        return self._req.upload(endpoint, params=q_params, files=timeseries_csv)

    def upload_sites_csv(self, campaign_id, csv_files):
        endpoint = f"{self.endpoint_base_uri}sites"
        q_params = {"campaign_id": campaign_id}
        return self._req.upload(
            endpoint,
            params=q_params,
            files={k: v for k, v in csv_files.items() if len(v.filename) > 0},
        )


class AnalysisResources(BaseResources):
    endpoint_base_uri = "/analysis/campaign/"
    disabled_endpoints = ["getall", "getone", "create", "update", "delete"]

    def get_completeness(
        self,
        campaign_id,
        start_time,
        end_time,
        timeseries,
        data_state,
        bucket_width,
        timezone="UTC",
        *,
        etag=None,
    ):
        endpoint = f"{self.endpoint_base_uri}{campaign_id}/completeness"
        q_params = {
            "start_time": start_time,
            "end_time": end_time,
            "timeseries": timeseries,
            "data_state": data_state,
            "bucket_width": bucket_width,
            "timezone": timezone,
        }
        return self._req.getall(endpoint, etag=etag, params=q_params)

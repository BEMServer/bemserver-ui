"""BEMServer API client"""
import logging
import flask
import requests
import requests.exceptions as req_exc
from requests.auth import HTTPBasicAuth  # noqa
from io import BytesIO

from .resources import (
    UserResources, UserGroupResources, UserByUserGroupResources,
    CampaignResources, UserGroupByCampaignResources, CampaignScopeResources,
    TimeseriesResources, TimeseriesDataStateResources, TimeseriesPropertyResources,
    TimeseriesPropertyDataResources, TimeseriesDataResources,
    EventResources, EventStateResources, EventLevelResources, EventCategoryResources,
)
from .exceptions import (
    BEMServerAPIValidationError, BEMServerAPINotFoundError, BEMServerAPINotModified,
)


APICLI_LOGGER = logging.getLogger(__name__)


class BEMServerApiClientResponse:
    """API client response"""

    def __init__(self, raw_response):
        self._raw_response = raw_response
        content_type = self._raw_response.headers.get("Content-Type", "")
        self._mimetype = content_type.split("; ")[0]

        # Process redirection or error, if any.
        if self.status_code == 304:
            raise BEMServerAPINotModified
        elif self.status_code < 300 or self.status_code >= 500:
            self._raw_response.raise_for_status()
        else:
            self._process_client_error()

    @property
    def status_code(self):
        return self._raw_response.status_code

    @property
    def etag(self):
        return self._raw_response.headers.get("ETag", "")

    @property
    def pagination(self):
        """Get pagination data, if any.

        Example:
            {"total": 4, "total_pages": 1, "first_page": 1, "last_page": 1, "page": 1}
        """
        return self._raw_response.headers.get("X-Pagination", {})

    @property
    def is_json(self):
        """Check if the mimetype indicates JSON data, either
        :mimetype:`application/json` or :mimetype:`application/*+json`.
        """
        return (
            self._mimetype == "application/json"
            or (self._mimetype.startswith("application/")
                and self._mimetype.endswith("+json"))
        )

    @property
    def data(self):
        if self.is_json:
            return self._raw_response.json()
        return self._raw_response.content

    def _process_client_error(self):
        APICLI_LOGGER.error(f"{self.status_code} {self._raw_response.url}")

        # Authentication error
        if self.status_code in (401, 403):
            flask.abort(self.status_code)

        # Precondition error (etag)
        elif self.status_code in (412, 428):
            flask.abort(self.status_code)

        # Resource not found
        elif self.status_code == 404:
            raise BEMServerAPINotFoundError

        # Conflict or validation error
        elif self.status_code in (409, 422):
            errors = {}
            if self.is_json:
                if self.status_code == 409:
                    # Unique constraint error
                    if self.data.get("errors", {}).get("type") == "unique_constraint":
                        errors = {
                            # TODO: manage multiple columns constraint
                            field: ("Must be unique",)
                            for field in self.data["errors"]["fields"]
                        }
                    # Foreign key constraint error (and default case)
                    else:
                        errors = {"_general": ["Operation failed (409)."]}
                elif self.status_code == 422:
                    if "errors" in self.data:
                        # Marshmallow ValidationError
                        for loc in ("json", "query", "files"):
                            if loc in self.data["errors"]:
                                errors = {**errors, **self.data["errors"][loc]}
                                if "_schema" in errors:
                                    errors["_general"] = errors.pop("_schema")
                    # BEMServer ValidationError
                    elif "message" in self.data:
                        errors = {"_general": [self.data["message"]]}
            for error in errors.pop("_general", []):
                flask.flash(error, "error")
            raise BEMServerAPIValidationError(errors=errors)

        # Issue in BEMServer UI
        flask.abort(500, "A server error occured.")

    def send_file(self):
        # Example of headers when downloading a file:
        #   {'Content-Type': 'text/csv; charset=utf-8', 'Content-Length': '103',
        #    'Content-Disposition': 'attachment; filename=timeseries.csv',...
        disposition = self._raw_response.headers["Content-Disposition"]
        filename = disposition.split("; ")[1].split("=")[1]
        return flask.send_file(
            BytesIO(self.data), download_name=filename, as_attachment=True)

    def toJSON(self):
        # Allows to set this response instance in a flask session variable.
        return {
            "status_code": self.status_code,
            "data": self.data,
            "etag": self.etag,
            "pagination": self.pagination,
        }


class BEMServerApiClientRequest:
    """API client requester"""

    _ETAG_HEADER_BY_HTTP_METHOD = {
        "GET": "If-None-Match",
        "PUT": "If-Match",
        "DELETE": "If-Match",
    }

    def __init__(self, base_uri, authentication_method):
        self.base_uri = base_uri

        self._session = requests.Session()
        self._session.auth = authentication_method

    def _build_uri(self, endpoint_uri):
        return f"{self.base_uri}{endpoint_uri}"

    def _prepare_etag_header(self, http_method, etag):
        etag_header = {}
        if etag is not None:
            try:
                etag_header = {
                    self._ETAG_HEADER_BY_HTTP_METHOD[http_method.upper()]: etag}
            except KeyError:
                pass
        return etag_header

    def _execute(self, http_method, endpoint, *, etag=None, **kwargs):
        full_endpoint_uri = self._build_uri(endpoint)
        headers = self._prepare_etag_header(http_method, etag)
        APICLI_LOGGER.debug(f"{http_method} {full_endpoint_uri}")
        try:
            raw_resp = self._session.request(
                http_method, full_endpoint_uri, headers=headers, **kwargs)
        except req_exc.RequestException as exc:
            APICLI_LOGGER.error(
                f"Unexpected error while requesting {full_endpoint_uri}: {exc}")
            flask.abort(500, "A server error occured. Please try again later.")
        return BEMServerApiClientResponse(raw_resp)

    def getall(self, endpoint, *, etag=None, **kwargs):
        return self._execute("GET", endpoint, etag=etag, **kwargs)

    def getone(self, endpoint, *, etag=None):
        return self._execute("GET", endpoint, etag=etag)

    def create(self, endpoint, payload):
        return self._execute("POST", endpoint, json=payload)

    def update(self, endpoint, payload, etag):
        return self._execute("PUT", endpoint, json=payload, etag=etag)

    def delete(self, endpoint, etag):
        return self._execute("DELETE", endpoint, etag=etag)

    def upload(self, endpoint, files, **kwargs):
        """Upload files."""
        return self._execute("POST", endpoint, files=files, **kwargs)

    def download(self, endpoint, **kwargs):
        """Download files."""
        return self._execute("GET", endpoint, **kwargs)


class BEMServerApiClient:
    """API client"""

    def __init__(self, base_uri, authentication_method=None):
        self._request_manager = BEMServerApiClientRequest(
            base_uri, authentication_method)

        self.users = UserResources(self._request_manager)
        self.user_groups = UserGroupResources(self._request_manager)
        self.user_by_user_groups = UserByUserGroupResources(self._request_manager)

        self.campaigns = CampaignResources(self._request_manager)
        self.user_groups_by_campaigns = \
            UserGroupByCampaignResources(self._request_manager)
        self.campaign_scopes = CampaignScopeResources(self._request_manager)

        self.timeseries = TimeseriesResources(self._request_manager)
        self.timeseries_datastates = TimeseriesDataStateResources(self._request_manager)
        self.timeseries_properties = TimeseriesPropertyResources(self._request_manager)
        self.timeseries_propertiesdata = \
            TimeseriesPropertyDataResources(self._request_manager)
        self.timeseries_data = TimeseriesDataResources(self._request_manager)

        self.events = EventResources(self._request_manager)
        self.event_states = EventStateResources(self._request_manager)
        self.event_levels = EventLevelResources(self._request_manager)
        self.event_categories = EventCategoryResources(self._request_manager)

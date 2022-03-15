"""BEMServer API client errors"""
from apiclient import exceptions as ace


class BEMServerAPIError(Exception):
    """BEMServer API error"""


class BEMServerAPIValidationError(BEMServerAPIError):
    """BEMServer API validation error"""

    def __init__(self, errors=None):
        self.errors = errors


class BEMServerAPINotFoundError(BEMServerAPIError):
    """BEMServer API not found error"""


class BEMServerClientError(ace.ClientError):
    """BEMServer ClientError with a json attribute storing error json message"""

    def __init__(self, *args, json=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.json = json or {}

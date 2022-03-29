"""BEMServer API client errors"""


class BEMServerAPIError(Exception):
    """BEMServer API error"""


class BEMServerAPIValidationError(BEMServerAPIError):
    """BEMServer API validation error"""

    def __init__(self, errors=None):
        self.errors = errors


class BEMServerAPINotFoundError(BEMServerAPIError):
    """BEMServer API not found error"""


class BEMServerAPINotModified(BEMServerAPIError):
    """BEMServer API not modified"""

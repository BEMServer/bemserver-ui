"""Application settings."""


class Config:
    """Default configuration"""

    SESSION_COOKIE_SAMESITE = "Lax"

    BEMSERVER_API_HOST = ""
    BEMSERVER_API_USE_SSL = True
    BEMSERVER_API_AUTH_METHOD = "http_basic"

    BEMSERVER_PARTNERS_FILE = None

    BEMSERVER_TIMEZONE_NAME = "UTC"
    BEMSERVER_NOTIFICATION_UPDATER_DELAY = 60000

    BEMSERVER_PLUGINS = None

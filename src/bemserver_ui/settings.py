"""Application settings."""


class Config:
    """Default configuration"""

    SESSION_COOKIE_SAMESITE = "Lax"

    BEMSERVER_API_HOST = ""
    BEMSERVER_API_USE_SSL = True
    # Authentication method choices are: "jwt" (preferred and default) or "http_basic"
    BEMSERVER_API_AUTH_METHOD = "jwt"

    BEMSERVER_UI_PARTNERS_FILE = None

    BEMSERVER_UI_TIMEZONE_NAME = "UTC"
    BEMSERVER_UI_NOTIFICATION_UPDATER_DELAY = 60000

    BEMSERVER_UI_PLUGINS = None

    BEMSERVER_UI_USER_GUIDE_URL = (
        "https://bemserver-docs.readthedocs.io/en/latest/user_guide.html"
    )

    # Profiling
    PROFILE_DIR = ""

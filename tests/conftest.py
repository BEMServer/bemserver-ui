"""Global conftest"""

import pytest

from bemserver_ui import create_app
from bemserver_ui.settings import Config


class TestConfig(Config):
    TESTING = True
    SERVER_NAME = "localhost"
    APPLICATION_ROOT = "/"


@pytest.fixture(scope="session", params=(TestConfig,))
def app(request):
    application = create_app(request.param)
    yield application

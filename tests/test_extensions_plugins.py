"""Extensions plugins tests"""

import importlib.metadata
import re

import pytest

from packaging.version import Version

from bemserver_ui.extensions.plugins import (
    BEMServerUIVersionError,
    _check_required_ui_version,
)
from tests.tools import not_raises


class TestExtensionPlugins:
    def test_check_required_ui_version(self):
        ui_version = Version(importlib.metadata.version("bemserver-ui"))

        with not_raises(BEMServerUIVersionError):
            _check_required_ui_version(
                {"min": ui_version, "max": Version(f"{ui_version.major + 1}.0.0")}
            )

        exp_version_bounds = {
            "min": Version(f"{ui_version.major + 1}.0.0"),
            "max": Version(f"{ui_version.major + 2}.0.0"),
        }
        with pytest.raises(
            BEMServerUIVersionError,
            match=re.escape(
                f"UI version ({ui_version.public}) not supported!"
                f" (expected: >={exp_version_bounds['min'].public}"
                f",<{exp_version_bounds['max'].public})"
            ),
        ):
            _check_required_ui_version(exp_version_bounds)

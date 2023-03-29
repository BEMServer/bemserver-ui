"""Extensions plugins tests"""
from packaging.version import Version
import re
import pytest

from tests.tools import not_raises

import bemserver_ui
from bemserver_ui.extensions.plugins import (
    _check_required_ui_version,
    BEMServerUIVersionError,
)


class TestExtensionPlugins:
    def test_check_required_ui_version(self):
        bemserver_ui.__version__ = "1.0.0"

        with not_raises(BEMServerUIVersionError):
            _check_required_ui_version(
                {"min": Version("1.0.0"), "max": Version("2.0.0")}
            )

        with pytest.raises(
            BEMServerUIVersionError,
            match=re.escape(
                "UI version (1.0.0) not supported! (expected: >=4.0.0,<5.0.0)"
            ),
        ):
            _check_required_ui_version(
                {"min": Version("4.0.0"), "max": Version("5.0.0")}
            )

        for bad_version in [None, "bad", 666]:
            bemserver_ui.__version__ = bad_version
            with pytest.raises(BEMServerUIVersionError, match="Invalid UI version:"):
                assert _check_required_ui_version(
                    {"min": Version("1.0.0"), "max": Version("2.0.0")}
                )

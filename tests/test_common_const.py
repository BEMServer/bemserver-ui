"""Common const tests"""

from bemserver_ui.common.const import (
    STRUCTURAL_ELEMENT_TYPES,
    FULL_STRUCTURAL_ELEMENT_TYPES,
    BEMSERVER_APP_LABELS,
    SIDEBAR_SECTIONS,
)


class TestCommonConst:
    def test_structural_element_types(self):
        assert STRUCTURAL_ELEMENT_TYPES == ["site", "building", "storey", "space"]
        assert FULL_STRUCTURAL_ELEMENT_TYPES == [
            "site",
            "building",
            "storey",
            "space",
            "zone",
        ]

    def test_app_labels(self):
        assert BEMSERVER_APP_LABELS == {
            "bemserver_core": "Core",
            "bemserver_api": "API",
        }

    def test_sidebar_sections(self):
        assert SIDEBAR_SECTIONS == ["tsdata", "analysis", "dashboards", "services"]

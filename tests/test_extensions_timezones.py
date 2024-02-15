"""Extensions timezones tests"""

from bemserver_ui.extensions.timezones import TimezoneTool, get_tz_info


class TestExtensionTimezones:
    def test_get_tz_info(self):
        tz_name = "Europe/Paris"
        tz_data = get_tz_info(tz_name)
        assert tz_data["name"] == tz_name
        assert "label" in tz_data
        assert "region" in tz_data
        assert "country" in tz_data
        assert "code" in tz_data["country"]
        assert "name" in tz_data["country"]
        assert "area" in tz_data
        assert "utcoffset" in tz_data["area"]
        assert "utcoffset_iso" in tz_data["area"]
        assert "dst" in tz_data["area"]
        assert "dst_iso" in tz_data["area"]
        assert "name" in tz_data["area"]
        assert "label" in tz_data["area"]

        assert tz_data == {
            "label": "Paris (Europe/Paris)",
            "region": "Europe",
            "country": {
                "code": "FR",
                "name": "France",
            },
            "area": {
                "utcoffset": 3600.0,
                "utcoffset_iso": "+01:00",
                "dst": 0.0,
                "dst_iso": "+00:00",
                "name": "Central European Time",
                "label": "(UTC+01:00) Central European Time",
            },
            "name": "Europe/Paris",
        }

    def test_timezone_tool(self):
        tz_tool = TimezoneTool()
        assert len(tz_tool.available_timezones()) == 471
        assert len(tz_tool.regions) == 12
        assert len(tz_tool.areas) == 249
        assert len(tz_tool.timezones) == 471
        assert len(tz_tool.areas_by_region) == 0
        assert len(tz_tool.timezones_by_region_by_area) == 0

        tz_tool.prepare_data()
        assert len(tz_tool.regions) == 12
        assert len(tz_tool.areas) == 249
        assert len(tz_tool.timezones) == 471
        assert len(tz_tool.areas_by_region) == 12
        areas_count = 0
        for areas in tz_tool.areas_by_region.values():
            areas_count += len(areas)
        assert areas_count >= len(tz_tool.areas)
        assert len(tz_tool.timezones_by_region_by_area) == 12
        areas_count = 0
        timezones_count = 0
        for areas in tz_tool.timezones_by_region_by_area.values():
            areas_count += len(areas)
            for timezones in areas.values():
                timezones_count += len(timezones)
        assert areas_count >= len(tz_tool.areas)
        assert timezones_count == len(tz_tool.timezones)

        tz_name = "Europe/Paris"
        tz_data = tz_tool.get_tz_info(tz_name)
        assert tz_data == {
            "label": "Paris (Europe/Paris)",
            "region": "Europe",
            "country": {
                "code": "FR",
                "name": "France",
            },
            "area": {
                "utcoffset": 3600.0,
                "utcoffset_iso": "+01:00",
                "dst": 0.0,
                "dst_iso": "+00:00",
                "name": "Central European Time",
                "label": "(UTC+01:00) Central European Time",
            },
            "name": "Europe/Paris",
        }

        # when unknown timezone, defaults to UTC
        tz_data = tz_tool.get_tz_info("bad_tz")
        assert tz_data["name"] == "UTC"
        # or defined timezone
        tz_data = tz_tool.get_tz_info("bad_tz", default_tz_name="Europe/Paris")
        assert tz_data["name"] == "Europe/Paris"

"""BEMServer UI timezones tool"""

import json
from pathlib import Path
from operator import itemgetter


class TimezoneTool:
    def __init__(self):
        self.regions = []
        self.areas = {}
        self.timezones = {}
        self.areas_by_region = {}
        self.timezones_by_region_by_area = {}

        self._tz_dirpath = Path(__file__).parent
        self._tz_filepath = self._tz_dirpath / "timezones-full.json"
        self._tz_regions_filepath = self._tz_dirpath / "timezones-regions.json"
        self._tz_areas_filepath = self._tz_dirpath / "timezones-areas.json"
        self._load_from_files()

    def _load_from_files(self):
        with self._tz_regions_filepath.open("r") as tz_f:
            self.regions = json.load(tz_f)
        with self._tz_areas_filepath.open("r") as tz_f:
            self.areas = json.load(tz_f)
        with self._tz_filepath.open("r") as tz_f:
            self.timezones = json.load(tz_f)

    def available_timezones(self):
        return set(self.timezones.keys())

    def prepare_data(self):
        # Extract areas by region, timezones by region and by area.
        self.areas_by_region = {}
        self.timezones_by_region_by_area = {}
        for region in self.regions:
            if region not in self.timezones_by_region_by_area:
                self.timezones_by_region_by_area[region] = {}

            areas = []
            for tz_info in self.timezones.values():
                if region == tz_info["region"] and tz_info["area"] is not None:
                    if tz_info["area"] not in areas:
                        areas.append(tz_info["area"])
                    tz_area_label = tz_info["area"]["label"]
                    if tz_area_label not in self.timezones_by_region_by_area[region]:
                        self.timezones_by_region_by_area[region][tz_area_label] = []
                    self.timezones_by_region_by_area[region][tz_area_label].append(
                        tz_info
                    )
            self.areas_by_region[region] = sorted(
                areas, key=itemgetter("utcoffset", "label")
            )

    def get_tz_info(self, tz_name, *, default_tz_name="UTC"):
        try:
            return self.timezones[tz_name]
        except KeyError:
            return self.timezones[default_tz_name]

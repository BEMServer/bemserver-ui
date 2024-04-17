"""Common tree tools tests"""

from bemserver_ui.common.const import (
    FULL_STRUCTURAL_ELEMENT_TYPES,
    STRUCTURAL_ELEMENT_TYPES,
)
from bemserver_ui.common.tree import (
    PATH_SEPARATOR,
    _get_node_level_from_type,
    build_tree,
    build_tree_node,
    build_tree_node_path,
    search_tree_node,
)

SITES_DATA = [
    {
        "campaign_id": 1,
        "description": "Nobatek Anglet",
        "id": 1,
        "ifc_id": "",
        "name": "Anglet",
    },
    {
        "campaign_id": 1,
        "description": "Nobatek Bordeaux",
        "id": 2,
        "ifc_id": "",
        "name": "Bordeaux",
    },
    {
        "campaign_id": 1,
        "description": "Nobatek Talence",
        "id": 3,
        "ifc_id": "",
        "name": "Talence",
    },
]
BUILDINGS_DATA = [
    {
        "description": "Nobatek headquarters",
        "id": 1,
        "ifc_id": "",
        "name": "Nobatek HQ",
        "site_id": 1,
    },
    {
        "description": "Bordeaux office",
        "id": 2,
        "ifc_id": "",
        "name": "Millenium",
        "site_id": 2,
    },
    {
        "description": "Shared lab",
        "id": 3,
        "ifc_id": "",
        "name": "Talence lab",
        "site_id": 3,
    },
]
STOREYS_DATA = [
    {
        "building_id": 1,
        "description": "Atrium, lab,...",
        "id": 1,
        "ifc_id": "",
        "name": "Ground floor",
    },
    {
        "building_id": 1,
        "description": "Offices",
        "id": 2,
        "ifc_id": "",
        "name": "First floor",
    },
    {
        "building_id": 1,
        "description": "Offices",
        "id": 3,
        "ifc_id": "",
        "name": "Second floor",
    },
    {
        "building_id": 2,
        "description": "",
        "id": 4,
        "ifc_id": "",
        "name": "First floor",
    },
    {
        "building_id": 3,
        "description": "",
        "id": 5,
        "ifc_id": "",
        "name": "Ground floor",
    },
]
SPACES_DATA = [
    {
        "description": "Common space for ground floor",
        "id": 1,
        "ifc_id": "",
        "name": "Ground",
        "storey_id": 1,
    },
    {
        "description": "",
        "id": 2,
        "ifc_id": "",
        "name": "Offices",
        "storey_id": 2,
    },
    {
        "description": "",
        "id": 3,
        "ifc_id": "",
        "name": "Offices",
        "storey_id": 3,
    },
    {
        "description": "",
        "id": 4,
        "ifc_id": "",
        "name": "Offices",
        "storey_id": 4,
    },
    {
        "description": "",
        "id": 5,
        "ifc_id": "",
        "name": "Lab",
        "storey_id": 5,
    },
]
ZONES_DATA = [
    {
        "campaign_id": 1,
        "description": "",
        "id": 1,
        "ifc_id": "",
        "name": "Test zone",
    },
]


def get_tree_data(structural_element_types=STRUCTURAL_ELEMENT_TYPES):
    tree_data = {}
    if "site" in structural_element_types:
        tree_data["site"] = SITES_DATA
        if "building" in structural_element_types:
            tree_data["building"] = BUILDINGS_DATA
            if "storey" in structural_element_types:
                tree_data["storey"] = STOREYS_DATA
                if "space" in structural_element_types:
                    tree_data["space"] = SPACES_DATA
    elif "zone" in structural_element_types:
        tree_data["zone"] = ZONES_DATA
    return tree_data


class TestCommonTree:
    def test_path_separator(self):
        assert PATH_SEPARATOR == "/"

    def test_build_tree_node(self):
        site_node = build_tree_node(SITES_DATA[0]["id"], SITES_DATA[0]["name"], "site")
        for field_name in [
            "node_id",
            "node_level",
            "id",
            "name",
            "type",
            "is_draggable",
            "is_selectable",
            "path",
            "full_path",
            "parent_node_id",
            "nodes",
        ]:
            assert field_name in site_node
        assert site_node["node_id"] == "site-1"
        assert site_node["node_level"] == 0
        assert site_node["id"] == 1
        assert site_node["name"] == "Anglet"
        assert site_node["type"] == "site"
        assert not site_node["is_draggable"]
        assert site_node["is_selectable"]
        assert site_node["path"] == ""
        assert site_node["full_path"] == "Anglet"
        assert site_node["parent_node_id"] is None
        assert site_node["nodes"] == []

        building_node = build_tree_node(
            BUILDINGS_DATA[0]["id"], BUILDINGS_DATA[0]["name"], "building", site_node
        )
        assert building_node["node_id"] == "building-1"
        assert building_node["node_level"] == 1
        assert building_node["id"] == 1
        assert building_node["name"] == "Nobatek HQ"
        assert building_node["type"] == "building"
        assert not building_node["is_draggable"]
        assert building_node["is_selectable"]
        assert building_node["path"] == "Anglet"
        assert building_node["full_path"] == (
            f" {PATH_SEPARATOR} ".join(["Anglet", "Nobatek HQ"])
        )
        assert building_node["parent_node_id"] == "site-1"
        assert building_node["nodes"] == []

        storey_node = build_tree_node(
            STOREYS_DATA[0]["id"], STOREYS_DATA[0]["name"], "storey", building_node
        )
        assert storey_node["node_id"] == "storey-1"
        assert storey_node["node_level"] == 2
        assert storey_node["id"] == 1
        assert storey_node["name"] == "Ground floor"
        assert storey_node["type"] == "storey"
        assert not storey_node["is_draggable"]
        assert storey_node["is_selectable"]
        assert storey_node["path"] == (
            f" {PATH_SEPARATOR} ".join(["Anglet", "Nobatek HQ"])
        )
        assert storey_node["full_path"] == (
            f" {PATH_SEPARATOR} ".join(["Anglet", "Nobatek HQ", "Ground floor"])
        )
        assert storey_node["parent_node_id"] == "building-1"
        assert storey_node["nodes"] == []

        space_node = build_tree_node(
            SPACES_DATA[0]["id"], SPACES_DATA[0]["name"], "space", storey_node
        )
        assert space_node["node_id"] == "space-1"
        assert space_node["node_level"] == 3
        assert space_node["id"] == 1
        assert space_node["name"] == "Ground"
        assert space_node["type"] == "space"
        assert not space_node["is_draggable"]
        assert space_node["is_selectable"]
        assert space_node["path"] == (
            f" {PATH_SEPARATOR} ".join(["Anglet", "Nobatek HQ", "Ground floor"])
        )
        assert space_node["full_path"] == (
            f" {PATH_SEPARATOR} ".join(
                ["Anglet", "Nobatek HQ", "Ground floor", "Ground"]
            )
        )
        assert space_node["parent_node_id"] == "storey-1"
        assert space_node["nodes"] == []

        zone_node = build_tree_node(ZONES_DATA[0]["id"], ZONES_DATA[0]["name"], "zone")
        assert zone_node["node_id"] == "zone-1"
        assert zone_node["node_level"] == 0
        assert zone_node["id"] == 1
        assert zone_node["name"] == "Test zone"
        assert zone_node["type"] == "zone"
        assert not zone_node["is_draggable"]
        assert zone_node["is_selectable"]
        assert zone_node["path"] == ""
        assert zone_node["full_path"] == "Test zone"
        assert zone_node["parent_node_id"] is None
        assert zone_node["nodes"] == []

    def test_build_tree_sites(self):
        tree_data = get_tree_data()
        tree = build_tree(tree_data)
        assert len(tree) == len(SITES_DATA)
        site_names = [x["name"] for x in SITES_DATA]
        for site_node in tree:
            assert site_node["type"] == "site"
            assert site_node["name"] in site_names
            assert site_node["node_level"] == 0
            assert not site_node["is_draggable"]
            assert site_node["is_selectable"]

            building_names = [
                x["name"] for x in BUILDINGS_DATA if x["site_id"] == site_node["id"]
            ]
            assert len(site_node["nodes"]) == len(building_names)
            for building_node in site_node["nodes"]:
                assert building_node["type"] == "building"
                assert building_node["name"] in building_names
                assert building_node["node_level"] == 1
                assert not building_node["is_draggable"]
                assert building_node["is_selectable"]

                storey_names = [
                    x["name"]
                    for x in STOREYS_DATA
                    if x["building_id"] == building_node["id"]
                ]
                assert len(building_node["nodes"]) == len(storey_names)
                for storey_node in building_node["nodes"]:
                    assert storey_node["type"] == "storey"
                    assert storey_node["name"] in storey_names
                    assert storey_node["node_level"] == 2
                    assert not storey_node["is_draggable"]
                    assert storey_node["is_selectable"]

                    space_names = [
                        x["name"]
                        for x in SPACES_DATA
                        if x["storey_id"] == storey_node["id"]
                    ]
                    assert len(storey_node["nodes"]) == len(space_names)
                    for space_node in storey_node["nodes"]:
                        assert space_node["type"] == "space"
                        assert space_node["name"] in space_names
                        assert space_node["node_level"] == 3
                        assert not space_node["is_draggable"]
                        assert space_node["is_selectable"]

        tree = build_tree(tree_data, is_draggable=True, is_selectable=False)
        assert len(tree) == len(SITES_DATA)
        site_names = [x["name"] for x in SITES_DATA]
        for site_node in tree:
            assert site_node["type"] == "site"
            assert site_node["name"] in site_names
            assert site_node["node_level"] == 0
            assert site_node["is_draggable"]
            assert not site_node["is_selectable"]

            building_names = [
                x["name"] for x in BUILDINGS_DATA if x["site_id"] == site_node["id"]
            ]
            assert len(site_node["nodes"]) == len(building_names)
            for building_node in site_node["nodes"]:
                assert building_node["type"] == "building"
                assert building_node["name"] in building_names
                assert building_node["node_level"] == 1
                assert building_node["is_draggable"]
                assert not building_node["is_selectable"]

                storey_names = [
                    x["name"]
                    for x in STOREYS_DATA
                    if x["building_id"] == building_node["id"]
                ]
                assert len(building_node["nodes"]) == len(storey_names)
                for storey_node in building_node["nodes"]:
                    assert storey_node["type"] == "storey"
                    assert storey_node["name"] in storey_names
                    assert storey_node["node_level"] == 2
                    assert storey_node["is_draggable"]
                    assert not storey_node["is_selectable"]

                    space_names = [
                        x["name"]
                        for x in SPACES_DATA
                        if x["storey_id"] == storey_node["id"]
                    ]
                    assert len(storey_node["nodes"]) == len(space_names)
                    for space_node in storey_node["nodes"]:
                        assert space_node["type"] == "space"
                        assert space_node["name"] in space_names
                        assert space_node["node_level"] == 3
                        assert space_node["is_draggable"]
                        assert not space_node["is_selectable"]

        tree_data = get_tree_data(structural_element_types=["site", "building"])
        tree = build_tree(tree_data)
        assert len(tree) == len(SITES_DATA)
        site_names = [x["name"] for x in SITES_DATA]
        for site_node in tree:
            assert site_node["type"] == "site"
            assert site_node["name"] in site_names
            assert site_node["node_level"] == 0
            assert not site_node["is_draggable"]
            assert site_node["is_selectable"]

            building_names = [
                x["name"] for x in BUILDINGS_DATA if x["site_id"] == site_node["id"]
            ]
            assert len(site_node["nodes"]) == len(building_names)
            for building_node in site_node["nodes"]:
                assert building_node["type"] == "building"
                assert building_node["name"] in building_names
                assert building_node["node_level"] == 1
                assert not building_node["is_draggable"]
                assert building_node["is_selectable"]
                assert len(building_node["nodes"]) == 0

        tree_data = get_tree_data(structural_element_types=["building", "storey"])
        tree = build_tree(tree_data)
        assert len(tree) == 0

        tree_data = get_tree_data(structural_element_types=["what...", "...ever"])
        tree = build_tree(tree_data)
        assert len(tree) == 0

    def test_build_tree_zones(self):
        tree_data = get_tree_data(structural_element_types=["zone"])
        tree = build_tree(tree_data)
        assert len(tree) == len(ZONES_DATA)
        zone_names = [x["name"] for x in ZONES_DATA]
        for zone_node in tree:
            assert zone_node["type"] == "zone"
            assert zone_node["name"] in zone_names
            assert zone_node["node_level"] == 0
            assert not zone_node["is_draggable"]
            assert zone_node["is_selectable"]

        tree = build_tree(tree_data, is_draggable=True, is_selectable=False)
        assert len(tree) == len(ZONES_DATA)
        zone_names = [x["name"] for x in ZONES_DATA]
        for zone_node in tree:
            assert zone_node["type"] == "zone"
            assert zone_node["name"] in zone_names
            assert zone_node["node_level"] == 0
            assert zone_node["is_draggable"]
            assert not zone_node["is_selectable"]

    def test_get_node_lebel_from_type(self):
        assert _get_node_level_from_type("site") == 0
        assert _get_node_level_from_type("building") == 1
        assert _get_node_level_from_type("storey") == 2
        assert _get_node_level_from_type("space") == 3
        assert _get_node_level_from_type("zone") == 0

    def test_search_tree_node(self):
        tree = build_tree(get_tree_data())

        found_node = search_tree_node(tree, "site", 1)
        assert found_node["type"] == "site"
        assert found_node["id"] == 1
        assert found_node["name"] == "Anglet"
        assert found_node["node_level"] == 0
        assert found_node["parent_node_id"] is None
        assert len(found_node["nodes"]) == 1
        for child_node in found_node["nodes"]:
            assert child_node["type"] == "building"
            assert child_node["parent_node_id"] == found_node["node_id"]

        found_node = search_tree_node(tree, "building", 3)
        assert found_node["type"] == "building"
        assert found_node["id"] == 3
        assert found_node["name"] == "Talence lab"
        assert found_node["node_level"] == 1
        assert found_node["parent_node_id"] == "site-3"
        assert len(found_node["nodes"]) == 1
        for child_node in found_node["nodes"]:
            assert child_node["type"] == "storey"
            assert child_node["parent_node_id"] == found_node["node_id"]

        found_node = search_tree_node(tree, "storey", 4)
        assert found_node["type"] == "storey"
        assert found_node["id"] == 4
        assert found_node["name"] == "First floor"
        assert found_node["node_level"] == 2
        assert found_node["parent_node_id"] == "building-2"
        assert len(found_node["nodes"]) == 1
        for child_node in found_node["nodes"]:
            assert child_node["type"] == "space"
            assert child_node["parent_node_id"] == found_node["node_id"]

        found_node = search_tree_node(tree, "space", 2)
        assert found_node["type"] == "space"
        assert found_node["id"] == 2
        assert found_node["name"] == "Offices"
        assert found_node["node_level"] == 3
        assert found_node["parent_node_id"] == "storey-2"
        assert len(found_node["nodes"]) == 0

        found_node = search_tree_node(tree, "pouet", 1)
        assert found_node is None
        for struct_elmt_type in STRUCTURAL_ELEMENT_TYPES:
            found_node = search_tree_node(tree, struct_elmt_type, 666)
            assert found_node is None

        tree = build_tree(get_tree_data(structural_element_types=["zone"]))

        found_node = search_tree_node(tree, "zone", 1)
        assert found_node["type"] == "zone"
        assert found_node["id"] == 1
        assert found_node["name"] == "Test zone"
        assert found_node["node_level"] == 0
        assert found_node["parent_node_id"] is None
        assert len(found_node["nodes"]) == 0

        found_node = search_tree_node(tree, "pouet", 1)
        assert found_node is None
        found_node = search_tree_node(tree, "zone", 666)
        assert found_node is None

    def test_build_tree_node_path(self):
        base_data = {
            "id": 0,
            "timeseries_id": 0,
        }
        base_site_data = {
            "site": {
                "name": "Site A",
                "description": "AAAAAA",
                "ifc_id": "AAAAAA",
                "campaign_id": 0,
            },
        }
        site_data = {
            **base_data,
            **base_site_data,
            "site_id": 0,
        }
        path = build_tree_node_path("site", site_data)
        assert path == ""

        base_building_data = {
            "building": {
                "name": "Building A",
                "description": "AAAAAA",
                "ifc_id": "AAAAAA",
                "site_id": 0,
            },
        }
        building_data = {
            **base_data,
            **base_site_data,
            **base_building_data,
            "building_id": 0,
        }
        path = build_tree_node_path("building", building_data)
        assert path == "Site A"

        base_storey_data = {
            "storey": {
                "name": "Storey A",
                "description": "AAAAAA",
                "ifc_id": "AAAAAA",
                "building_id": 0,
            },
        }
        storey_data = {
            **base_data,
            **base_site_data,
            **base_building_data,
            **base_storey_data,
            "storey_id": 0,
        }
        path = build_tree_node_path("storey", storey_data)
        assert path == f" {PATH_SEPARATOR} ".join(["Site A", "Building A"])

        base_space_data = {
            "space": {
                "name": "Space A",
                "description": "AAAAAA",
                "ifc_id": "AAAAAA",
                "storey_id": 0,
            },
        }
        space_data = {
            **base_data,
            **base_site_data,
            **base_building_data,
            **base_storey_data,
            **base_space_data,
            "space_id": 0,
        }
        path = build_tree_node_path("space", space_data)
        assert path == f" {PATH_SEPARATOR} ".join(["Site A", "Building A", "Storey A"])

        zone_data = {
            "id": 0,
            "zone": {
                "name": "Zone A",
                "description": "AAAAAA",
                "ifc_id": "AAAAAA",
                "campaign_id": 0,
            },
            "timeseries_id": 0,
            "zone_id": 0,
        }
        path = build_tree_node_path("zone", zone_data)
        assert path == ""

        for struct_elmt_type in FULL_STRUCTURAL_ELEMENT_TYPES:
            path = build_tree_node_path(struct_elmt_type, {})
            assert path == ""
        path = build_tree_node_path("whatever", site_data)
        assert path is None
        path = build_tree_node_path("whatever", zone_data)
        assert path is None

        path = build_tree_node_path("building", site_data)
        assert path == "Site A"
        path = build_tree_node_path("building", storey_data)
        assert path == "Site A"
        path = build_tree_node_path("storey", building_data)
        assert path == f" {PATH_SEPARATOR} ".join(["Site A", "Building A"])

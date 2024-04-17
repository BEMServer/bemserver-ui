"""BEMServer UI common tree tools."""

from bemserver_ui.common.const import (
    FULL_STRUCTURAL_ELEMENT_TYPES,
    STRUCTURAL_ELEMENT_TYPES,
)

PATH_SEPARATOR = "/"


def build_tree_node_path(structural_element_type, structural_element_data):
    path = None
    if structural_element_type in FULL_STRUCTURAL_ELEMENT_TYPES:
        node_level = _get_node_level_from_type(structural_element_type)
        path = f" {PATH_SEPARATOR} ".join(
            [
                structural_element_data[x]["name"]
                for x in STRUCTURAL_ELEMENT_TYPES
                if (
                    _get_node_level_from_type(x) < node_level
                    and x in structural_element_data
                )
            ]
        )
    return path


def build_tree_node(
    id,
    name,
    data_type,
    parent_node=None,
    *,
    is_draggable=False,
    is_selectable=True,
):
    node_level = 0
    full_path = name
    if parent_node is not None:
        node_level = parent_node["node_level"] + 1
        if len(parent_node["full_path"]) > 0:
            full_path = f" {PATH_SEPARATOR} ".join(
                [parent_node["full_path"], full_path]
            )
    return {
        "node_id": f"{data_type}-{id}",
        "node_level": node_level,
        "id": id,
        "name": name,
        "type": data_type,
        "is_draggable": is_draggable,
        "is_selectable": is_selectable,
        "path": "" if parent_node is None else parent_node["full_path"],
        "full_path": full_path,
        "parent_node_id": None if parent_node is None else parent_node["node_id"],
        "nodes": [],
    }


def build_tree(tree_data, *, is_draggable=False, is_selectable=True):
    tree = []
    if "site" in FULL_STRUCTURAL_ELEMENT_TYPES and "site" in tree_data:
        for site_data in tree_data["site"]:
            site_node = build_tree_node(
                site_data["id"],
                site_data["name"],
                "site",
                is_draggable=is_draggable,
                is_selectable=is_selectable,
            )
            if "building" in FULL_STRUCTURAL_ELEMENT_TYPES and "building" in tree_data:
                for building_data in tree_data["building"]:
                    if building_data["site_id"] != site_data["id"]:
                        continue
                    building_node = build_tree_node(
                        building_data["id"],
                        building_data["name"],
                        "building",
                        site_node,
                        is_draggable=is_draggable,
                        is_selectable=is_selectable,
                    )
                    if (
                        "storey" in FULL_STRUCTURAL_ELEMENT_TYPES
                        and "storey" in tree_data
                    ):
                        for storey_data in tree_data["storey"]:
                            if storey_data["building_id"] != building_data["id"]:
                                continue
                            storey_node = build_tree_node(
                                storey_data["id"],
                                storey_data["name"],
                                "storey",
                                building_node,
                                is_draggable=is_draggable,
                                is_selectable=is_selectable,
                            )
                            if (
                                "space" in FULL_STRUCTURAL_ELEMENT_TYPES
                                and "space" in tree_data
                            ):
                                for space_data in tree_data["space"]:
                                    if space_data["storey_id"] != storey_data["id"]:
                                        continue
                                    space_node = build_tree_node(
                                        space_data["id"],
                                        space_data["name"],
                                        "space",
                                        storey_node,
                                        is_draggable=is_draggable,
                                        is_selectable=is_selectable,
                                    )
                                    storey_node["nodes"].append(space_node)
                            building_node["nodes"].append(storey_node)
                    site_node["nodes"].append(building_node)
            tree.append(site_node)
    elif "zone" in FULL_STRUCTURAL_ELEMENT_TYPES and "zone" in tree_data:
        for zone_data in tree_data["zone"]:
            zone_node = build_tree_node(
                zone_data["id"],
                zone_data["name"],
                "zone",
                is_draggable=is_draggable,
                is_selectable=is_selectable,
            )
            tree.append(zone_node)
    return tree


def _get_node_level_from_type(node_type):
    level = 0
    if node_type == "building":
        level = 1
    elif node_type == "storey":
        level = 2
    elif node_type == "space":
        level = 3
    return level


def search_tree_node(tree, node_type, node_id):
    node_level = _get_node_level_from_type(node_type)
    for node in tree:
        if node["type"] == node_type and node["id"] == node_id:
            return node
        if len(node["nodes"]) > 0 and node_level > node["node_level"]:
            ret = search_tree_node(node["nodes"], node_type, node_id)
            if ret is not None:
                return ret
    return None

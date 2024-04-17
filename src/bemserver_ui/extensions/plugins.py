"""Extension to manage BEMServer UI plugin packages.

For a plugin example, see:
https://github.com/BEMServer/bemserver-ui-plugin-example
"""

import importlib.metadata
import logging
from pathlib import Path

from packaging.version import InvalidVersion, Version

from ..common.const import SIDEBAR_SECTIONS
from ..common.tools import import_module

BSUI_PLUGINS_LOGGER = logging.getLogger(__name__)
PLUGINS_LOADED = []


class BEMServerUIVersionError(Exception):
    """BEMServer UI version error"""


class BEMServerUIPluginError(Exception):
    """BEMServer UI plugin error"""


def init_app(app):
    # Load and init UI plugins, if any.
    plugin_paths = app.config.get("BEMSERVER_UI_PLUGINS")

    if plugin_paths is not None:
        for plugin_path in plugin_paths:
            if plugin_module := _load_and_init_plugin_module(plugin_path, app):
                PLUGINS_LOADED.append(plugin_module)

    # Inject plugins sidebar entries.
    @app.context_processor
    def inject_plugins_sidebar_entries():
        def _get_plugins_sidebar(campaign_ctxt):
            sidebar_plugins = {x: [] for x in SIDEBAR_SECTIONS}
            for plugin_module in PLUGINS_LOADED:
                plugin_sidebar = plugin_module.get_sidebar(campaign_ctxt)
                for sidebar_section, sidebar_data in plugin_sidebar.items():
                    if sidebar_section not in SIDEBAR_SECTIONS:
                        BSUI_PLUGINS_LOGGER.warn(
                            "Unknown %s sidebar section for %s plugin",
                            sidebar_section,
                            plugin_module.__name__,
                        )
                        continue
                    sidebar_plugins[sidebar_section].extend(sidebar_data)
            return sidebar_plugins

        return dict(get_sidebar_plugins=_get_plugins_sidebar)


def _load_and_init_plugin_module(plugin_path, app):
    plugin_path = Path(plugin_path)
    if plugin_path.exists():
        plugin_module = import_module(plugin_path.parent.name, plugin_path)
        try:
            _check_required_minimal_attributes(plugin_module)
            _check_required_ui_version(plugin_module.REQUIRED_UI_VERSION)
        except (BEMServerUIPluginError, BEMServerUIVersionError) as exc:
            BSUI_PLUGINS_LOGGER.error(str(exc))
            BSUI_PLUGINS_LOGGER.error("%s plugin NOT loaded!", plugin_module.__name__)
        else:
            plugin_module.init_app(app)
            BSUI_PLUGINS_LOGGER.debug("%s plugin loaded!", plugin_module.__name__)
            return plugin_module
    return None


def _check_required_ui_version(plugin_req_ui_version):
    try:
        version_ui = Version(importlib.metadata.version("bemserver-ui"))
    except (
        TypeError,
        InvalidVersion,
    ) as exc:
        raise BEMServerUIVersionError(f"Invalid UI version: {str(exc)}") from exc
    version_min = plugin_req_ui_version["min"]
    version_max = plugin_req_ui_version["max"]
    if not (version_min <= version_ui < version_max):
        raise BEMServerUIVersionError(
            f"UI version ({str(version_ui)}) not supported!"
            f" (expected: >={str(version_min)},<{str(version_max)})"
        )


def _check_required_minimal_attributes(plugin_module):
    # Verfify that plugin module has minimal required attributes and functions.
    for func_name in ["REQUIRED_UI_VERSION", "PLUGIN_INFO", "init_app", "get_sidebar"]:
        if not hasattr(plugin_module, func_name):
            raise BEMServerUIPluginError(
                f"Missing {func_name} in {plugin_module.__name__}!"
            )

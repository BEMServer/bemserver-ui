"""Extension to manage plugin packages `BEMSERVER_PLUGINS_PATH` folder."""
import logging
import flask
from pathlib import Path
from packaging.version import Version, InvalidVersion

import bemserver_ui

from ..common.const import SIDEBAR_SECTIONS
from ..common.tools import import_module


BSUI_PLUGINS_LOGGER = logging.getLogger(__name__)
PLUGINS_LOADED = []
PLUGINS_SIDEBAR = {x: [] for x in SIDEBAR_SECTIONS}


class BEMServerUIVersionError(Exception):
    """BEMServer UI version error"""


def init_app(app):
    # Load and init UI plugins, if any.
    plugin_paths = app.config.get("BEMSERVER_PLUGINS")

    if plugin_paths is not None:
        for plugin_path in plugin_paths:
            if plugin_module := _load_and_init_plugin_module(plugin_path, app):
                PLUGINS_LOADED.append(plugin_module)

                plugin_sidebar = plugin_module.PLUGIN_INFO["sidebar"]
                for sidebar_section, sidebar_data in plugin_sidebar.items():
                    PLUGINS_SIDEBAR[sidebar_section].extend(sidebar_data)

    # Inject plugins sidebar entries.
    @app.context_processor
    def inject_plugins_sidebars():
        sidebar_plugins = {}
        for sidebar_section in SIDEBAR_SECTIONS:
            sidebar_plugins[sidebar_section] = []
            for sidebar_section_plugin in PLUGINS_SIDEBAR[sidebar_section]:
                requires_context = sidebar_section_plugin.get(
                    "requires_campaign_context", False
                )
                if not requires_context or (
                    requires_context and flask.g.campaign_ctxt.has_campaign
                ):
                    sidebar_plugins[sidebar_section].append(sidebar_section_plugin)
        return dict(sidebar_plugins=sidebar_plugins)


def _load_and_init_plugin_module(plugin_path, app):
    plugin_path = Path(plugin_path)
    if plugin_path.exists():
        plugin_module = import_module(plugin_path.parent.name, plugin_path)
        try:
            check_required_ui_version(plugin_module.REQUIRED_UI_VERSION)
        except BEMServerUIVersionError as exc:
            BSUI_PLUGINS_LOGGER.error(str(exc))
        else:
            plugin_module.init_app(app)
            BSUI_PLUGINS_LOGGER.debug("%s plugin loaded!", plugin_module.__name__)
            return plugin_module
    return None


def check_required_ui_version(plugin_req_ui_version):
    try:
        version_ui = Version(bemserver_ui.__version__)
    except InvalidVersion as exc:
        raise BEMServerUIVersionError(f"Invalid UI version: {str(exc)}")
    version_min = plugin_req_ui_version["min"]
    version_max = plugin_req_ui_version["max"]
    if not (version_min <= version_ui < version_max):
        raise BEMServerUIVersionError(
            f"UI version ({str(version_ui)}) not supported!"
            f" (expected: >={str(version_min)},<{str(version_max)})"
        )

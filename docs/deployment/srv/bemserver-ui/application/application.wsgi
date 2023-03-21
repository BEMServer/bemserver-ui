import os
from pathlib import Path

from bemserver_ui import create_app  # noqa: E402

# Provide paath to custom settings file
os.environ["BEMSERVER_UI_SETTINGS_FILE"] = str(
    Path(__file__).parent.resolve() / "settings.cfg"
)

application = create_app()

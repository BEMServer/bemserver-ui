"""Extension to get partners data from `BEMSERVER_PARTNERS_FILE` extra config file."""
import json
from pathlib import Path


def init_app(app):
    @app.context_processor
    def inject_partners():
        partners_data = dict()

        partners_file = app.config.get("BEMSERVER_PARTNERS_FILE")
        if partners_file is not None:
            partners_filepath = Path(partners_file)
            if partners_filepath.exists():
                with partners_filepath.open("r", encoding="utf-8") as json_file:
                    partners_data["partners"] = json.load(json_file)

                for partner in partners_data["partners"]:
                    if "project_logo" in partners_data:
                        break
                    for partner_name, partner_data in partner.items():
                        if partner_data.get("use_as_project_logo", False):
                            partners_data["project_logo"] = {
                                "name": partner_name,
                                "url": partner_data["url"],
                                "src": partner_data["logo"]["src"],
                            }
                            break

        return partners_data

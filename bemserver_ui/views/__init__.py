"""Application views"""
from . import auth
from . import main
from . import users
from . import user_groups
from . import campaigns
from . import campaign_scopes
from . import structural_elements


MODULES = (
    auth,
    main,
    users,
    user_groups,
    campaigns,
    campaign_scopes,
    structural_elements.structural_elements,
    structural_elements.sites,
    structural_elements.buildings,
    structural_elements.storeys,
    structural_elements.spaces,
    structural_elements.zones,
    structural_elements.structural_element_properties,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)

"""Application views"""
from . import auth
from . import main
from . import users
from . import user_groups
from . import campaigns
from . import campaign_scopes
from . import structural_elements
from . import timeseries
from . import services
from . import analysis
from . import events
from . import notifications


MODULES = (
    auth,
    main,
    users,
    user_groups,
    campaigns,
    campaign_scopes,
    structural_elements,
    timeseries,
    events,
    notifications,
    services,
    analysis,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        module.init_app(app)

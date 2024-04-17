"""Application views"""

from . import (
    analysis,
    auth,
    campaign_scopes,
    campaigns,
    events,
    main,
    notifications,
    services,
    structural_elements,
    timeseries,
    user_groups,
    users,
)

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

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


MODULES = (
    auth,
    main,
    users,
    user_groups,
    campaigns,
    campaign_scopes,
    structural_elements.structural_elements,
    structural_elements.structural_element_properties,
    timeseries.timeseries,
    timeseries.timeseries_datastates,
    timeseries.timeseries_properties,
    timeseries.timeseries_data,
    events.events,
    events.event_categories,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)

    services.init_app(app)
    analysis.init_app(app)

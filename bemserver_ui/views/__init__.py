"""Application views"""
from . import auth
from . import main
from . import users
from . import user_groups
from . import campaigns
from . import campaign_scopes


MODULES = (
    auth,
    main,
    users,
    user_groups,
    campaigns,
    campaign_scopes,
)


def init_app(app):
    """Init application views"""
    for module in MODULES:
        app.register_blueprint(module.blp)

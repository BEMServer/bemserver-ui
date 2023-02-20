"""All events views"""
from . import events  # noqa
from . import categories  # noqa


def init_app(app):
    events.blp.register_blueprint(categories.blp)
    app.register_blueprint(events.blp)

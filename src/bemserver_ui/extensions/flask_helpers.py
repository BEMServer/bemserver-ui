"""Monkey patch flask helpers such as flash and get_flashed_messages."""

import json

import flask
from flask.globals import request_ctx


def _flash(
    message,
    category="message",
    *,
    delay=None,
    is_dismissible=True,
    validation_errors=None,
):
    """As the original implementation, flashes a message to the next request.

    .. *New* parameters:
    :param delay: time in seconds after which the message will be closed.
        ``None`` produces messages with no timer (and allows manual close).
    :param is_dismissible: ``False`` if message must not be closed manually.
    :param validation_errors: dict that contains details on validation errors
    """
    validation_errors = json.dumps(validation_errors)

    flashes = flask.session.get("_flashes", [])
    flashes.append((category, message, delay, is_dismissible, validation_errors))
    flask.session["_flashes"] = flashes
    app = flask.current_app._get_current_object()
    flask.message_flashed.send(
        app,
        _async_wrapper=app.ensure_sync,
        message=message,
        category=category,
        validation_errors=validation_errors,
        delay=delay,
        is_dismissible=is_dismissible,
    )


def _get_flashed_messages(with_categories=False, category_filter=()):
    flashes = request_ctx.flashes
    if flashes is None:
        flashes = flask.session.pop("_flashes") if "_flashes" in flask.session else []
        request_ctx.flashes = flashes
    if category_filter:
        flashes = list(filter(lambda f: f[0] in category_filter, flashes))
    if not with_categories:
        # Patch is here: just not return message text only, but all other parameters.
        return [x[1:] for x in flashes]
    return flashes


def init_app(app):
    # Monkey patch main flask.flash function.
    flask.flash = _flash

    # Monkey patch flask.get_flashed_messages function.
    flask.get_flashed_messages = _get_flashed_messages
    # Also used in jinja templates.
    app.jinja_env.globals["get_flashed_messages"] = _get_flashed_messages

"""Improve web application security, following Flask's security considerations,
using flask-talisman and flask-wtf (for CSRF) extensions.

See https://flask.palletsprojects.com/en/3.0.x/web-security/

Check CSP with https://csp-evaluator.withgoogle.com/
"""

import flask
from flask_talisman import Talisman
from flask_wtf.csrf import CSRFProtect, generate_csrf

csrf = CSRFProtect()


def init_app(app):
    csrf.init_app(app)

    @app.after_request
    def inject_csrf_token(response):
        if flask.request.endpoint not in (
            "static",
            "flask_es6_endpoints",
            "es6_signed_user",
            "generate_timezones_es6_module",
        ) and not flask.request.endpoint.startswith("api."):
            response.set_cookie(
                app.config.get("WTF_CSRF_FIELD_NAME", "csrf_token"),
                generate_csrf(),
                samesite=app.config.get("SESSION_COOKIE_SAMESITE", "Lax"),
                secure=app.config.get("WTF_CSRF_SSL_STRICT", True),
            )
        return response

    # Whitelist domains for content security policy.
    csp = {
        "base-uri": [
            "'self'",
        ],
        "default-src": [
            "'self'",
            "*.jsdelivr.net",
        ],
        "img-src": [
            "'self' data:",
        ],
        "style-src": [
            "'self'",
        ],
        "style-src-elem": [
            "'self'",
            "*.jsdelivr.net",
        ],
        "style-src-attr": [
            "'self'",
            # TODO: to be removed after echarts csp issues fixes in version 5.5.1
            "'unsafe-inline' *.jsdelivr.net",
        ],
        "script-src": [
            "'strict-dynamic'",
            "'unsafe-inline' https:",  # backward compatibility for older browsers
        ],
        "script-src-attr": [
            "'none'",
        ],
        "form-action": [
            "'self'",
        ],
        "object-src": [
            "'none'",
        ],
    }

    csp_nonce = [
        "style-src-elem",
        "script-src",
    ]

    Talisman(
        app,
        content_security_policy=csp,
        content_security_policy_nonce_in=csp_nonce,
    )

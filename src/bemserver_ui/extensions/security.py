"""Improve web application security, following Flask's security considerations,
using flask-talisman extension.

See https://flask.palletsprojects.com/en/3.0.x/web-security/

Check CSP with https://csp-evaluator.withgoogle.com/
"""

from flask_talisman import Talisman


def init_app(app):
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

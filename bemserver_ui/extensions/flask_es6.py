"""FlaskES6 extension aims to reproduce flask.url_for feature for client side.

Inspired from https://github.com/stewartpark/Flask-JSGlue/blob/master/flask_jsglue.py
"""
import flask
import re
import json


def init_app(app):

    rule_parser = re.compile(r"<(.+?)>")
    splitter = re.compile(r"<.+?>")

    @app.route(f"{app.static_url_path}/scripts/modules/flaskES6-endpoints.js")
    def flask_es6_endpoints():
        rules = {}
        app_root = flask.current_app.config.get("APPLICATION_ROOT", "/") or "/"
        for r in flask.current_app.url_map.iter_rules():
            if flask.request.endpoint == r.endpoint:
                continue
            rule = r.rule if app_root == "/" else f"{app_root}{r.rule}"
            rule_args = [x.split(":")[-1] for x in rule_parser.findall(rule)]
            rule_tr = splitter.split(rule)
            rules[r.endpoint] = (rule_tr, rule_args)

        es6_endpoints = f"export const flaskEndpoints = {json.dumps(rules)};"

        return flask.make_response(
            (es6_endpoints, 200, {"Content-Type": "text/javascript"})
        )

============
BEMServer UI
============

.. image:: https://img.shields.io/pypi/v/bemserver-ui.svg
    :target: https://pypi.org/project/bemserver-ui/
    :alt: Latest version

.. image:: https://img.shields.io/pypi/pyversions/bemserver-ui.svg
    :target: https://pypi.org/project/bemserver-ui/
    :alt: Python versions

.. image:: https://github.com/BEMServer/bemserver-ui/actions/workflows/build-release.yaml/badge.svg
    :target: https://github.com/bemserver/bemserver-ui/actions?query=workflow%3Abuild
    :alt: Build status

.. image:: https://results.pre-commit.ci/badge/github/BEMServer/bemserver-ui/main.svg
   :target: https://results.pre-commit.ci/latest/github/BEMServer/bemserver-ui/main
   :alt: pre-commit.ci status


BEMServer is a free Building Energy Management software platform.

Its purpose is to store data collected in buildings and produce useful information such as performance indicators or alerts.


Installation
============

Settings
--------

Flask custom var config available:

    **BEMSERVER_API_HOST = "localhost"**
        API host name (and port)
    **BEMSERVER_API_USE_SSL = True**
        Is API published through SSL?
    **BEMSERVER_API_AUTH_METHOD = "jwt"**
        API authentication method: "jwt" (preferred and default, fastest) or "http_basic"
    **BEMSERVER_UI_TIMEZONE_NAME = "UTC"**
        Default application timezone name, when not overrided campaign timezone
    **BEMSERVER_UI_NOTIFICATION_UPDATER_DELAY = 60000**
        Delay, in seconds, between each check of new notifications
    **BEMSERVER_UI_USER_GUIDE_URL = https://bemserver-docs.readthedocs.io/en/latest/user_guide.html**
        User guide URL
    *(optional)* **BEMSERVER_UI_PARTNERS_FILE = None**
        Absolute path of json file that describes the project's partners

        Example of ``BEMSERVER_UI_PARTNERS_FILE`` file structure::

            [
                {
                    "Nobatek/INEF4": {
                        "use_as_project_logo": true,
                        "url": "https://nobatek.inef4.com",
                        "logo": {
                            "style": "height: 50px;",
                            "src": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pg0KPCEtLSBVcGxvYWRlZCB0bzogU1ZHIFJlcG8sIHd3dy5zdmdyZXBvLmNvbSwgR2VuZXJhdG9yOiBTVkcgUmVwbyBNaXhlciBUb29scyAtLT4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8c3ZnIGZpbGw9IiMwMDAwMDAiIHZlcnNpb249IjEuMSIgaWQ9IkNhcGFfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgDQoJIHdpZHRoPSI4MDBweCIgaGVpZ2h0PSI4MDBweCIgdmlld0JveD0iMCAwIDEwMy42OTUgMTAzLjY5NiINCgkgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+DQo8Zz4NCgk8cGF0aCBkPSJNNjkuNTI5LDU2LjE1NEgzNC4xNjhjLTQuNjg3LDAtOC40ODYsMy43OTktOC40ODYsOC40ODV2OS43NTJjMCw0LjY4NywzLjc5OSw4LjQ4Niw4LjQ4Niw4LjQ4NmgzNS4zNjENCgkJYzQuNjg4LDAsOC40ODYtMy44MDEsOC40ODYtOC40ODZ2LTkuNzUyQzc4LjAxNiw1OS45NTMsNzQuMjE1LDU2LjE1NCw2OS41MjksNTYuMTU0eiBNMzcuNzczLDc5LjU3NGgtNS4zMjINCgkJYy0xLjI5Ny0wLjkzOC0yLjI3MS0yLjI5My0yLjcyNS0zLjg3MXYtNC4xNzdoOC4wNDdWNzkuNTc0eiBNMzcuNzczLDY3LjUwMmgtOC4wNDd2LTQuMTc0YzAuNDU0LTEuNTc4LDEuNDI4LTIuOTM0LDIuNzI1LTMuODczDQoJCWg1LjMyMlY2Ny41MDJ6IE00OS44MjksNzkuNTc0aC04LjAzM3YtOC4wNDhoOC4wMzNWNzkuNTc0eiBNNDkuODI5LDY3LjUwMmgtOC4wMzN2LTguMDQ3aDguMDMzVjY3LjUwMnogTTYxLjksNzkuNTc0aC04LjAzMw0KCQl2LTguMDQ4SDYxLjlWNzkuNTc0eiBNNjEuOSw2Ny41MDJoLTguMDMzdi04LjA0N0g2MS45VjY3LjUwMnogTTczLjk3MSw3NS43MDNjLTAuNDU1LDEuNTc4LTEuNDI5LDIuOTMzLTIuNzI2LDMuODcxaC01LjMyMXYtOC4wNDgNCgkJaDguMDQ3Vjc1LjcwM3ogTTczLjk3MSw2Ny41MDJoLTguMDQ3di04LjA0N2g1LjMyMWMxLjI5NywwLjkzOSwyLjI3MSwyLjI5NSwyLjcyNiwzLjg3M1Y2Ny41MDJ6IE0zMC42MzEsMzguOTMzDQoJCWMwLTMuNDIyLDIuNzc3LTYuMTk5LDYuMjAxLTYuMTk5YzMuNDIzLDAsNi4yLDIuNzc3LDYuMiw2LjE5OWMwLDMuNDI4LTIuNzc3LDYuMjAzLTYuMiw2LjIwMw0KCQlDMzMuNDA4LDQ1LjEzNiwzMC42MzEsNDIuMzYxLDMwLjYzMSwzOC45MzN6IE04NS40NjcsMEgxOC4yM0M4LjE3OCwwLDAsOC4xNzksMCwxOC4yM3Y2Ny4yMzVjMCwxMC4wNTMsOC4xNzgsMTguMjI5LDE4LjIzLDE4LjIyOQ0KCQloNjcuMjM1YzEwLjA1MywwLDE4LjIzLTguMTc5LDE4LjIzLTE4LjIyOVYxOC4yMzFDMTAzLjY5Niw4LjE3OSw5NS41MTgsMCw4NS40NjcsMHogTTk1LjExNywxOC4yMzF2MzguNjIxTDc5Ljc1OCw0My44MzYNCgkJYzAuODczLTEuNzU4LDEuMzc1LTMuNzMsMS4zNzUtNS44MjRjMC03LjI2Mi01LjkwNi0xMy4xNjYtMTMuMTY2LTEzLjE2NmMtMy4wMSwwLTUuNzc3LDEuMDI1LTcuOTk2LDIuNzNMMzcuNzA0LDguNTc5aDQ3Ljc2Mw0KCQlDOTAuNzg3LDguNTc5LDk1LjExNywxMi45MSw5NS4xMTcsMTguMjMxeiBNODUuNDY3LDk1LjExOUgxOC4yM2MtNS4zMjEsMC05LjY1MS00LjMzLTkuNjUxLTkuNjUxVjE4LjIzMQ0KCQljMC01LjMyMiw0LjMzLTkuNjUyLDkuNjUxLTkuNjUyaDE0LjM5MWwyNC45OTgsMjEuMzE4Yy0xLjc1OSwyLjI0LTIuODE4LDUuMDUzLTIuODE4LDguMTE1YzAsNy4yNiw1LjkwNywxMy4xNjYsMTMuMTY2LDEzLjE2Ng0KCQljMy45NzksMCw3LjU0My0xLjc3OSw5Ljk1OS00LjU3OGwxNy4xOTEsMTQuNTE3djI0LjM1Qzk1LjExNyw5MC43ODgsOTAuNzg3LDk1LjExOSw4NS40NjcsOTUuMTE5eiIvPg0KPC9nPg0KPC9zdmc+"
                        }
                    }
                },
                {
                    "Flask": {
                        "url": "https://flask.palletsprojects.com/en/latest/",
                        "logo": {
                            "style": "height: 50px;",
                            "src": "https://flask.palletsprojects.com/en/latest/_images/flask-logo.png"
                        },
                        "text": "The Python micro framework for building web applications."
                    }
                }
            ]

    *(optional)* **BEMSERVER_UI_PLUGINS = None**
        List of absolute file paths that locate the ``__init__.py`` file from each UI plugin package to load

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
    **BEMSERVER_API_AUTH_METHOD = "http_basic"**
        API authentication method
    **BEMSERVER_TIMEZONE_NAME = "UTC"**
        Default application timezone name, when not overrided campaign timezone
    **BEMSERVER_NOTIFICATION_UPDATER_DELAY = 60000**
        Delay, in seconds, between each check of new notifications
    *(optional)* **BEMSERVER_PARTNERS_FILE = None**
        Absolute path of json file that describes the project's partners

        Example of ``BEMSERVER_PARTNERS_FILE`` file structure::

            [
                {
                    "Nobatek/INEF4": {
                        "use_as_project_logo": true,
                        "url": "https://nobatek.inef4.com",
                        "logo": {
                            "style": "height: 50px;",
                            "src": "https://www.nobatek.inef4.com/wp-content/uploads/2017/08/logo-transp-2.png"
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

    *(optional)* **BEMSERVER_PLUGINS = None**
        List of absolute folder paths that locate the ``__init__.py`` file from each UI plugin package to load

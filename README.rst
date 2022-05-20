============
BEMServer UI
============


Installation
============


Settings
--------

Flask var config available::

BEMSERVER_API_HOST = "localhost"
    API host name (and port)
BEMSERVER_API_USE_SSL = True
    Is API published through SSL?
BEMSERVER_API_AUTH_METHOD = "http_basic"
    API authentication method
BEMSERVER_PARTNERS_FILE = None
    json file that describes the project's partners

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

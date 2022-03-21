"""Index page"""
import flask

from bemserver_ui.extensions import auth


blp = flask.Blueprint("main", __name__)


@blp.route("/")
@blp.route("/index")
@blp.route("/home")
@auth.signin_required
def index():
    return flask.render_template("pages/home.html")

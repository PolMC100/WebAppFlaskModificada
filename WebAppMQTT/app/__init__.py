from flask import Flask

def create_app():
    app = Flask(__name__)
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

    @app.after_request
    def disable_cache(response):
        # Experimental sessions: always load the current interface from Flask.
        response.headers['Cache-Control'] = 'no-store'
        return response

    from .routes import main
    app.register_blueprint(main)

    return app

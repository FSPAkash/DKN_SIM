from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .config import Config
import os

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['*']), supports_credentials=True)
    jwt.init_app(app)
    
    # Ensure data directory exists
    data_dir = app.config.get('DATA_DIR', os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data'))
    os.makedirs(data_dir, exist_ok=True)
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.forecast import forecast_bp
    from .routes.data import data_bp
    from .routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(forecast_bp, url_prefix='/api/forecast')
    app.register_blueprint(data_bp, url_prefix='/api/data')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Health check endpoint for Railway
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'Daikin Forecast Simulator API',
            'environment': os.environ.get('RAILWAY_ENVIRONMENT', 'development')
        }), 200
    
    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            'name': 'Daikin Forecast Simulator API',
            'version': '1.0.0',
            'health': '/api/health'
        }), 200
    
    return app
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Importar configuración
    from config import Config
    app.config.from_object(Config)
    
    # Inicializar extensiones
    db.init_app(app)
    
    # Registrar rutas
    from app.routes import main
    app.register_blueprint(main)
    
    return app
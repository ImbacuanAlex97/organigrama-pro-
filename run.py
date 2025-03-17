from app import create_app, db
from app.models import Nodo

app = create_app()

with app.app_context():
    # Crear todas las tablas
    db.create_all()
    print("¡Tablas creadas correctamente!")

if __name__ == '__main__':
    app.run(debug=True)
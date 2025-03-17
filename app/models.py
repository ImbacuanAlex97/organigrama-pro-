from app import db
from datetime import datetime

class Nodo(db.Model):
    __tablename__ = 'nodos'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    cargo = db.Column(db.String(50), nullable=False)  # 'directo' o 'asesoria'
    nivel_jerarquico = db.Column(db.Integer, nullable=False)
    padre_id = db.Column(db.Integer, db.ForeignKey('nodos.id'), nullable=True)
    posicion_x = db.Column(db.Float, nullable=False, default=0)
    posicion_y = db.Column(db.Float, nullable=False, default=0)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    hijos = db.relationship('Nodo', backref=db.backref('padre', remote_side=[id]), 
                           cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Nodo {self.nombre} - Nivel {self.nivel_jerarquico}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'cargo': self.cargo,
            'nivel_jerarquico': self.nivel_jerarquico,
            'padre_id': self.padre_id,
            'posicion_x': self.posicion_x,
            'posicion_y': self.posicion_y,
            'hijos': [hijo.id for hijo in self.hijos]
        }
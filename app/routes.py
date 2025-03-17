from flask import Blueprint, render_template, request, jsonify
from app import db
from app.models import Nodo

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/api/nodos', methods=['GET'])
def get_nodos():
    nodos = Nodo.query.all()
    return jsonify([nodo.to_dict() for nodo in nodos])

@main.route('/api/nodos', methods=['POST'])
def create_nodo():
    data = request.json
    
    nuevo_nodo = Nodo(
        nombre=data['nombre'],
        cargo=data['cargo'],
        nivel_jerarquico=data['nivel_jerarquico'],
        padre_id=data.get('padre_id'),
        posicion_x=data.get('posicion_x', 0),
        posicion_y=data.get('posicion_y', 0)
    )
    
    db.session.add(nuevo_nodo)
    db.session.commit()
    
    return jsonify(nuevo_nodo.to_dict()), 201

@main.route('/api/nodos/<int:nodo_id>', methods=['PUT'])
def update_nodo(nodo_id):
    nodo = Nodo.query.get_or_404(nodo_id)
    data = request.json
    
    nodo.nombre = data.get('nombre', nodo.nombre)
    nodo.cargo = data.get('cargo', nodo.cargo)
    nodo.posicion_x = data.get('posicion_x', nodo.posicion_x)
    nodo.posicion_y = data.get('posicion_y', nodo.posicion_y)
    
    db.session.commit()
    
    return jsonify(nodo.to_dict())

@main.route('/api/nodos/<int:nodo_id>', methods=['DELETE'])
def delete_nodo(nodo_id):
    nodo = Nodo.query.get_or_404(nodo_id)
    db.session.delete(nodo)
    db.session.commit()
    
    return '', 204
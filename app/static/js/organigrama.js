document.addEventListener('DOMContentLoaded', function () {
    const organigramaEl = document.getElementById('organigrama');
    const btnCrearPrincipal = document.getElementById('btn-crear-principal');
    const formEdicion = document.getElementById('form-edicion');
    const inputNodoId = document.getElementById('nodo-id');
    const inputNombreNodo = document.getElementById('nombre-nodo');
    const selectCargoNodo = document.getElementById('cargo-nodo');
    const btnGuardar = document.getElementById('btn-guardar');
    const btnCancelar = document.getElementById('btn-cancelar');
    const btnEliminar = document.getElementById('btn-eliminar');
    const zoomControls = document.createElement('div');

    // Configuración del organigrama
    const config = {
        nodoAncho: 150,
        nodoAlto: 80,
        margenHorizontal: 50,
        margenVertical: 110,
        distanciaEntreHermanos: 180,
        escala: 1,
        minEscala: 0.5,
        maxEscala: 2,
        pasoEscala: 0.1
    };

    // Variables de estado
    let nodos = [];
    let nodoSeleccionado = null;
    let dragging = false;

    // Inicializar controles de zoom
    function inicializarControlesZoom() {
        zoomControls.className = 'zoom-controls';
        zoomControls.innerHTML = `
            <button id="btn-zoom-in">+</button>
            <button id="btn-zoom-out">-</button>
            <button id="btn-zoom-reset">Reset</button>
        `;
        document.querySelector('.organigrama-container').appendChild(zoomControls);

        document.getElementById('btn-zoom-in').addEventListener('click', () => aplicarZoom(config.pasoEscala));
        document.getElementById('btn-zoom-out').addEventListener('click', () => aplicarZoom(-config.pasoEscala));
        document.getElementById('btn-zoom-reset').addEventListener('click', () => resetZoom());
    }

    // Función para aplicar zoom
    function aplicarZoom(incremento) {
        let nuevaEscala = config.escala + incremento;
        nuevaEscala = Math.max(config.minEscala, Math.min(config.maxEscala, nuevaEscala));

        if (nuevaEscala !== config.escala) {
            config.escala = nuevaEscala;
            organigramaEl.style.transform = `scale(${config.escala})`;
            organigramaEl.style.transformOrigin = 'center top';
        }
    }

    // Función para resetear zoom
    function resetZoom() {
        config.escala = 1;
        organigramaEl.style.transform = 'scale(1)';
    }

    // Cargar nodos existentes desde la API
    function cargarNodos() {
        fetch('/api/nodos')
            .then(response => response.json())
            .then(data => {
                nodos = data;
                calcularDisposicionOptima();
                dibujarOrganigrama();
            })
            .catch(error => console.error('Error al cargar nodos:', error));
    }

    // Función para calcular la disposición óptima de los nodos
    function calcularDisposicionOptima() {
        const raiz = nodos.find(n => n.nivel_jerarquico === 1);
        if (!raiz) return;

        // Posicionar el nodo raíz en el centro superior
        raiz.posicion_x = (organigramaEl.clientWidth / 2) - (config.nodoAncho / 2);
        raiz.posicion_y = 20;

        // Agrupar nodos por nivel jerárquico
        const nodosNivelados = agruparNodosPorNivel();

        // Calcular posiciones para cada nivel, comenzando desde el nivel 2
        Object.keys(nodosNivelados)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach(nivel => {
                if (nivel === '1') return; // Saltar el nivel 1 (raíz)
                const nodosNivel = nodosNivelados[nivel];
                calcularPosicionesNivel(nodosNivel, nodosNivelados);
            });

        // Actualizar posiciones en la base de datos
        const promesas = nodos.map(nodo =>
            fetch(`/api/nodos/${nodo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    posicion_x: nodo.posicion_x,
                    posicion_y: nodo.posicion_y
                })
            })
        );

        return Promise.all(promesas);
    }

    // Función para agrupar nodos por nivel jerárquico
    function agruparNodosPorNivel() {
        const nodosPorNivel = {};
        nodos.forEach(nodo => {
            const nivel = nodo.nivel_jerarquico;
            if (!nodosPorNivel[nivel]) {
                nodosPorNivel[nivel] = [];
            }
            nodosPorNivel[nivel].push(nodo);
        });
        return nodosPorNivel;
    }

    // Calcular posiciones para un nivel específico
    function calcularPosicionesNivel(nodosNivel, nodosNivelados) {
        nodosNivel.forEach(nodo => {
          const padre = nodos.find(n => n.id === nodo.padre_id);
          if (!padre) return;
      
          // Encontrar todos los hijos del mismo padre en este nivel
          const hermanos = nodosNivel.filter(n => n.padre_id === padre.id);
          const indiceHermano = hermanos.indexOf(nodo);
          const totalHermanos = hermanos.length;
      
          // Calcular la posición Y basada en el nivel
          nodo.posicion_y = padre.posicion_y + config.margenVertical;
      
          // Aplicar lógica de posicionamiento para todos los niveles
          if (totalHermanos === 1) {
            // Si es hijo único, se posiciona centrado respecto al padre
            nodo.posicion_x = padre.posicion_x + (config.nodoAncho / 2) - (config.nodoAncho / 2);
          } else {
            // Si hay múltiples hermanos, calcular distribución simétrica
            const anchoTotal = totalHermanos * config.nodoAncho + (totalHermanos - 1) * config.margenHorizontal;
            const inicioX = padre.posicion_x + (config.nodoAncho / 2) - (anchoTotal / 2);
            nodo.posicion_x = inicioX + indiceHermano * (config.nodoAncho + config.margenHorizontal);
          }
        });
      
        // Verificar y ajustar superposiciones
        for (let i = 0; i < nodosNivel.length; i++) {
          for (let j = i + 1; j < nodosNivel.length; j++) {
            if (nodosNivel[i].posicion_x < nodosNivel[j].posicion_x + config.nodoAncho &&
                nodosNivel[i].posicion_x + config.nodoAncho > nodosNivel[j].posicion_x &&
                nodosNivel[i].posicion_y < nodosNivel[j].posicion_y + config.nodoAlto &&
                nodosNivel[i].posicion_y + config.nodoAlto > nodosNivel[j].posicion_y) {
              // Ajustar la posición del nodo j para evitar superposición
              nodosNivel[j].posicion_x += config.nodoAncho + config.margenHorizontal;
            }
          }
        }
      }
      

    // Dibujar organigrama completo
    function dibujarOrganigrama() {
        organigramaEl.innerHTML = '';
        dibujarConexiones();
        nodos.forEach(nodo => dibujarNodo(nodo));
    }

    // Dibujar un nodo individual
    function dibujarNodo(nodo) {
        const nodoEl = document.createElement('div');
        nodoEl.className = `nodo nivel-${nodo.nivel_jerarquico}`;
        nodoEl.setAttribute('data-id', nodo.id);
        nodoEl.style.left = `${nodo.posicion_x}px`;
        nodoEl.style.top = `${nodo.posicion_y}px`;
        nodoEl.style.width = `${config.nodoAncho}px`;
        nodoEl.style.height = `${config.nodoAlto}px`;
        nodoEl.innerHTML = `
          <div class="nodo-header">${nodo.nombre}</div>
          <div class="nodo-body">${nodo.cargo === 'directo' ? 'Cargo Directo' : 'Asesoría'}</div>
        `;
        nodoEl.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!dragging) {
            seleccionarNodo(nodo.id);
          }
        });
        nodoEl.addEventListener('mouseover', function (e) {
          if (!dragging) {
            mostrarOpcionesNodo(e, nodo);
          }
        });
        nodoEl.addEventListener('mouseout', function (e) {
          if (!dragging) {
            setTimeout(() => {
              const opcionesEl = document.getElementById('opciones-nodo');
              if (opcionesEl && !opcionesEl.matches(':hover')) {
                ocultarOpcionesNodo();
              }
            }, 100);
          }
        });
        habilitarArrastre(nodoEl, nodo);
        organigramaEl.appendChild(nodoEl);
    }

    // Dibujar conexiones entre nodos
    function dibujarConexiones() {
        // Agregar estilos primero
        agregarEstilosConexiones();
        
        // Eliminar conexiones existentes
        organigramaEl.querySelectorAll('.conexion').forEach(conn => conn.remove());
        
        // Primero dibujar las conexiones directas
        nodos.forEach(nodo => {
          if (nodo.padre_id && nodo.cargo === 'directo') {
            const padre = nodos.find(n => n.id === nodo.padre_id);
            if (padre) {
              crearConexion(padre, nodo);
            }
          }
        });
        
        // Luego dibujar las conexiones de asesoría para que sean visibles por encima
        nodos.forEach(nodo => {
          if (nodo.padre_id && nodo.cargo === 'asesoria') {
            const padre = nodos.find(n => n.id === nodo.padre_id);
            if (padre) {
              crearConexion(padre, nodo);
            }
          }
        });
    }

    // Crear una conexión visual entre dos nodos
    function crearConexion(nodoPadre, nodoHijo) {
        const tipoLinea = nodoHijo.cargo === 'directo' ? 'conexion-directa' : 'conexion-asesoria';
        
        // Puntos de origen (centro inferior del padre)
        const xPadre = nodoPadre.posicion_x + (config.nodoAncho / 2);
        const yPadre = nodoPadre.posicion_y + config.nodoAlto;
        
        // Puntos de destino (centro superior del hijo)
        const xHijo = nodoHijo.posicion_x + (config.nodoAncho / 2);
        const yHijo = nodoHijo.posicion_y;
        
        // Punto intermedio a la mitad del camino vertical
        const yMedio = yPadre + (yHijo - yPadre) / 2;
        
        // 1. Línea vertical desde el padre hasta el punto medio
        const lineaVertical1 = document.createElement('div');
        lineaVertical1.className = `conexion ${tipoLinea} vertical`;
        lineaVertical1.style.width = '2px';
        lineaVertical1.style.height = `${(yHijo - yPadre) / 2}px`;
        lineaVertical1.style.left = `${xPadre}px`;
        lineaVertical1.style.top = `${yPadre}px`;
        
        // Si es de asesoría, aplicar estilo de línea discontinua
        if (tipoLinea === 'conexion-asesoria') {
          lineaVertical1.style.borderLeft = 'none';
          lineaVertical1.style.borderRight = '2px dashed #666';
          lineaVertical1.style.backgroundColor = 'transparent';
        }
        
        organigramaEl.appendChild(lineaVertical1);
        
        // 2. Línea horizontal desde el punto medio hasta la posición del hijo
        const lineaHorizontal = document.createElement('div');
        lineaHorizontal.className = `conexion ${tipoLinea} horizontal`;
        lineaHorizontal.style.height = '2px';
        lineaHorizontal.style.top = `${yMedio}px`;
        
        // Determinar dirección y ancho de la línea horizontal
        if (xHijo > xPadre) {
          lineaHorizontal.style.left = `${xPadre}px`;
          lineaHorizontal.style.width = `${xHijo - xPadre}px`;
        } else {
          lineaHorizontal.style.left = `${xHijo}px`;
          lineaHorizontal.style.width = `${xPadre - xHijo}px`;
        }
        
        // Si es de asesoría, aplicar estilo de línea discontinua
        if (tipoLinea === 'conexion-asesoria') {
          lineaHorizontal.style.borderBottom = 'none';
          lineaHorizontal.style.borderTop = '2px dashed #666';
          lineaHorizontal.style.backgroundColor = 'transparent';
        }
        
        organigramaEl.appendChild(lineaHorizontal);
        
        // 3. Línea vertical desde el punto medio hasta el hijo
        const lineaVertical2 = document.createElement('div');
        lineaVertical2.className = `conexion ${tipoLinea} vertical`;
        lineaVertical2.style.width = '2px';
        lineaVertical2.style.height = `${(yHijo - yPadre) / 2}px`;
        lineaVertical2.style.left = `${xHijo}px`;
        lineaVertical2.style.top = `${yMedio}px`;
        
        // Si es de asesoría, aplicar estilo de línea discontinua
        if (tipoLinea === 'conexion-asesoria') {
          lineaVertical2.style.borderLeft = 'none';
          lineaVertical2.style.borderRight = '2px dashed #666';
          lineaVertical2.style.backgroundColor = 'transparent';
        }
        
        organigramaEl.appendChild(lineaVertical2);
    }
    
    // Actualiza el CSS para los estilos de las conexiones
    function agregarEstilosConexiones() {
        // Verificar si ya existe el estilo
        if (!document.getElementById('estilos-conexiones')) {
          const estilos = document.createElement('style');
          estilos.id = 'estilos-conexiones';
          estilos.textContent = `
            .conexion {
              position: absolute;
              pointer-events: none;
              z-index: 1;
            }
            .conexion-directa {
              background-color: #333;
            }
            .conexion-asesoria {
              background-color: transparent;
            }
            .conexion.vertical.conexion-asesoria {
              border-right: 2px dashed #666;
              border-left: none;
            }
            .conexion.horizontal.conexion-asesoria {
              border-top: 2px dashed #666;
              border-bottom: none;
            }
          `;
          document.head.appendChild(estilos);
        }
    }

    // Mostrar opciones al pasar el mouse sobre un nodo
    function mostrarOpcionesNodo(event, nodo) {
    ocultarOpcionesNodo(); // Ocultar cualquier cuadro de opciones existente
  
    const opcionesEl = document.createElement('div');
    opcionesEl.className = 'nodo-opciones';
    opcionesEl.id = 'opciones-nodo';
    const rect = event.target.closest('.nodo').getBoundingClientRect();
    const organigramaRect = organigramaEl.getBoundingClientRect();
    opcionesEl.style.left = `${rect.left - organigramaRect.left + rect.width}px`;
    opcionesEl.style.top = `${rect.top - organigramaRect.top}px`;
  
    const btnSubordinado = document.createElement('button');
    btnSubordinado.className = 'opcion-btn';
    btnSubordinado.textContent = 'Agregar subordinado directo';
    btnSubordinado.addEventListener('click', function (e) {
      e.stopPropagation();
      agregarNuevoNodo(nodo.id, 'directo', nodo.nivel_jerarquico + 1);
      ocultarOpcionesNodo();
    });
    opcionesEl.appendChild(btnSubordinado);
  
    const btnAsesor = document.createElement('button');
    btnAsesor.className = 'opcion-btn';
    btnAsesor.textContent = 'Agregar asesor';
    btnAsesor.addEventListener('click', function (e) {
      e.stopPropagation();
      agregarNuevoNodo(nodo.id, 'asesoria', nodo.nivel_jerarquico + 1);
      ocultarOpcionesNodo();
    });
    opcionesEl.appendChild(btnAsesor);
  
    const btnEditar = document.createElement('button');
    btnEditar.className = 'opcion-btn';
    btnEditar.textContent = 'Editar nodo';
    btnEditar.addEventListener('click', function (e) {
      e.stopPropagation();
      seleccionarNodo(nodo.id);
      ocultarOpcionesNodo();
    });
    opcionesEl.appendChild(btnEditar);
  
    const btnEliminarNodo = document.createElement('button');
    btnEliminarNodo.className = 'opcion-btn opcion-eliminar';
    btnEliminarNodo.textContent = 'Eliminar nodo';
    btnEliminarNodo.addEventListener('click', function (e) {
      e.stopPropagation();
      eliminarNodo(nodo.id);
      ocultarOpcionesNodo();
    });
    opcionesEl.appendChild(btnEliminarNodo);
  
    opcionesEl.addEventListener('mouseover', function () {
      clearTimeout(window.ocultarOpcionesTimeout);
    });
    opcionesEl.addEventListener('mouseout', function () {
      ocultarOpcionesNodoConRetraso();
    });
  
    organigramaEl.appendChild(opcionesEl);
  }

    // Ocultar opciones cuando el mouse sale del nodo
    function ocultarOpcionesNodoConRetraso() {
        clearTimeout(window.ocultarOpcionesTimeout);
        window.ocultarOpcionesTimeout = setTimeout(() => {
          const opcionesEl = document.getElementById('opciones-nodo');
          if (opcionesEl) {
            opcionesEl.remove();
          }
        }, 2000); // Desaparece después de 2 segundos
      }

    // Seleccionar un nodo para edición
    function seleccionarNodo(nodoId) {
        nodoSeleccionado = nodos.find(n => n.id === nodoId);
        if (nodoSeleccionado) {
            inputNodoId.value = nodoSeleccionado.id;
            inputNombreNodo.value = nodoSeleccionado.nombre;
            selectCargoNodo.value = nodoSeleccionado.cargo;
            formEdicion.classList.remove('hidden');

            document.querySelectorAll('.nodo').forEach(n => n.classList.remove('seleccionado'));
            document.querySelector(`.nodo[data-id="${nodoId}"]`).classList.add('seleccionado');
        }
    }

    // Ocultar opciones inmediatamente
    function ocultarOpcionesNodo() {
    clearTimeout(window.ocultarOpcionesTimeout);
    const opcionesEl = document.getElementById('opciones-nodo');
    if (opcionesEl) {
      opcionesEl.remove();
    }
    }

    // Agregar nuevo nodo
    function agregarNuevoNodo(padreId, cargo, nivel) {
        const nuevoNodo = {
            nombre: 'Nuevo Nodo',
            cargo: cargo,
            nivel_jerarquico: nivel,
            padre_id: padreId,
            posicion_x: 0,
            posicion_y: 0
        };

        fetch('/api/nodos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoNodo)
        })
            .then(response => response.json())
            .then(data => {
                nodos.push(data);
                calcularDisposicionOptima().then(() => {
                    cargarNodos();
                    seleccionarNodo(data.id);
                });
            })
            .catch(error => console.error('Error al crear nodo:', error));
    }

    // Eliminar nodo y sus subordinados
    function eliminarNodo(nodoId) {
        const nodo = nodos.find(n => n.id === nodoId);
        if (!nodo) return;

        if (nodo.nivel_jerarquico === 1 && nodos.filter(n => n.nivel_jerarquico === 1).length === 1) {
            if (!confirm('¿Está seguro que desea eliminar el nodo principal? Esto eliminará todo el organigrama.')) {
                return;
            }
        } else {
            if (!confirm('¿Está seguro que desea eliminar este nodo y todos sus subordinados?')) {
                return;
            }
        }

        const nodosAEliminar = obtenerNodosSubordinados(nodoId);
        nodosAEliminar.push(nodoId);

        const promesas = nodosAEliminar.map(id =>
            fetch(`/api/nodos/${id}`, {
                method: 'DELETE'
            })
        );

        Promise.all(promesas)
            .then(() => {
                if (nodoSeleccionado && nodosAEliminar.includes(nodoSeleccionado.id)) {
                    formEdicion.classList.add('hidden');
                    nodoSeleccionado = null;
                }
                cargarNodos();
            })
            .catch(error => console.error('Error al eliminar nodos:', error));
    }

    // Obtener todos los IDs de nodos subordinados de forma recursiva
    function obtenerNodosSubordinados(nodoId) {
        const subordinados = [];
        const hijos = nodos.filter(n => n.padre_id === nodoId).map(n => n.id);
        subordinados.push(...hijos);
        hijos.forEach(hijoId => {
            const subSubordinados = obtenerNodosSubordinados(hijoId);
            subordinados.push(...subSubordinados);
        });
        return subordinados;
    }

    // Habilitar arrastre de nodos
    function habilitarArrastre(nodoEl, nodo) {
        let offsetX, offsetY;
        dragging = false;

        nodoEl.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = nodoEl.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            document.addEventListener('mousemove', moverNodo);
            document.addEventListener('mouseup', soltarNodo);

            nodoEl.classList.add('nodo-arrastrando');
            dragging = false;
        });

        function moverNodo(e) {
            dragging = true;

            const organigramaRect = organigramaEl.getBoundingClientRect();
            const nuevaX = (e.clientX - organigramaRect.left - offsetX) / config.escala;
            const nuevaY = (e.clientY - organigramaRect.top - offsetY) / config.escala;

            const posX = Math.max(0, nuevaX);
            const posY = Math.max(0, nuevaY);

            nodoEl.style.left = `${posX}px`;
            nodoEl.style.top = `${posY}px`;

            nodo.posicion_x = posX;
            nodo.posicion_y = posY;

            actualizarConexionesEnTiempoReal(nodo);
        }

        function soltarNodo() {
            document.removeEventListener('mousemove', moverNodo);
            document.removeEventListener('mouseup', soltarNodo);
            nodoEl.classList.remove('nodo-arrastrando');

            if (dragging) {
                fetch(`/api/nodos/${nodo.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        posicion_x: nodo.posicion_x,
                        posicion_y: nodo.posicion_y
                    })
                })
                    .then(() => {
                        if (tieneHijos(nodo.id)) {
                            calcularDisposicionOptima().then(() => {
                                dibujarOrganigrama();
                            });
                        } else {
                            organigramaEl.querySelectorAll('.conexion').forEach(conn => conn.remove());
                            dibujarConexiones();
                        }
                    })
                    .catch(error => console.error('Error al actualizar posición:', error));
            }
        }
    }

    // Verificar si un nodo tiene hijos
    function tieneHijos(nodoId) {
        return nodos.some(n => n.padre_id === nodoId);
    }

    // Actualizar conexiones en tiempo real durante el arrastre
    // Función actualizada para actualizar conexiones en tiempo real durante el arrastre
    function actualizarConexionesEnTiempoReal(nodoModificado) {
        organigramaEl.querySelectorAll('.conexion').forEach(conn => conn.remove());
        dibujarConexiones(); // Usar la nueva función dibujarConexiones que respeta el orden
    }

    // Eventos de botones
    btnCrearPrincipal.addEventListener('click', function () {
        const existe = nodos.some(n => n.nivel_jerarquico === 1);
        if (!existe) {
            agregarNuevoNodo(null, 'directo', 1);
        } else {
            alert('Ya existe un nodo principal. Solo puede haber uno.');
        }
    });

    btnGuardar.addEventListener('click', function () {
        if (!nodoSeleccionado) return;
    
        const nuevoNombre = inputNombreNodo.value.trim();
        const nuevoCargo = selectCargoNodo.value;
    
        if (!nuevoNombre) {
            alert('El nombre del nodo no puede estar vacío');
            return;
        }
    
        fetch(`/api/nodos/${nodoSeleccionado.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre: nuevoNombre,
                cargo: nuevoCargo
            })
        })
        .then(() => {
            nodoSeleccionado.nombre = nuevoNombre;
            nodoSeleccionado.cargo = nuevoCargo;
            dibujarOrganigrama();
            formEdicion.classList.add('hidden');
            nodoSeleccionado = null;
        })
        .catch(error => console.error('Error al actualizar nodo:', error));
    });
    
    btnCancelar.addEventListener('click', function () {
        formEdicion.classList.add('hidden');
        nodoSeleccionado = null;
        document.querySelectorAll('.nodo').forEach(n => n.classList.remove('seleccionado'));
    });
    
    btnEliminar.addEventListener('click', function () {
        if (!nodoSeleccionado) return;
        eliminarNodo(nodoSeleccionado.id);
    });
    
    // Manejo de eventos de teclado
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && formEdicion.classList.contains('hidden') === false) {
            btnCancelar.click();
        }
    });
    
    // Cancelar selección al hacer clic en el fondo
    organigramaEl.addEventListener('click', function (e) {
        if (e.target === organigramaEl) {
            btnCancelar.click();
        }
    });
    
    // Inicializar
    inicializarControlesZoom();
    cargarNodos();
});
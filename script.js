// --- CONFIGURACIÓN ---
const apiUrl = 'api.php';

document.addEventListener('DOMContentLoaded', () => {
    // REFERENCIAS AL HTML
    const tablaBody = document.getElementById('denuncias-body');
    const inputBusqueda = document.getElementById('input-busqueda-global');
    const filtroEstatus = document.getElementById('filtro-estatus');
    
    // MODALES
    const modal = document.getElementById('modal-registro');
    const modalDetalle = document.getElementById('modal-detalle');
    const modalEditar = document.getElementById('modal-editar'); // Asegúrate de tener este modal en tu HTML

    // FORMULARIOS
    const formRegistro = document.getElementById('form-registro-denuncia');
    const formEditar = document.getElementById('form-editar-denuncia');

    // BOTONES CIERRE
    const btnAbrir = document.getElementById('btn-abrir-modal');
    const btnCerrar = document.querySelector('.close-modal');
    const btnCerrarDetalle = document.querySelector('.close-modal-detalle');
    const btnCerrarEditar = document.querySelector('.close-modal-editar');
    const btnCerrarCaso = document.getElementById('btn-cerrar-caso');

    let idDenunciaActual = null;

    // =================================================
    // 1. CARGAR DATOS (LISTAR)
    // =================================================
    async function cargarDenuncias() {
        try {
            // Construir URL con filtros
            const busqueda = inputBusqueda ? inputBusqueda.value : '';
            const estatus = filtroEstatus ? filtroEstatus.value : 'all';
            const url = apiUrl + '?action=listar&busqueda=' + busqueda + '&estatus=' + estatus;

            const res = await fetch(url);
            const data = await res.json();

            tablaBody.innerHTML = ''; 

            if (data.length === 0) {
                tablaBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:20px;">No se encontraron registros.</td></tr>';
            } else {
                data.forEach(d => {
                    // Preparamos los datos para que no den error con comillas
                    const jsonD = JSON.stringify(d).replace(/"/g, '&quot;');
                    
                    const fila = '<tr>' +
                        '<td>' + d.id + '</td>' +
                        '<td><strong>' + d.numero_expediente + '</strong></td>' +
                        '<td>' + (d.fecha_registro || '-') + '</td>' +
                        '<td>' + d.nombre_ciudadano + '</td>' +
                        '<td>' + d.cedula_ciudadano + '</td>' +
                        '<td>' + d.tipo_delito + '</td>' +
                        '<td>' + d.cuadrante + '</td>' +
                        '<td><span class="status-badge status-' + d.estatus + '">' + d.estatus + '</span></td>' +
                        '<td>' + (d.asignado_a || 'Sin Asignar') + '</td>' +
                        '<td>' +
                            // BOTONES: OJO (Ver), LÁPIZ (Editar), BASURA (Eliminar)
                            '<div style="display:flex; gap:5px;">' +
                                '<button class="btn-action" title="Ver" onclick="verDetalle(' + jsonD + ')"><i class="fas fa-eye"></i></button>' +
                                '<button class="btn-action" title="Editar" onclick="abrirEditar(' + jsonD + ')"><i class="fas fa-pen" style="color:#ffc107;"></i></button>' +
                                '<button class="btn-action" title="Eliminar" onclick="eliminarDenuncia(' + d.id + ')"><i class="fas fa-trash" style="color:#dc3545;"></i></button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';
                    tablaBody.insertAdjacentHTML('beforeend', fila);
                });
            }
            cargarEstadisticas();

        } catch (error) {
            console.error("Error cargando tabla:", error);
        }
    }

    // =================================================
    // 2. FUNCIONES DE ACCIÓN (Globales)
    // =================================================
    
    // --- VER DETALLE ---
    window.verDetalle = function(d) {
        idDenunciaActual = d.id;
        if(document.getElementById('det-titulo')) document.getElementById('det-titulo').innerText = 'Expediente: ' + d.numero_expediente;
        if(document.getElementById('det-fecha')) document.getElementById('det-fecha').innerText = d.fecha_registro;
        if(document.getElementById('det-ciudadano')) document.getElementById('det-ciudadano').innerText = d.nombre_ciudadano;
        if(document.getElementById('det-cedula')) document.getElementById('det-cedula').innerText = d.cedula_ciudadano;
        if(document.getElementById('det-asignado')) document.getElementById('det-asignado').innerText = d.asignado_a || 'Sin Asignar';
        if(document.getElementById('det-descripcion')) document.getElementById('det-descripcion').innerText = d.descripcion;

        if(btnCerrarCaso) {
            btnCerrarCaso.style.display = (d.estatus === 'cerrada') ? 'none' : 'block';
        }
        if(modalDetalle) modalDetalle.style.display = 'block';
    };

    // --- ABRIR EDITAR ---
    window.abrirEditar = function(d) {
        if(!modalEditar) { alert("Falta agregar la ventana de edición en el HTML"); return; }
        
        document.getElementById('edit-id').value = d.id;
        document.getElementById('edit-expediente').value = d.numero_expediente;
        document.getElementById('edit-cuadrante').value = d.cuadrante;
        document.getElementById('edit-nombre').value = d.nombre_ciudadano;
        document.getElementById('edit-cedula').value = d.cedula_ciudadano;
        document.getElementById('edit-asignado').value = d.asignado_a;
        document.getElementById('edit-delito').value = d.tipo_delito;
        document.getElementById('edit-descripcion').value = d.descripcion;
        
        modalEditar.style.display = 'block';
    };

    // --- ELIMINAR ---
    window.eliminarDenuncia = async function(id) {
        if(!confirm("⚠️ ¿Seguro que quieres ELIMINAR este expediente?")) return;
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ accion: 'eliminar', id: id })
            });
            const r = await res.json();
            if(r.mensaje) { alert('Eliminado correctamente'); cargarDenuncias(); }
            else { alert('Error: ' + r.error); }
        } catch(e) { alert('Error de conexión'); }
    };

    // =================================================
    // 3. EVENTOS DE FORMULARIOS
    // =================================================

    // GUARDAR NUEVO
    if(formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = {
                accion: 'crear',
                expediente: document.getElementById('reg-expediente').value,
                nombre: document.getElementById('reg-nombre').value,
                cedula: document.getElementById('reg-cedula').value,
                delito: document.getElementById('reg-delito').value,
                cuadrante: document.getElementById('reg-cuadrante').value,
                descripcion: document.getElementById('reg-descripcion').value,
                asignado: document.getElementById('reg-asignado').value
            };
            try {
                const res = await fetch(apiUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
                const r = await res.json();
                if(r.mensaje) { alert('Guardado'); modal.style.display = 'none'; formRegistro.reset(); cargarDenuncias(); }
                else { alert('Error: ' + r.error); }
            } catch(e) { alert('Error al guardar'); }
        });
    }

    // GUARDAR EDICIÓN
    if(formEditar) {
        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const datos = {
                accion: 'editar',
                id: document.getElementById('edit-id').value,
                expediente: document.getElementById('edit-expediente').value,
                nombre: document.getElementById('edit-nombre').value,
                cedula: document.getElementById('edit-cedula').value,
                delito: document.getElementById('edit-delito').value,
                cuadrante: document.getElementById('edit-cuadrante').value,
                descripcion: document.getElementById('edit-descripcion').value,
                asignado: document.getElementById('edit-asignado').value
            };
            try {
                const res = await fetch(apiUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(datos) });
                const r = await res.json();
                if(r.mensaje) { alert('Actualizado'); modalEditar.style.display = 'none'; cargarDenuncias(); }
                else { alert('Error: ' + r.error); }
            } catch(e) { alert('Error al editar'); }
        });
    }

    // CERRAR CASO
    if(btnCerrarCaso) {
        btnCerrarCaso.onclick = async () => {
            if(!confirm("¿Cerrar caso definitivamente?")) return;
            try {
                const res = await fetch(apiUrl, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ accion: 'cerrar', id: idDenunciaActual }) });
                const r = await res.json();
                if(r.mensaje) { alert('Caso Cerrado'); modalDetalle.style.display = 'none'; cargarDenuncias(); }
            } catch(e) {}
        };
    }

    // =================================================
    // 4. ESTADÍSTICAS Y EXTRAS
    // =================================================
    async function cargarEstadisticas() {
        try {
            const res = await fetch(apiUrl + '?action=estadisticas');
            const stats = await res.json();
            
            if(document.getElementById('stat-total-global')) 
                document.getElementById('stat-total-global').textContent = stats.total_global;

            const llenarLista = (id, arr, fn) => { const el = document.getElementById(id); if(el){ el.innerHTML=''; arr.forEach(i => el.innerHTML+=fn(i)); } };
            
            llenarLista('lista-stats-cuadrante', stats.por_cuadrante, i => <li><span>${i.cuadrante}</span> <strong>${i.total}</strong></li>);
            llenarLista('lista-stats-mes', stats.por_mes, i => <li><span>${i.mes}</span> <strong>${i.total}</strong></li>);
            llenarLista('lista-stats-cuadrante-mes', stats.por_cuadrante_mes, i => <li><span>[${i.mes}] ${i.cuadrante}</span> <strong>${i.total}</strong></li>);

        } catch (e) { console.error("Error stats:", e); }
    }

    // Búsqueda Cédula (Abajo)
    const btnB = document.querySelector('#busqueda-ciudadano button');
    const inpB = document.querySelector('#busqueda-ciudadano input');
    if(btnB) {
        btnB.onclick = async () => {
            const d = document.getElementById('citizen-results');
            if(!inpB.value) return;
            const res = await fetch(apiUrl + '?action=buscar_cedula&cedula=' + inpB.value);
            const data = await res.json();
            d.innerHTML = '';
            if(data.length===0) d.innerHTML = '<p>Sin antecedentes.</p>';
            else data.forEach(h => d.innerHTML += <div style="border-bottom:1px solid #ddd; padding:5px;"><strong>${h.fecha_registro}</strong>: ${h.tipo_delito} (${h.estatus})</div>);
        };
    }

    // Eventos de interfaz
    if(inputBusqueda) inputBusqueda.addEventListener('keyup', cargarDenuncias);
    if(filtroEstatus) filtroEstatus.addEventListener('change', cargarDenuncias);

    // Abrir/Cerrar modales
    if(btnAbrir) btnAbrir.onclick = () => modal.style.display = "block";
    
    const cerrarTodo = () => {
        if(modal) modal.style.display = "none";
        if(modalDetalle) modalDetalle.style.display = "none";
        if(modalEditar) modalEditar.style.display = "none";
    };

    if(btnCerrar) btnCerrar.onclick = cerrarTodo;
    if(btnCerrarDetalle) btnCerrarDetalle.onclick = cerrarTodo;
    if(btnCerrarEditar) btnCerrarEditar.onclick = cerrarTodo;
    
    window.onclick = (e) => {
        if(e.target == modal || e.target == modalDetalle || e.target == modalEditar) cerrarTodo();
    };

    // INICIAR
    cargarDenuncias();
});v
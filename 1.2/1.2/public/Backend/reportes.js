// reportes.js - Controlador de reportes
const { jsPDF } = window.jspdf;
let citaActual = null;
let citasCompletadas = [];

function actualizarSelectorCitas(lista) {
  const selector = document.getElementById('selectCita');
  // Limpiamos el contenido previo
  selector.innerHTML = '<option value="">Seleccione una cita completada...</option>';

  if (lista.length === 0) {
    selector.innerHTML = '<option value="">No hay citas que coincidan</option>';
    document.getElementById('ticketReporte').style.display = 'none';
    return;
  }

  // Recorremos con forEach para crear cada <option>
  lista.forEach(cita => {
    const option = document.createElement('option');
    option.value = cita.id_cita;  // o cita.id, según tu API

    // Evitamos null con el operador ||
    const fecha = new Date(cita.fecha_hora)
                    .toLocaleDateString('es-ES');
    const paciente = `${cita.paciente_nombre || ''} ${cita.paciente_apellido || ''}`.trim();
    const terapeuta = `${cita.terapeuta_nombre || ''} ${cita.terapeuta_apellido || ''}`.trim();
    const tipo = cita.tipo_atencion || '';

    // Construimos el texto sólo con las partes que existan
    let texto = fecha;
    if (paciente) texto += ` – ${paciente}`;
    if (terapeuta) texto += ` – ${terapeuta}`;
    if (tipo) texto += ` – ${tipo}`;

    option.textContent = texto;
    selector.appendChild(option);
  });

  // Seleccionamos la primera opción y disparamos el cambio
  selector.selectedIndex = 0;
  selector.dispatchEvent(new Event('change'));
}

// Funciones de Utilidad
const mostrarSpinner = () => document.getElementById('loadingSpinner').style.display = 'block';
const ocultarSpinner = () => document.getElementById('loadingSpinner').style.display = 'none';

const mostrarError = (mensaje) => {
    const errorDiv = document.getElementById('error-message');
    errorDiv.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center" role="alert">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <div>${mensaje}</div>
        </div>
    `;
    errorDiv.style.display = 'block';
};

const limpiarError = () => document.getElementById('error-message').style.display = 'none';

// Autenticación y Roles
const verificarAutenticacion = () => {
    const usuario = JSON.parse(localStorage.getItem('user'));
    if (!usuario) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
};

const actualizarVistaPorRol = () => {
    const usuario = JSON.parse(localStorage.getItem('user')) || {};
    document.querySelectorAll('.admin-only').forEach(elemento => {
        elemento.style.display = usuario.role === 'admin' ? 'block' : 'none';
    });
};

// Manejo de Citas
const cargarCitasCompletadas = async () => {
    try {
        mostrarSpinner();
        const respuesta = await fetch('/api/citas-completadas');
        if (!respuesta.ok) throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`);
        const citas = await respuesta.json();
        citasCompletadas = citas;
        actualizarSelectorCitas(citas);
        const selector = document.getElementById('selectCita');

        // Si hay al menos una cita, selecciona la primera y dispara el change
        if (citas.length > 0) {
            selector.selectedIndex = 0;
            selector.dispatchEvent(new Event('change'));
        }
    } catch (error) {
        mostrarError(`Error al cargar citas: ${error.message}`);
    } finally {
        ocultarSpinner();
    }
};

document.getElementById('searchReportes')
.addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    const filtradas = citasCompletadas.filter(cita => {
    const paciente  = `${cita.paciente_nombre} ${cita.paciente_apellido}`.toLowerCase();
    const terapeuta = `${cita.terapeuta_nombre} ${cita.terapeuta_apellido}`.toLowerCase();
    const fecha     = new Date(cita.fecha_hora)
                        .toLocaleDateString('es-ES')
                        .toLowerCase();
    const tipo      = (cita.tipo_atencion || '').toLowerCase();
    return paciente.includes(q)
        || terapeuta.includes(q)
        || fecha.includes(q)
        || tipo.includes(q);
    });
    actualizarSelectorCitas(filtradas);
});

const cargarDetallesCita = async (idCita) => {
    const ticket = document.getElementById('ticketReporte');
    if (!ticket) {
        console.error('Elemento #ticketReporte no encontrado');
        return;
    }
    try {
        if (!idCita) {
            ticket.style.display = 'none';
            return;
        }
        mostrarSpinner();
        limpiarError();
        const respuesta = await fetch(`/api/citas/${idCita}`);
        if (!respuesta.ok) throw new Error(await respuesta.text());
        citaActual = await respuesta.json();
        validarDatosCita(citaActual);
        actualizarInterfazCita();
        ticket.style.display = 'block';
    } catch (error) {
        ticket.style.display = 'none';
        mostrarError(`Error al cargar cita: ${error.message}`);
    } finally {
        ocultarSpinner();
    }
};

const validarDatosCita = (cita) => {
    ['paciente_nombre', 'terapeuta_nombre', 'fecha_hora', 'tipo_atencion']
      .forEach(campo => {
        if (!cita[campo]) throw new Error(`Dato faltante: ${campo}`);
    });
};

// Actualización de UI
const actualizarInterfazCita = () => {
    const estadoElemento = document.querySelector('#ticketReporte .badge-estado');
    if (!estadoElemento) {
        console.error('Elemento .badge-estado no encontrado');
        return;
    }

    // Estado del paciente
    const estado = citaActual.estado_paciente || 'activo';
    estadoElemento.className = `badge-estado badge bg-${obtenerColorEstado(estado)}`;
    estadoElemento.textContent = estado.toUpperCase();

    // Datos del paciente
    document.getElementById('pacienteNombre').textContent = 
        `${citaActual.paciente_nombre} ${citaActual.paciente_apellido}`;
    document.getElementById('pacienteEdad').textContent = citaActual.edad || 'N/A';
    document.getElementById('pacienteCedula').textContent = citaActual.cedula || 'N/A';
    document.getElementById('pacienteDireccion').textContent = citaActual.direccion || 'N/A';
    document.getElementById('pacienteEPS').textContent = citaActual.eps || 'N/A';
    document.getElementById('estadoPaciente').textContent = estado.toUpperCase();

    // Datos de la consulta
    document.getElementById('terapeutaNombre').textContent = 
        `${citaActual.terapeuta_nombre} ${citaActual.terapeuta_apellido}`;
    document.getElementById('fechaConsulta').textContent = 
        new Date(citaActual.fecha_hora).toLocaleString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    document.getElementById('tipoAtencion').textContent = citaActual.tipo_atencion;

    // Fecha generación
    document.getElementById('fechaGeneracion').textContent = 
        `Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`;
};

const obtenerColorEstado = (estado) => ({
    activo: 'success',
    intermitente: 'warning',
    pausa: 'info',
    desertado: 'danger'
}[estado.toLowerCase()] || 'secondary');

// Generación de PDF
const generarPDF = () => {
    if (!citaActual) return mostrarError('Seleccione una cita para generar el reporte');
    try {
        const doc = new jsPDF();
        let yPos = 20;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte de Consulta Psicológica', 20, yPos);
        yPos += 15;
        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        yPos += 20;

        // Datos del paciente
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del Paciente:', 20, yPos);
        yPos += 10;
        [
            `Nombre: ${citaActual.paciente_nombre} ${citaActual.paciente_apellido}`,
            `Edad: ${citaActual.edad || 'N/A'}`,
            `Cedula: ${citaActual.cedula || 'N/A'}`,
            `Dirección: ${citaActual.direccion || 'N/A'}`,
            `EPS: ${citaActual.eps || 'N/A'}`,
            `Estado: ${citaActual.estado_paciente.toUpperCase() || 'N/A'}`
        ].forEach(linea => {
            doc.setFont('helvetica', 'normal');
            doc.text(linea, 25, yPos);
            yPos += 10;
        });
        yPos += 15;

        // Detalles de la consulta
        doc.setFont('helvetica', 'bold');
        doc.text('Detalles de la Consulta:', 20, yPos);
        yPos += 10;
        [
            `Fecha: ${new Date(citaActual.fecha_hora).toLocaleDateString('es-ES', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' })}`,
            `Terapeuta: ${citaActual.terapeuta_nombre} ${citaActual.terapeuta_apellido}`,
            `Duración: 1 hora`,
            `Tipo de atención: ${citaActual.tipo_atencion}`
        ].forEach(linea => {
            doc.text(linea, 25, yPos);
            yPos += 10;
        });

        const nombreArchivo = `Reporte_${citaActual.paciente_nombre}_${citaActual.cedula}`
            .replace(/\s+/g, '_')
            .toLowerCase() + '.pdf';
        doc.save(nombreArchivo);
    } catch (error) {
        mostrarError(`Error al generar PDF: ${error.message}`);
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacion()) return;
    actualizarVistaPorRol();
    cargarCitasCompletadas();
    document.getElementById('selectCita')
            .addEventListener('change', e => cargarDetallesCita(e.target.value));
});

window.cerrarSesion = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/index.html';
};

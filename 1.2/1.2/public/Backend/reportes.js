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

const mostrarExito = (mensaje) => {
    const errorDiv = document.getElementById('error-message');
    errorDiv.innerHTML = `
        <div class="alert alert-success d-flex align-items-center" role="alert">
            <i class="bi bi-check-circle-fill me-2"></i>
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

        // Limpiar campos de reporte por defecto
        document.getElementById('contenidoReporte').value = '';
        document.getElementById('editorInfo').textContent = '';

        // Cargar observaciones guardadas si existen
        try {
            const resRep = await fetch(`/api/reportes/${idCita}`);
            if (resRep.ok) {
                const rep = await resRep.json();
                document.getElementById('contenidoReporte').value = rep.contenido || '';
                if (rep.editor) {
                    document.getElementById('editorInfo').textContent = `Última edición por: ${rep.editor}`;
                }
            }
        } catch (e) {
            console.warn('No se encontraron observaciones previas:', e);
        }

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

// Generación de PDF individual (ya existente)
const generarPDF = () => {
    if (!citaActual) return mostrarError('Seleccione una cita para generar el reporte');
    try {
        const doc = new jsPDF();
        let yPos = 20;
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte de Consulta Psicologica', 20, yPos);
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
            `Direccion: ${citaActual.direccion || 'N/A'}`,
            `EPS: ${citaActual.eps || 'N/A'}`,
            `Estado: ${(citaActual.estado_paciente || 'N/A').toUpperCase()}`
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
            `Duracion: 1 hora`,
            `Tipo de atencion: ${citaActual.tipo_atencion}`
        ].forEach(linea => {
            doc.text(linea, 25, yPos);
            yPos += 10;
        });

        // Observaciones / Reporte Clínico
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Observaciones / Reporte Clinico:', 20, yPos);
        yPos += 10;
        doc.setFont('helvetica', 'normal');
        
        const obs = document.getElementById('contenidoReporte').value.trim() || 'Sin observaciones registradas';
        const lineasObs = doc.splitTextToSize(obs, 170);
        lineasObs.forEach(linea => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(linea, 25, yPos);
            yPos += 7;
        });

        const nombreArchivo = `Reporte_${citaActual.paciente_nombre}_${citaActual.cedula}`
            .replace(/\s+/g, '_')
            .toLowerCase() + '.pdf';
        doc.save(nombreArchivo);
    } catch (error) {
        mostrarError(`Error al generar PDF: ${error.message}`);
    }
};

const guardarReporte = async () => {
    if (!citaActual) return mostrarError('Seleccione una cita primero');
    const contenido = document.getElementById('contenidoReporte').value.trim();
    if (!contenido) return mostrarError('Por favor escriba las observaciones antes de guardar');

    try {
        mostrarSpinner();
        limpiarError();
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const res = await fetch('/api/reportes/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cita_id: citaActual.id_cita,
                contenido: contenido,
                editor: user.email || 'terapeuta'
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'Error al guardar reporte');
        }

        // Actualizar el info del editor en pantalla
        document.getElementById('editorInfo').textContent = `Última edición por: ${user.email || 'terapeuta'}`;
        
        mostrarExito('Reporte guardado exitosamente');
    } catch (error) {
        mostrarError(`Error al guardar reporte: ${error.message}`);
    } finally {
        ocultarSpinner();
    }
};

// ======================================
// Historial completo por paciente
// ======================================

const cargarPacientesHistorial = async () => {
    try {
        const res = await fetch('/api/pacientes');
        if (!res.ok) throw new Error('Error al cargar pacientes');
        const pacientes = await res.json();
        const select = document.getElementById('selectPacienteHistorial');
        select.innerHTML = '<option value="">Seleccione un paciente...</option>';
        pacientes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id_paciente;
            opt.textContent = `${p.nombre} ${p.apellido} - CC: ${p.cedula}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('Error cargando pacientes para historial:', err);
    }
};

const generarPDFPaciente = async () => {
    const select = document.getElementById('selectPacienteHistorial');
    const pacienteId = select.value;
    if (!pacienteId) {
        return mostrarError('Seleccione un paciente para generar el historial');
    }

    try {
        mostrarSpinner();
        limpiarError();

        // Obtener datos del paciente
        const resPac = await fetch(`/api/pacientes/${pacienteId}`);
        if (!resPac.ok) throw new Error('Error al obtener datos del paciente');
        const paciente = await resPac.json();

        // Obtener todos los reportes del paciente
        const resRep = await fetch(`/api/reportes/paciente/${pacienteId}`);
        if (!resRep.ok) throw new Error('Error al obtener reportes del paciente');
        const reportes = await resRep.json();

        if (reportes.length === 0) {
            mostrarError('Este paciente no tiene citas completadas ni reportes registrados');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const marginLeft = 20;
        const marginRight = 20;
        const maxWidth = pageWidth - marginLeft - marginRight;
        let yPos = 20;

        // --- Encabezado / Portada ---
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 153); // #007b99
        doc.text('Historial de Consultas', marginLeft, yPos);
        yPos += 8;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Consultorio de Psicologia', marginLeft, yPos);
        yPos += 12;

        // Linea decorativa
        doc.setDrawColor(0, 123, 153);
        doc.setLineWidth(1);
        doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
        yPos += 15;

        // Datos del paciente
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del Paciente', marginLeft, yPos);
        yPos += 10;

        doc.setFontSize(10);
        const datosPaciente = [
            [`Nombre:`, `${paciente.nombre} ${paciente.apellido}`],
            [`Cedula:`, `${paciente.cedula}`],
            [`Edad:`, `${paciente.edad || 'N/A'}`],
            [`Direccion:`, `${paciente.direccion || 'N/A'}`],
            [`EPS:`, `${paciente.eps || 'N/A'}`],
            [`Tipo de atencion:`, `${paciente.tipo_atencion || 'N/A'}`],
            [`Estado:`, `${(paciente.estado_paciente || 'activo').toUpperCase()}`],
        ];

        datosPaciente.forEach(([label, valor]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, marginLeft + 5, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(valor, marginLeft + 45, yPos);
            yPos += 7;
        });

        yPos += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(`Total de consultas registradas: ${reportes.length}`, marginLeft, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 15;

        // Linea separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
        yPos += 10;

        // --- Cada reporte ---
        reportes.forEach((reporte, index) => {
            // Verificar si necesitamos nueva pagina (al menos 60px para el encabezado del reporte)
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }

            // Encabezado de sesion
            doc.setFillColor(0, 123, 153);
            doc.roundedRect(marginLeft, yPos - 5, pageWidth - marginLeft - marginRight, 10, 2, 2, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);

            const fechaSesion = new Date(reporte.fecha_hora).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            doc.text(`Sesion ${index + 1} - ${fechaSesion}`, marginLeft + 5, yPos + 2);
            yPos += 15;

            // Terapeuta
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Terapeuta:', marginLeft + 5, yPos);
            doc.setFont('helvetica', 'normal');
            doc.text(`${reporte.terapeuta_nombre} ${reporte.terapeuta_apellido}`, marginLeft + 45, yPos);
            yPos += 10;

            // Contenido del reporte
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones:', marginLeft + 5, yPos);
            yPos += 7;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const contenido = reporte.contenido || 'Sin observaciones registradas';
            const lineas = doc.splitTextToSize(contenido, maxWidth - 10);

            lineas.forEach(linea => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(linea, marginLeft + 5, yPos);
                yPos += 5;
            });

            yPos += 10;

            // Linea separadora entre reportes
            if (index < reportes.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.3);
                doc.line(marginLeft + 10, yPos, pageWidth - marginRight - 10, yPos);
                yPos += 10;
            }
        });

        // --- Pie de pagina en la ultima pagina ---
        yPos += 10;
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }
        doc.setDrawColor(0, 123, 153);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, yPos, pageWidth - marginRight, yPos);
        yPos += 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Documento generado electronicamente - Consultorio de Psicologia', marginLeft, yPos);
        doc.text(`Fecha de generacion: ${new Date().toLocaleString('es-ES')}`, marginLeft, yPos + 5);

        // Guardar PDF
        const nombreArchivo = `Historial_${paciente.nombre}_${paciente.apellido}_${paciente.cedula}`
            .replace(/\s+/g, '_')
            .toLowerCase() + '.pdf';
        doc.save(nombreArchivo);

    } catch (error) {
        mostrarError(`Error al generar historial PDF: ${error.message}`);
        console.error(error);
    } finally {
        ocultarSpinner();
    }
};

// Inicializacion
document.addEventListener('DOMContentLoaded', () => {
    if (!verificarAutenticacion()) return;
    actualizarVistaPorRol();
    cargarCitasCompletadas();
    cargarPacientesHistorial();
    document.getElementById('selectCita')
            .addEventListener('change', e => cargarDetallesCita(e.target.value));
});

window.cerrarSesion = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/index.html';
};

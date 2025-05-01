// Lista_de_espera.js

// =====================
// 1. Autenticación & Roles
// =====================
function checkAuth() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) window.location.href = "index.html";
  }
  function toggleMenuByRole() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    document.querySelectorAll(".admin-only").forEach((el) => {
      el.style.display = user.role === "admin" ? "block" : "none";
    });
    document.querySelectorAll(".terapeuta-only").forEach((el) => {
      el.style.display = user.role === "terapeuta" ? "block" : "none";
    });
  }
  function cerrarSesion() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
  
  // 2. Spinner de carga
  function mostrarSpinner() {
    document.getElementById("loadingSpinner").style.display = "block";
  }
  function ocultarSpinner() {
    document.getElementById("loadingSpinner").style.display = "none";
  }
  
  // 3. Lista de Espera (Carga y Renderizado)
  let listaCompleta = [];
  async function cargarListaEspera() {
    try {
      mostrarSpinner();
      const response = await fetch(
        "http://localhost:5001/api/lista-espera"
      );
      console.log("Estado de la respuesta:", response.status);
      const data = await response.json();
      console.log("Datos recibidos:", data);
      listaCompleta = data;
      renderizarLista(data);
    } catch (error) {
      console.error("Error al cargar la lista:", error);
      alert("Error al cargar la lista: " + error.message);
    } finally {
      ocultarSpinner();
    }
  }
  
  function filtrarLista(texto) {
    texto = texto.toLowerCase().trim();
    const filtrados = listaCompleta.filter((paciente) => {
      const nombrePac = (
        paciente.paciente_nombre +
        " " +
        paciente.paciente_apellido
      ).toLowerCase();
      const nombreTer = (
        paciente.terapeuta_nombre +
        " " +
        paciente.terapeuta_apellido
      ).toLowerCase();
      return nombrePac.includes(texto) || nombreTer.includes(texto);
    });
    renderizarLista(filtrados);
  }
  
// Helper para obtener las clases de Bootstrap según el estado
function getEstadoClasses(estado) {
  switch (estado) {
    case 'activo':       return 'bg-success';
    case 'intermitente': return 'bg-warning text-dark';
    case 'pausa':        return 'bg-info';
    case 'desertado':    return 'bg-danger';
    default:             return '';
  }
}

function renderizarLista(pacientes) {
  const contenedor = document.getElementById("listaEspera");
  contenedor.innerHTML = pacientes
    .map((pac) => {
      const disabledSelect = pac.estado_paciente === "completado" ? "disabled" : "";
      const estadoClases  = getEstadoClasses(pac.estado_paciente);

      return `
        <div class="col-12 col-md-6 col-lg-4 mb-3">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column justify-content-between">
              <div>
                <h5 class="card-title">
                  <span class="clickable"
                        data-bs-toggle="modal"
                        data-bs-target="#modalFichaPaciente"
                        data-paciente-id="${pac.paciente_id}"
                        data-paciente-nombre="${pac.paciente_nombre}"
                        data-paciente-apellido="${pac.paciente_apellido}"
                        data-paciente-cedula="${pac.cedula || 'N/A'}"
                        data-paciente-correo="${pac.correo || 'N/A'}"
                        data-paciente-atencion="${pac.tipo_atencion || 'N/A'}">
                    ${pac.paciente_nombre} ${pac.paciente_apellido}
                  </span>
                </h5>
                <p class="card-text">
                  <small class="text-muted">
                    Terapeuta:
                    <span class="clickable"
                          data-bs-toggle="modal"
                          data-bs-target="#modalFichaTerapeuta"
                          data-terapeuta-id="${pac.terapeuta_id}"
                          data-terapeuta-nombre="${pac.terapeuta_nombre}"
                          data-terapeuta-apellido="${pac.terapeuta_apellido}">
                      ${pac.terapeuta_nombre} ${pac.terapeuta_apellido}
                    </span>
                  </small>
                </p>
                <div class="mb-2">
                  <label for="select-estado-${pac.paciente_id}" class="form-label">
                    Cambiar estado:
                  </label>
                  <select id="select-estado-${pac.paciente_id}"
                          class="form-select form-select-sm ${estadoClases}"
                          onchange="cambiarEstadoPaciente(${pac.paciente_id}, this.value)"
                          ${disabledSelect}>
                    <option value="activo"       ${pac.estado_paciente === "activo"       ? "selected" : ""}>
                      Activo
                    </option>
                    <option value="intermitente" ${pac.estado_paciente === "intermitente" ? "selected" : ""}>
                      Intermitente
                    </option>
                    <option value="pausa"        ${pac.estado_paciente === "pausa"        ? "selected" : ""}>
                      Pausa
                    </option>
                    <option value="desertado"    ${pac.estado_paciente === "desertado"    ? "selected" : ""}>
                      Desertado
                    </option>
                  </select>
                </div>
              </div>
              <div class="d-flex justify-content-end gap-2">
                <button class="btn btn-sm btn-success"
                        onclick="abrirModalCita(${pac.id_lista})"
                        title="Crear cita">
                  <i class="bi bi-plus-lg"></i>
                </button>
                <button class="btn btn-sm btn-primary"
                        onclick="toggleCitas(${pac.id_lista})"
                        title="Ver citas">
                  <i class="bi bi-calendar3"></i>
                </button>
                <button class="btn btn-sm btn-danger"
                    onclick="eliminarPaciente(${pac.id_lista})"
                    title="Eliminar paciente">
                    <i class="bi bi-trash"></i>
                  </button>
              </div>
              <div class="mt-3" id="citas-${pac.id_lista}" style="display: none;"></div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

  
  // 4. Funciones para Citas

  async function completarCita(idCita) {
    if (!confirm("¿Está seguro de marcar esta cita como completada?\nSe generará un reporte automático.")) {
        return;
    }

    try {
        mostrarSpinner();

        const response = await fetch(`/api/citas/${idCita}/completar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al completar cita');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || "Error al completar cita");
        }

        alert('Completada exitosamente');
        cargarListaEspera();

    } catch (error) {
        console.error('Error al completar cita:', error);
        alert(`Error: ${error.message}`);
    } finally {
        ocultarSpinner();
    }
}

  let pacienteActual = null;
  
  async function abrirModalCita(listaId) {
    try {
      // 1) Cargo simultáneamente la info del paciente y la lista de terapeutas
      const [pacienteResp, terapeutasResp] = await Promise.all([
        fetch(`/api/lista-espera/${listaId}`),
        fetch('/api/terapeutas'),
      ]);
      if (!pacienteResp.ok) throw new Error('No pude obtener el paciente');
      if (!terapeutasResp.ok) throw new Error('No pude obtener terapeutas');
  
      const pacienteData = await pacienteResp.json();
      const terapeutas   = await terapeutasResp.json();
      pacienteActual     = pacienteData.paciente_id;
  
      // 2) Construyo el <select> con placeholder + todas las opciones
      const select = document.getElementById('selectTerapeuta');
      const opciones = terapeutas
        .map(t =>
          `<option value="${t.id_terapeuta}">
             ${t.nombre} ${t.apellido}
           </option>`
        )
        .join('');
      select.innerHTML = `
        <option value="" disabled>Seleccione un terapeuta</option>
        ${opciones}
      `;
  
      // 3) Preselecciono el terapeuta que ya venía asignado
      select.value = String(pacienteData.terapeuta_id);
  
      // 4) Muestro el modal
      new bootstrap.Modal(document.getElementById('citasModal')).show();
    } catch (err) {
      console.error(err);
      alert('Error al abrir modal de cita: ' + err.message);
    }
  }
  
  
  async function agregarCita() {
    const fechaInput = document.getElementById("fechaCita");
    const terapeutaSelect = document.getElementById("selectTerapeuta");
    const mensajeError = document.getElementById("mensajeErrorCita");
    mensajeError.classList.add("d-none");
    mensajeError.textContent = "";
  
    if (!fechaInput.value || !terapeutaSelect.value) {
      mensajeError.textContent = "Por favor, complete todos los campos.";
      mensajeError.classList.remove("d-none");
      return;
    }
  
    try {
      mostrarSpinner();
      const response = await fetch("http://localhost:5001/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paciente_id: pacienteActual,
          terapeuta_id: terapeutaSelect.value,
          fecha_hora: fechaInput.value,
          duracion: "1 hour",
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        mensajeError.textContent = errorData.error || "Error al agregar cita";
        mensajeError.classList.remove("d-none");
        return;
      }
  
      bootstrap.Modal.getInstance(document.getElementById("citasModal")).hide();
      cargarListaEspera();
    } catch (error) {
      console.error("Error:", error);
      mensajeError.textContent = "Error inesperado: " + error.message;
      mensajeError.classList.remove("d-none");
    } finally {
      ocultarSpinner();
    }
  }
  
  async function toggleCitas(listaId) {
    const contenedor = document.getElementById(`citas-${listaId}`);
    if (contenedor.style.display === "none") {
      try {
        mostrarSpinner();
        const response = await fetch(`/api/citas-lista/${listaId}`);
        if (!response.ok) throw new Error("Error al cargar citas");
        const citas = await response.json();
  
        contenedor.innerHTML = ""; // limpio antes de renderizar
        citas
          .filter(cita => cita.estado === "pendiente")
          .forEach(cita => {
            // Única declaración de citaHTML:
            const citaHTML = `
              <div class="mt-3">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <span class="badge bg-info">
                      ${new Date(cita.fecha_hora).toLocaleString()} (${cita.estado})
                    </span>
                    <div class="small text-muted" id="contador-${cita.id_cita}"></div>
                  </div>
                  <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-success" onclick="completarCita(${cita.id_cita})">
                      <i class="bi bi-check2"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarCita(${cita.id_cita})">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>`;
            contenedor.insertAdjacentHTML("beforeend", citaHTML);
            iniciarContador(cita.id_cita, new Date(cita.fecha_hora));
          });
  
        contenedor.style.display = "block";
      } catch (error) {
        console.error("Error en toggleCitas:", error);
        contenedor.innerHTML = `<div class="text-danger mt-2">${error.message}</div>`;
      } finally {
        ocultarSpinner();
      }
    } else {
      contenedor.style.display = "none";
    }
  }
  
  
  function iniciarContador(idCita, fechaCita) {
    const elemento = document.getElementById(`contador-${idCita}`);
    function actualizarContador() {
      const ahora = new Date();
      const diferencia = fechaCita - ahora;
      if (diferencia < 0) {
        elemento.innerHTML =
          '<span class="text-danger">Cita expirada</span>';
        return;
      }
      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const horas = Math.floor(
        (diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutos = Math.floor(
        (diferencia % (1000 * 60 * 60)) / (1000 * 60)
      );
      elemento.innerHTML = `<span class="text-success"><i class="bi bi-clock"></i> ${dias}d ${horas}h ${minutos}m restantes</span>`;
    }
    actualizarContador();
    setInterval(actualizarContador, 60000);
  }
  
  async function completarCita(idCita) {
    if (!confirm("¿Está seguro de marcar esta cita como completada?\nSe generará un reporte automático.")) {
      return;
    }
  
    try {
      mostrarSpinner();
  
      const response = await fetch(`http://localhost:5001/api/citas/${idCita}/completar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!response.ok) {
        const textResponse = await response.text();
        console.error("Respuesta del servidor:", textResponse);
        throw new Error(`Error al completar cita: ${response.status}`);
      }
  
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Error al completar cita");
      }
  
      alert(`Completada exitosamente`);
      cargarListaEspera();
  
    } catch (error) {
      console.error('Error al completar cita:', error);
      alert(`X Error: ${error.message}`);
    } finally {
      ocultarSpinner();
    }
  }
  
  async function eliminarCita(id) {
    if (!confirm("¿Seguro que deseas eliminar esta cita?")) return;
  
    try {
      mostrarSpinner();
  
      const response = await fetch(`http://localhost:5001/api/citas/${id}`, {
        method: 'DELETE'
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
  
      alert("Cita eliminada con éxito");
      cargarListaEspera();
    } catch (error) {
      console.error("Error al eliminar cita:", error);
      alert("Error al eliminar cita: " + error.message);
    } finally {
      ocultarSpinner();
    }
  }
  
  
  async function cambiarEstadoPaciente(pacienteId, nuevoEstado) {
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (!res.ok) throw new Error("Error al actualizar estado");
  
      // Actualizo clases en el select:
      const select = document.getElementById(`select-estado-${pacienteId}`);
      // Quito todas las posibles bg-*
      select.classList.remove('bg-success','bg-warning','text-dark','bg-info','bg-danger');
      // Y añado la que toca
      const clases = getEstadoClasses(nuevoEstado).split(' ');
      select.classList.add(...clases);
    } catch (err) {
      console.error(err);
      alert("Hubo un error al actualizar el estado");
    }
  }

  // Elimina un paciente de la lista de espera
async function eliminarPaciente(idLista) {
  if (!confirm('¿Seguro que deseas eliminar a este paciente de la lista de espera?')) return;
  try {
    mostrarSpinner();
    const res = await fetch(`/api/lista-espera/${idLista}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al eliminar paciente');
    }
    // Recargar la lista
    cargarListaEspera();
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    alert(`❌ ${error.message}`);
  } finally {
    ocultarSpinner();
  }
}

  
  
  function getColorForState(estado) {
    const colores = {
      activo: 'success',
      intermitente: 'warning',
      pausa: 'info',
      desertado: 'danger',
      completado: 'secondary'
    };
    return colores[estado] || '';
  }
  
  // 5. Manejo de Modales para Fichas y Edición
  var modalPaciente = document.getElementById("modalFichaPaciente");
  var originalPaciente = {};
  modalPaciente.addEventListener("show.bs.modal", async function (event) {
    var trigger = event.relatedTarget;
    var pacienteId = trigger.getAttribute("data-paciente-id");
    try {
      const response = await fetch(`http://localhost:5001/api/pacientes/${pacienteId}`);
      if (!response.ok)
        throw new Error("Error al obtener la ficha del paciente");
      const paciente = await response.json();
      originalPaciente = Object.assign({}, paciente);
  
      modalPaciente.querySelector("#fichaPacienteNombre").textContent = paciente.nombre;
      modalPaciente.querySelector("#fichaPacienteApellido").textContent = paciente.apellido;
      modalPaciente.querySelector("#fichaPacienteCedula").textContent = paciente.cedula;
      modalPaciente.querySelector("#fichaPacienteCorreo").textContent = paciente.correo;
      modalPaciente.querySelector("#fichaPacienteAtencion").textContent = paciente.tipo_atencion;
      modalPaciente.querySelector("#fichaPacienteEdad").textContent = paciente.edad || "N/A";
      modalPaciente.querySelector("#fichaPacienteDireccion").textContent = paciente.direccion || "N/A";
      modalPaciente.querySelector("#fichaPacienteEps").textContent = paciente.eps || "N/A";
      document.getElementById("editPacienteBtn").classList.remove("d-none");
      document.getElementById("savePacienteBtn").classList.add("d-none");
      document.getElementById("cancelPacienteBtn").classList.add("d-none");
    } catch (error) {
      console.error(error);
    }
  });
  
  document.getElementById("savePacienteBtn").addEventListener("click", async function () {
    const updatedPaciente = {
      nombre: modalPaciente.querySelector("#inputPacienteNombre").value,
      apellido: modalPaciente.querySelector("#inputPacienteApellido").value,
      cedula: modalPaciente.querySelector("#inputPacienteCedula").value,
      correo: modalPaciente.querySelector("#inputPacienteCorreo").value,
      tipo_atencion: modalPaciente.querySelector("#inputPacienteAtencion").value,
      edad: modalPaciente.querySelector("#inputPacienteEdad").value,
      direccion: modalPaciente.querySelector("#inputPacienteDireccion").value,
      eps: modalPaciente.querySelector("#inputPacienteEps").value
    };
  
    try {
      const response = await fetch(
        `http://localhost:5001/api/pacientes/${originalPaciente.id_paciente}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPaciente),
        }
      );
      if (!response.ok)
        throw new Error("Error al actualizar la ficha del paciente");
  
      const data = await response.json();
      console.log("Actualización exitosa:", data);
  
      modalPaciente.querySelector("#fichaPacienteNombre").textContent = data.nombre;
      modalPaciente.querySelector("#fichaPacienteApellido").textContent = data.apellido;
      modalPaciente.querySelector("#fichaPacienteCedula").textContent = data.cedula;
      modalPaciente.querySelector("#fichaPacienteCorreo").textContent = data.correo;
      modalPaciente.querySelector("#fichaPacienteAtencion").textContent = data.tipo_atencion;
      modalPaciente.querySelector("#fichaPacienteEdad").textContent = data.edad;
      modalPaciente.querySelector("#fichaPacienteDireccion").textContent = data.direccion;
      modalPaciente.querySelector("#fichaPacienteEps").textContent = data.eps;
  
      document.getElementById("editPacienteBtn").classList.remove("d-none");
      document.getElementById("savePacienteBtn").classList.add("d-none");
      document.getElementById("cancelPacienteBtn").classList.add("d-none");
  
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });
  
  document.getElementById("editPacienteBtn").addEventListener("click", function () {
    const fields = ["Nombre", "Apellido", "Cedula", "Correo", "Atencion"];
    const nuevosCampos = [
      { label: "Edad", id: "Edad" },
      { label: "Direccion", id: "Direccion" },
      { label: "Eps", id: "Eps" }
    ];
  
    fields.forEach((field) => {
      const span = modalPaciente.querySelector(`#fichaPaciente${field}`);
      const currentValue = span.textContent.trim();
      span.innerHTML = `<input type="text" id="inputPaciente${field}" class="form-control" value="${currentValue}">`;
    });
  
    nuevosCampos.forEach((campo) => {
      const span = modalPaciente.querySelector(`#fichaPaciente${campo.id}`);
      const currentValue = span.textContent.trim();
      span.innerHTML = `<input type="text" id="inputPaciente${campo.id}" class="form-control" value="${currentValue}">`;
    });
  
    document.getElementById("editPacienteBtn").classList.add("d-none");
    document.getElementById("savePacienteBtn").classList.remove("d-none");
    document.getElementById("cancelPacienteBtn").classList.remove("d-none");
  });
  
  document.getElementById("cancelPacienteBtn").addEventListener("click", function () {
    modalPaciente.querySelector("#fichaPacienteNombre").textContent = originalPaciente.nombre;
    modalPaciente.querySelector("#fichaPacienteApellido").textContent = originalPaciente.apellido;
    modalPaciente.querySelector("#fichaPacienteCedula").textContent = originalPaciente.cedula;
    modalPaciente.querySelector("#fichaPacienteCorreo").textContent = originalPaciente.correo;
    modalPaciente.querySelector("#fichaPacienteAtencion").textContent = originalPaciente.tipo_atencion;
    modalPaciente.querySelector("#fichaPacienteEdad").textContent = originalPaciente.edad || "N/A";
    modalPaciente.querySelector("#fichaPacienteDireccion").textContent = originalPaciente.direccion || "N/A";
    modalPaciente.querySelector("#fichaPacienteEps").textContent = originalPaciente.eps || "N/A";
  
    document.getElementById("editPacienteBtn").classList.remove("d-none");
    document.getElementById("savePacienteBtn").classList.add("d-none");
    document.getElementById("cancelPacienteBtn").classList.add("d-none");
  });
  
  // Modal Ficha del Terapeuta
  var modalTerapeuta = document.getElementById("modalFichaTerapeuta");
  var originalTerapeuta = {};
  modalTerapeuta.addEventListener("show.bs.modal", async function (event) {
    var trigger = event.relatedTarget;
    var terapeutaId = trigger.getAttribute("data-terapeuta-id");
    try {
      const response = await fetch(
        `http://localhost:5001/api/terapeutas/${terapeutaId}`
      );
      if (!response.ok)
        throw new Error("Error al obtener la ficha del terapeuta");
      const terapeuta = await response.json();
      originalTerapeuta = Object.assign({}, terapeuta);
      modalTerapeuta.querySelector("#fichaTerapeutaNombre").textContent =
        terapeuta.nombre;
      modalTerapeuta.querySelector("#fichaTerapeutaApellido").textContent =
        terapeuta.apellido;
      modalTerapeuta.querySelector("#fichaTerapeutaCorreo").textContent =
        terapeuta.correo;
      modalTerapeuta.querySelector(
        "#fichaTerapeutaEspecialidad"
      ).textContent = terapeuta.especialidad;
      document
        .getElementById("editTerapeutaBtn")
        .classList.remove("d-none");
      document.getElementById("saveTerapeutaBtn").classList.add("d-none");
      document.getElementById("cancelTerapeutaBtn").classList.add("d-none");
    } catch (error) {
      console.error(error);
    }
  });
  
  document
    .getElementById("editTerapeutaBtn")
    .addEventListener("click", function () {
      const fields = ["Nombre", "Apellido", "Correo", "Especialidad"];
      fields.forEach((field) => {
        const span = modalTerapeuta.querySelector(
          `#fichaTerapeuta${field}`
        );
        const currentValue = span.textContent.trim();
        span.innerHTML = `<input type="text" id="inputTerapeuta${field}" class="form-control" value="${currentValue}">`;
      });
      document.getElementById("editTerapeutaBtn").classList.add("d-none");
      document
        .getElementById("saveTerapeutaBtn")
        .classList.remove("d-none");
      document
        .getElementById("cancelTerapeutaBtn")
        .classList.remove("d-none");
    });
  
  document
    .getElementById("cancelTerapeutaBtn")
    .addEventListener("click", function () {
      modalTerapeuta.querySelector("#fichaTerapeutaNombre").textContent =
        originalTerapeuta.nombre;
      modalTerapeuta.querySelector("#fichaTerapeutaApellido").textContent =
        originalTerapeuta.apellido;
      modalTerapeuta.querySelector("#fichaTerapeutaCorreo").textContent =
        originalTerapeuta.correo;
      modalTerapeuta.querySelector(
        "#fichaTerapeutaEspecialidad"
      ).textContent = originalTerapeuta.especialidad;
      document
        .getElementById("editTerapeutaBtn")
        .classList.remove("d-none");
      document.getElementById("saveTerapeutaBtn").classList.add("d-none");
      document
        .getElementById("cancelTerapeutaBtn")
        .classList.add("d-none");
    });
  
  document
    .getElementById("saveTerapeutaBtn")
    .addEventListener("click", async function () {
      const updatedTerapeuta = {
        nombre: modalTerapeuta.querySelector("#inputTerapeutaNombre").value,
        apellido: modalTerapeuta.querySelector("#inputTerapeutaApellido")
          .value,
        correo: modalTerapeuta.querySelector("#inputTerapeutaCorreo").value,
        especialidad: modalTerapeuta.querySelector(
          "#inputTerapeutaEspecialidad"
        ).value,
      };
      try {
        const response = await fetch(
          `http://localhost:5001/api/terapeutas/${originalTerapeuta.id_terapeuta}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedTerapeuta),
          }
        );
        if (!response.ok)
          throw new Error("Error al actualizar la ficha del terapeuta");
        const data = await response.json();
        modalTerapeuta.querySelector("#fichaTerapeutaNombre").textContent =
          data.nombre;
        modalTerapeuta.querySelector(
          "#fichaTerapeutaApellido"
        ).textContent = data.apellido;
        modalTerapeuta.querySelector("#fichaTerapeutaCorreo").textContent =
          data.correo;
        modalTerapeuta.querySelector(
          "#fichaTerapeutaEspecialidad"
        ).textContent = data.especialidad;
        document
          .getElementById("editTerapeutaBtn")
          .classList.remove("d-none");
        document.getElementById("saveTerapeutaBtn").classList.add("d-none");
        document
          .getElementById("cancelTerapeutaBtn")
          .classList.add("d-none");
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });
  
  // 6. Inicialización de la Página
  document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    toggleMenuByRole();
    if (window.location.pathname.includes("Lista_de_espera.html")) {
      cargarListaEspera();
    }
  });
  
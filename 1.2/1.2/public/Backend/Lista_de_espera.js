// File: Frontend/Lista_de_espera.js

// ======================================
// 0. Confirmación personalizada
// ======================================
function showConfirm(message, onYes) {
  document.getElementById("confirmMessage").textContent = message;
  const oldBtn = document.getElementById("confirmOk");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);

  const modalEl = document.getElementById("confirmModal");
  const bsModal = new bootstrap.Modal(modalEl);
  newBtn.addEventListener("click", () => {
    bsModal.hide();
    onYes();
  });
  bsModal.show();
}

// ======================================
// 1. Autenticación & Roles
// ======================================
function checkAuth() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) window.location.href = "index.html";
}
function toggleMenuByRole() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = user.role === "admin" ? "block" : "none";
  });
  document.querySelectorAll(".terapeuta-only").forEach(el => {
    el.style.display = user.role === "terapeuta" ? "block" : "none";
  });
}
function cerrarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// ======================================
// 2. Spinner de carga
// ======================================
function mostrarSpinner() {
  document.getElementById("loadingSpinner").style.display = "block";
}
function ocultarSpinner() {
  document.getElementById("loadingSpinner").style.display = "none";
}

// ======================================
// 3. Carga y renderizado de Lista de Espera
// ======================================
let listaCompleta = [];
async function cargarListaEspera() {
  mostrarSpinner();
  try {
    const response = await fetch("/api/lista-espera");
    const data = await response.json();

    const listaConCitas = await Promise.all(
      data.map(async pac => {
        const respCitas = await fetch(`/api/citas-lista/${pac.id_lista}`);
        const citas = await respCitas.json();
        const proximas = citas
          .filter(c => c.estado === "pendiente")
          .map(c => ({ ...c, fecha: new Date(c.fecha_hora) }))
          .filter(c => c.fecha >= new Date())
          .sort((a, b) => a.fecha - b.fecha);
        return {
          ...pac,
          nextCita: proximas.length ? proximas[0].fecha : null
        };
      })
    );

    listaCompleta = listaConCitas.sort((a, b) => {
      if (a.nextCita === null && b.nextCita === null) return 0;
      if (a.nextCita === null) return 1;
      if (b.nextCita === null) return -1;
      return a.nextCita - b.nextCita;
    });

    renderizarLista(listaCompleta);
  } catch (err) {
    console.error("Error al cargar/ordenar la lista:", err);
    alert("Error al cargar la lista: " + err.message);
  } finally {
    ocultarSpinner();
  }
}

function filtrarLista(texto) {
  texto = texto.toLowerCase().trim();
  const filtrados = listaCompleta.filter(p => {
    const nombrePac = (p.paciente_nombre + " " + p.paciente_apellido).toLowerCase();
    const nombreTer = (p.terapeuta_nombre + " " + p.terapeuta_apellido).toLowerCase();
    return nombrePac.includes(texto) || nombreTer.includes(texto);
  });
  renderizarLista(filtrados);
}

// ======================================
// 4. Helpers de estado
// ======================================
function getEstadoClasses(estado) {
  switch (estado) {
    case "activo":
      return "bg-success text-white";
    case "intermitente":
      return "bg-warning text-dark";
    case "pausa":
      return "bg-info text-dark";
    case "desertado":
      return "bg-danger text-white";
    default:
      return "";
  }
}

// ======================================
// 5. Renderizado de tarjetas
// ======================================
function renderizarLista(pacientes) {
  const contenedor = document.getElementById("listaEspera");
  contenedor.innerHTML = pacientes.map(pac => {
    const disabledSelect = pac.estado_paciente === "completado" ? "disabled" : "";
    const estadoClases = getEstadoClasses(pac.estado_paciente);
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
                  <span class="fw-bold text-black">Terapeuta:</span>
                  <span class="clickable text-black"
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
                <label for="select-estado-${pac.paciente_id}" class="form-label fw-bold text-black">
                  Cambiar estado:
                </label>
                <select id="select-estado-${pac.paciente_id}"
                        class="form-select form-select-sm ${estadoClases}"
                        onchange="cambiarEstadoPaciente(${pac.paciente_id}, this.value)"
                        ${disabledSelect}>
                  <option value="activo"       ${pac.estado_paciente === "activo"       ? "selected" : ""}>Activo</option>
                  <option value="intermitente" ${pac.estado_paciente === "intermitente" ? "selected" : ""}>Intermitente</option>
                  <option value="pausa"        ${pac.estado_paciente === "pausa"        ? "selected" : ""}>Pausa</option>
                  <option value="desertado"    ${pac.estado_paciente === "desertado"    ? "selected" : ""}>Desertado</option>
                </select>
              </div>
            </div>
            <div class="d-flex justify-content-end gap-2">
              <button class="btn btn-sm btn-success btn-crear-citas"
                      onclick="abrirModalCita(${pac.id_lista})"
                      title="Crear cita">
                <i class="bi bi-plus-lg"></i>
              </button>
              <button class="btn btn-sm btn-primary btn-calendario"
                      onclick="toggleCitas(${pac.id_lista})"
                      title="Ver citas">
                <i class="bi bi-calendar3"></i>
              </button>
              <button class="btn btn-sm btn-danger btn-basura"
                      onclick="eliminarPaciente(${pac.id_lista})"
                      title="Eliminar paciente">
                <i class="bi bi-trash"></i>
              </button>
            </div>
            <div class="mt-3" id="citas-${pac.id_lista}" style="display: none;"></div>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ======================================
// 6. Completar / Eliminar citas y pacientes
// ======================================
function completarCita(idCita) {
  showConfirm(
    "¿Está seguro de marcar esta cita como completada?\nSe generará un reporte automático.",
    async () => {
      try {
        mostrarSpinner();
        const res = await fetch(`/api/citas/${idCita}/completar`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });
        if (!res.ok) throw new Error("Error al completar cita");
        showAlert("Cita completada exitosamente");
          cargarListaEspera();
      } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
      } finally {
        ocultarSpinner();
      }
    }
  );
}

function showAlert(message) {
  document.getElementById("alertMessage").textContent = message;
  const modalEl = document.getElementById("alertModal");
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
}

function eliminarCita(idCita) {
  showConfirm(
    "¿Seguro que deseas eliminar esta cita?",
    async () => {
      try {
        mostrarSpinner();
        const res = await fetch(`/api/citas/${idCita}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar cita");
        showAlert("Cita eliminada con éxito");
        cargarListaEspera();
      } catch (e) {
        console.error(e);
        alert("Error al eliminar cita: " + e.message);
      } finally {
        ocultarSpinner();
      }
    }
  );
}

function eliminarPaciente(idLista) {
  showConfirm(
    "¿Seguro que deseas eliminar a este paciente de la lista de espera?",
    async () => {
      try {
        mostrarSpinner();
        const res = await fetch(`/api/lista-espera/${idLista}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error al eliminar paciente");
        cargarListaEspera();
      } catch (e) {
        console.error(e);
        alert("Error al eliminar paciente: " + e.message);
      } finally {
        ocultarSpinner();
      }
    }
  );
}

// ======================================
// 7. Citas: abrir, agregar y toggle
// ======================================
let pacienteActual = null;
async function abrirModalCita(listaId) {
  try {
    const [pacResp, terResp] = await Promise.all([
      fetch(`/api/lista-espera/${listaId}`),
      fetch('/api/terapeutas'),
    ]);
    if (!pacResp.ok || !terResp.ok) throw new Error("Error al cargar datos");
    const pacienteData = await pacResp.json();
    const terapeutas = await terResp.json();
    pacienteActual = pacienteData.paciente_id;

    const select = document.getElementById('selectTerapeuta');
    select.innerHTML = `
      <option value="" disabled>Seleccione un terapeuta</option>
      ${terapeutas.map(t => `<option value="${t.id_terapeuta}">${t.nombre} ${t.apellido}</option>`).join('')}
    `;
    select.value = String(pacienteData.terapeuta_id);
    new bootstrap.Modal(document.getElementById('citasModal')).show();
  } catch (e) {
    console.error(e);
    alert("Error al abrir modal de cita: " + e.message);
  }
}

async function agregarCita() {
  const fechaInput = document.getElementById("fechaCita");
  const terapeutaSelect = document.getElementById("selectTerapeuta");
  const mensajeError = document.getElementById("mensajeErrorCita");
  mensajeError.classList.add("d-none");
  if (!fechaInput.value || !terapeutaSelect.value) {
    mensajeError.textContent = "Por favor, complete todos los campos.";
    mensajeError.classList.remove("d-none");
    return;
  }
  try {
    mostrarSpinner();
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paciente_id: pacienteActual,
        terapeuta_id: terapeutaSelect.value,
        fecha_hora: fechaInput.value,
        duracion: "1 hour"
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al agregar cita");
    }
    bootstrap.Modal.getInstance(document.getElementById("citasModal")).hide();
    cargarListaEspera();
  } catch (e) {
    console.error(e);
    mensajeError.textContent = e.message;
    mensajeError.classList.remove("d-none");
  } finally {
    ocultarSpinner();
  }
}

async function toggleCitas(listaId) {
  const cont = document.getElementById(`citas-${listaId}`);
  if (cont.style.display === "none") {
    try {
      mostrarSpinner();
      const res = await fetch(`/api/citas-lista/${listaId}`);
      if (!res.ok) throw new Error("Error al cargar citas");
      const citas = await res.json();
      cont.innerHTML = "";
      citas.filter(c => c.estado === "pendiente").forEach(c => {
        cont.insertAdjacentHTML("beforeend", `
          <div class="mt-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <span class="badge bg-info">${new Date(c.fecha_hora).toLocaleString()}</span>
                <div class="small text-muted" id="contador-${c.id_cita}"></div>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-success" onclick="completarCita(${c.id_cita})">
                  <i class="bi bi-check2"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="eliminarCita(${c.id_cita})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>`);
        iniciarContador(c.id_cita, new Date(c.fecha_hora));
      });
      cont.style.display = "block";
    } catch (e) {
      console.error(e);
      cont.innerHTML = `<div class="text-danger mt-2">${e.message}</div>`;
    } finally {
      ocultarSpinner();
    }
  } else {
    cont.style.display = "none";
  }
}

function iniciarContador(idCita, fechaCita) {
  const elem = document.getElementById(`contador-${idCita}`);
  function actualizar() {
    const diff = fechaCita - new Date();
    if (diff < 0) {
      elem.innerHTML = '<span class="text-danger">Cita expirada</span>';
      return;
    }
    const d = Math.floor(diff / 86400000),
          h = Math.floor((diff % 86400000) / 3600000),
          m = Math.floor((diff % 3600000) / 60000);
    elem.innerHTML = `<span class="text-success"><i class="bi bi-clock"></i> ${d}d ${h}h ${m}m restantes</span>`;
  }
  actualizar();
  setInterval(actualizar, 60000);
}

// ======================================
// 8. Actualizar estado de paciente
// ======================================
async function cambiarEstadoPaciente(pacienteId, nuevoEstado) {
  try {
    const res = await fetch(`/api/pacientes/${pacienteId}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    if (!res.ok) throw new Error("Error al actualizar estado");
    const select = document.getElementById(`select-estado-${pacienteId}`);
    select.className = "";
    select.classList.add("form-select", "form-select-sm", ...getEstadoClasses(nuevoEstado).split(" "));
  } catch (e) {
    console.error(e);
    alert("Error al actualizar estado: " + e.message);
  }
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
      cargarListaEspera();
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
  
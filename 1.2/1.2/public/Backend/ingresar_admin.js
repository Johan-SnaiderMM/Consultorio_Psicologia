// ======================================
// 0. Confirmación personalizada
// ======================================
function showConfirm(message, onYes) {
  // Inserta el mensaje
  document.getElementById("confirmMessage").textContent = message;
  // Clona el botón para quitar listeners previos
  const oldBtn = document.getElementById("confirmOk");
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);
  // Inicializa y muestra el modal
  const modalEl = document.getElementById("confirmModal");
  const bsModal = new bootstrap.Modal(modalEl);
  newBtn.addEventListener("click", () => {
    bsModal.hide();
    onYes();
  });
  bsModal.show();
}

// ======================================
// 1. Utilidades generales
// ======================================
const mostrarSpinner = () =>
  document.getElementById("loadingSpinner").classList.replace("d-none", "d-flex");
const ocultarSpinner = () =>
  document.getElementById("loadingSpinner").classList.replace("d-flex", "d-none");

const mostrarMensaje = (message, type = "danger") => {
  const container = document.getElementById("message-container");
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
  container.style.display = "block";
  setTimeout(() => (container.style.display = "none"), 5000);
};

// 1.1 Mensaje en el formulario de nuevo admin
const mostrarFormMessage = (msg, type = "danger") => {
  const container = document.getElementById("message-container");
  container.innerHTML = `<div class="alert alert-${type}" role="alert">${msg}</div>`;
  container.style.display = "block";
  setTimeout(() => (container.style.display = "none"), 5000);
};

// 1.2 Mensaje en el modal de edición
const mostrarModalMessage = (msg, type = "danger") => {
  const alertDiv = modalAdmin.querySelector("#modalAdminMessage");
  alertDiv.textContent = msg;
  alertDiv.className = `alert alert-${type}`; 
  alertDiv.classList.remove("d-none");
  alertDiv.classList.add("d-block");
  setTimeout(() => alertDiv.classList.replace("d-block", "d-none"), 5000);
};

// 1.3 Mensaje encima de la tabla de admins
const mostrarListMessage = (msg, type = "success") => {
  const container = document.getElementById("adminListMessage");
  container.innerHTML = msg;
  container.className = `alert alert-${type}`;
  container.style.display = "block";
  setTimeout(() => (container.style.display = "none"), 5000);
};

// ======================================
// 2. Render y fetch de administradores
// ======================================
const renderAdmins = (admins) => {
  const tbody = document.querySelector("#admins-table tbody");
  tbody.innerHTML = "";
  admins.forEach((admin) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${admin.nombre}</td>
      <td>${admin.email}</td>
      <td>${admin.rol}</td>
      <td>
        <button
          class="btn btn-sm btn-warning edit-btn btn-editar"
          data-id="${admin.id}"
          data-bs-toggle="modal"
          data-bs-target="#modalFichaAdmin"
          title="Editar administrador"
        >
          <i class="bi bi-pencil"></i>
        </button>
        <button
          class="btn btn-sm btn-danger delete-btn btn-basura"
          data-id="${admin.id}"
          title="Eliminar administrador"
        >
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

const fetchAdmins = async () => {
  mostrarSpinner();
  try {
    const res = await fetch("/api/admins");
    if (!res.ok) throw new Error("No se pudo cargar la lista de administradores");
    const { admins } = await res.json();
    renderAdmins(admins);
  } catch (err) {
    mostrarMensaje(err.message);
  } finally {
    ocultarSpinner();
  }
};

// ======================================
// 3. Crear nuevo administrador
// ======================================
const formNuevoAdmin = document.getElementById("registronuevoadministrador");
formNuevoAdmin.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarSpinner();
  try {
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (!data.nombre || !data.email || !data.rol)
      throw new Error("Todos los campos son obligatorios");
    if (data.rol.trim() !== "admin")
      throw new Error('El rol debe ser exactamente "admin" en minúsculas.');

    const res = await fetch("/api/nuevoadmin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Error al crear administrador");

    mostrarFormMessage("Administrador registrado exitosamente!", "success");
    e.target.reset();
    fetchAdmins();
  } catch (err) {
    mostrarFormMessage(err.message, "danger");
  } finally {
    ocultarSpinner();
  }
});

// ======================================
// 4. Borrar administrador (con modal)
// ======================================
const handleDelete = (id) => {
  showConfirm("¿Seguro que deseas eliminar este administrador?", async () => {
    mostrarSpinner();
    try {
      const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al eliminar administrador");
      mostrarListMessage("Administrador eliminado", "success");
      fetchAdmins();
    } catch (err) {
      mostrarMensaje(err.message);
    } finally {
      ocultarSpinner();
    }
  });
};

// ======================================
// 5. Delegación de eventos en la tabla
// ======================================
document
  .querySelector("#admins-table tbody")
  .addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    if (btn.classList.contains("delete-btn")) {
      handleDelete(id);
    }
    // El modal de edición se abre con data-bs-* automáticamente
  });

// ======================================
// 6. Modal de edición de administrador
// ======================================
const modalAdmin = document.getElementById("modalFichaAdmin");
let originalAdminData = {};

modalAdmin.addEventListener("show.bs.modal", async (event) => {
  document.getElementById("editAdminBtn").classList.remove("d-none");
  document.getElementById("saveAdminBtn").classList.add("d-none");
  document.getElementById("cancelAdminBtn").classList.add("d-none");

  const adminId = event.relatedTarget.getAttribute("data-id");
  try {
    const res = await fetch(`/api/admins/${adminId}`);
    if (!res.ok) throw new Error("No se pudo cargar el administrador");
    const admin = await res.json();
    originalAdminData = { ...admin };
    modalAdmin.querySelector("#fichaAdminNombre").textContent = admin.nombre;
    modalAdmin.querySelector("#fichaAdminEmail").textContent = admin.email;
    modalAdmin.querySelector("#fichaAdminRol").textContent = admin.rol;
  } catch (err) {
    console.error(err);
    alert("Error al abrir ficha de administrador");
  }
});

modalAdmin.addEventListener("hidden.bs.modal", () => {
  modalAdmin.querySelector("#fichaAdminNombre").textContent = originalAdminData.nombre;
  modalAdmin.querySelector("#fichaAdminEmail").textContent = originalAdminData.email;
  modalAdmin.querySelector("#fichaAdminRol").textContent = originalAdminData.rol;

  document.getElementById("editAdminBtn").classList.remove("d-none");
  document.getElementById("saveAdminBtn").classList.add("d-none");
  document.getElementById("cancelAdminBtn").classList.add("d-none");
});

document.getElementById("editAdminBtn").addEventListener("click", () => {
  ["Nombre", "Email", "Rol"].forEach((field) => {
    const span = modalAdmin.querySelector(`#fichaAdmin${field}`);
    const value = span.textContent.trim();
    span.innerHTML = `<input type="text" id="inputAdmin${field}" class="form-control" value="${value}">`;
  });
  document.getElementById("editAdminBtn").classList.add("d-none");
  document.getElementById("saveAdminBtn").classList.remove("d-none");
  document.getElementById("cancelAdminBtn").classList.remove("d-none");
});

document.getElementById("cancelAdminBtn").addEventListener("click", () => {
  modalAdmin.querySelector("#fichaAdminNombre").textContent = originalAdminData.nombre;
  modalAdmin.querySelector("#fichaAdminEmail").textContent = originalAdminData.email;
  modalAdmin.querySelector("#fichaAdminRol").textContent = originalAdminData.rol;

  document.getElementById("editAdminBtn").classList.remove("d-none");
  document.getElementById("saveAdminBtn").classList.add("d-none");
  document.getElementById("cancelAdminBtn").classList.add("d-none");
});

document.getElementById("saveAdminBtn").addEventListener("click", async () => {
  const updated = {
    nombre: modalAdmin.querySelector("#inputAdminNombre").value.trim(),
    email: modalAdmin.querySelector("#inputAdminEmail").value.trim(),
    rol: modalAdmin.querySelector("#inputAdminRol").value.trim(),
  };

  if (updated.rol !== "admin") {
    ocultarSpinner();
    mostrarModalMessage('El rol debe ser exactamente "admin" en minúsculas.', "danger");
    return;
  }

  mostrarSpinner();
  try {
    const res = await fetch(`/api/admins/${originalAdminData.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al guardar");
    mostrarListMessage("Administrador actualizado", "success");
    fetchAdmins();
    bootstrap.Modal.getInstance(modalAdmin).hide();
  } catch (err) {
    mostrarModalMessage(err.message, "danger");
  } finally {
    ocultarSpinner();
  }
});

// ======================================
// 7. Autenticación y carga inicial
// ======================================
document.addEventListener("DOMContentLoaded", () => {
  try {
    const userData = localStorage.getItem("user");
    if (!userData) throw new Error("Debes iniciar sesión primero");
    const user = JSON.parse(userData);
    if (user.role.toLowerCase() !== "admin") {
      mostrarMensaje("Acceso restringido a administradores", "danger");
      return setTimeout(() => (window.location.href = "/Lista_de_espera.html"), 2000);
    }
    document.querySelectorAll(".admin-only").forEach((el) => (el.style.display = "block"));
    fetchAdmins();
  } catch (err) {
    console.error(err);
    mostrarMensaje(err.message, "warning");
    setTimeout(() => (window.location.href = "/index.html"), 2000);
  }
});

// ======================================
// 8. Cerrar sesión
// ======================================
window.cerrarSesion = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/index.html";
};

// ingresar_terapeuta.js (actualizado)
// ======================================
// 0. Modal de confirmación genérico
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

const mostrarListMessage = (msg, type = "success") => {
  const container = document.getElementById("terapeutaListMessage");
  container.textContent = msg;
  container.className = `alert alert-${type}`;
  container.classList.remove("d-none");
  setTimeout(() => container.classList.add("d-none"), 5000);
};

// ======================================
// 2. Render y fetch de terapeutas
// ======================================
const renderTherapists = (list) => {
  const tbody = document.querySelector("#terapeutas-table tbody");
  tbody.innerHTML = "";
  list.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.nombre}</td>
      <td>${t.apellido}</td>
      <td>${t.correo}</td>
      <td>${t.especialidad}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${t.id_terapeuta}" title="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
};

const fetchTherapists = async () => {
  mostrarSpinner();
  try {
    const res = await fetch("/api/listar-terapeutas");
    if (!res.ok) throw new Error("No se pudo cargar la lista de terapeutas");
    const data = await res.json();
    renderTherapists(data);
  } catch (err) {
    mostrarMensaje(err.message);
  } finally {
    ocultarSpinner();
  }
};

// ======================================
// 3. Crear nuevo terapeuta
// ======================================
const formNuevo = document.getElementById("registroTerapeutaForm");
formNuevo.addEventListener("submit", async (e) => {
  e.preventDefault();
  mostrarSpinner();
  try {
    const body = Object.fromEntries(new FormData(e.target).entries());
    if (!body.nombre || !body.apellido || !body.correo || !body.especialidad)
      throw new Error("Todos los campos son obligatorios");

    const res = await fetch("/api/terapeutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Error al registrar terapeuta");

    mostrarMensaje("Terapeuta registrado con éxito", "success");
    e.target.reset();
    fetchTherapists();
  } catch (err) {
    mostrarMensaje(err.message);
  } finally {
    ocultarSpinner();
  }
});

// ======================================
// 4. Borrar terapeuta
// ======================================
const handleDelete = (id) => {
  showConfirm("¿Seguro que deseas eliminar este terapeuta?", async () => {
    mostrarSpinner();
    try {
      const res = await fetch(`/api/terapeutas/${id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al eliminar terapeuta");
      mostrarListMessage("Terapeuta eliminado", "success");
      fetchTherapists();
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
document.querySelector("#terapeutas-table tbody")
  .addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (btn && btn.classList.contains("delete-btn")) {
      handleDelete(btn.dataset.id);
    }
  });

// ======================================
// 6. Inicialización y autenticación
// ======================================
document.addEventListener("DOMContentLoaded", () => {
  // funciones checkAuth() y toggleMenuByRole() ya existentes...
  fetchTherapists();
});

// ======================================
// 7. Cerrar sesión
// ======================================
window.cerrarSesion = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/index.html";
};

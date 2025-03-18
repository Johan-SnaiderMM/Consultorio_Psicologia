

  // Función para manejar la respuesta de credenciales de Google
  function handleCredentialResponse(response) {
    mostrarSpinner();
    clearError();

    try {
        const jwt = response.credential;
        const payload = JSON.parse(atob(jwt.split('.')[1]));

        // Verificar dominio del correo
        if (!payload.email.endsWith('@amigo.edu.co')) {
            throw new Error('Solo se permiten correos @amigo.edu.co');
        }

        // Guardar el token en localStorage
        localStorage.setItem("token", jwt);

        console.log('Usuario autenticado:', payload);
        alert('Inicio de sesión exitoso con Google');

        // Redirigir a la página principal
        window.location.href = 'Lista_de_espera.html';
    } catch (error) {
        showError(error.message);
        console.error('Error de autenticación:', error);
    } finally {
        ocultarSpinner();
    }
}


  // Inicializar Google Identity Services
  window.onload = function () {
    google.accounts.id.initialize({
      client_id: "720930149163-34vbb0mrs2j3c4vpnvh796p8l5sltpn4.apps.googleusercontent.com",
      callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
      document.querySelector(".g_id_signin"),
      { theme: "outline", size: "large" }
    );

    google.accounts.id.prompt(); // Muestra el prompt de inicio de sesión si es posible
  };

  // Función para mostrar mensajes de error
  function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    errorText.textContent = message;
    errorDiv.style.display = 'flex';
    
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  // Manejo del formulario de login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      if (!email || !password) {
        throw new Error('Por favor, completa todos los campos.');
      }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirigir según el rol
      if (data.user.role === 'admin') {
        window.location.href = 'Lista_de_espera.html';
      } else if (data.user.role === 'terapeuta') {
        window.location.href = 'reportes.html';
      } else {
        throw new Error('Rol no reconocido');
      }

    } catch (error) {
      showError(error.message);
      console.error('Error en el login:', error);
    }
  });

  // Función para verificar la autenticación
  function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
      // Si estamos en la página de login, redirigir según rol
      if (window.location.pathname.includes('index.html')) {
        if (user.role === 'admin') {
          window.location.href = 'Lista_de_espera.html';
        } else if (user.role === 'terapeuta') {
          window.location.href = 'reportes.html';
        }
      }
    } else {
      window.location.href = 'index.html';
    }
  }

  // Función para ajustar la visibilidad del menú según el rol
  function toggleMenuByRole() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const showAdmin = user.role === 'admin';
    const showTerapeuta = user.role === 'terapeuta';

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = showAdmin ? 'block' : 'none';
    });

    document.querySelectorAll('.terapeuta-only').forEach(el => {
      el.style.display = showTerapeuta ? 'block' : 'none';
    });
  }

  // Función para cerrar sesión
  function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  }

  // Función para togglear la sidebar
  function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.main-content').classList.toggle('active');
  }

  // Función para cargar la lista de espera
  async function cargarListaEspera() {
    try {
      const response = await fetch('/api/lista-espera');
      const data = await response.json();
      renderizarLista(data);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Función para renderizar la lista de espera
  function renderizarLista(pacientes) {
    const contenedor = document.getElementById('listaEspera');
    contenedor.innerHTML = pacientes.map(paciente => `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-center">
          <div style="flex-grow: 1;">
            <h5>${paciente.paciente_nombre} ${paciente.paciente_apellido}</h5>
            <small class="text-muted">Terapeuta: ${paciente.terapeuta_nombre} ${paciente.terapeuta_apellido}</small>
            <div class="citas-container" id="citas-${paciente.id_lista}" style="display: none;"></div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-success" onclick="abrirModalCita(${paciente.id_lista})">
              <i class="bi bi-plus-lg"></i>
            </button>
            <button class="btn btn-sm btn-primary" onclick="toggleCitas(${paciente.id_lista})">
              <i class="bi bi-calendar3"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Función para abrir el modal de citas
  async function abrirModalCita(listaId) {
    try {
      const response = await fetch(`/api/lista-espera/${listaId}`);
      if (!response.ok) throw new Error('Error al obtener paciente');
      const data = await response.json();
      window.pacienteActual = data.paciente_id;

      const terapeutas = await (await fetch('/api/terapeutas')).json();
      const select = document.getElementById('selectTerapeuta');
      select.innerHTML = terapeutas.map(t => 
        `<option value="${t.id_terapeuta}">${t.nombre} ${t.apellido}</option>`
      ).join('');

      new bootstrap.Modal(document.getElementById('citasModal')).show();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos para la cita');
    }
  }

  // Función para agregar una nueva cita
  async function agregarCita() {
    const fechaInput = document.getElementById('fechaCita');
    const terapeutaSelect = document.getElementById('selectTerapeuta');

    if (!fechaInput.value || !terapeutaSelect.value) {
      alert('Complete todos los campos');
      return;
    }

    try {
      await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: window.pacienteActual,
          terapeuta_id: terapeutaSelect.value,
          fecha_hora: fechaInput.value,
          duracion: '1 hour'
        })
      });
      bootstrap.Modal.getInstance(document.getElementById('citasModal')).hide();
      cargarListaEspera();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar cita');
    }
  }

  // Función para mostrar/ocultar citas
  async function toggleCitas(listaId) {
    const contenedor = document.getElementById(`citas-${listaId}`);
    try {
      if (contenedor.style.display === 'none') {
        const response = await fetch(`/api/citas-lista/${listaId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cargar citas');
        }
        const citas = await response.json();
        contenedor.innerHTML = '';
        citas.forEach(cita => {
          const citaHTML = `
            <div class="mt-3">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="badge ${cita.estado === 'completada' ? 'bg-success' : 'bg-info'}">
                    ${new Date(cita.fecha_hora).toLocaleString()} (${cita.estado})
                  </span>
                  ${cita.estado === 'pendiente' ? `
                  <div class="contador-tiempo" id="contador-${cita.id_cita}"></div>` : ''}
                </div>
                <div class="d-flex gap-2">
                  ${cita.estado === 'pendiente' ? `
                  <button class="btn btn-sm btn-success" onclick="completarCita(${cita.id_cita})">
                    <i class="bi bi-check2"></i>
                  </button>` : ''}
                  <button class="btn btn-sm btn-danger" onclick="eliminarCita(${cita.id_cita})">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              ${cita.estado === 'completada' ? `
              <div class="mt-2">
                <a href="reportes.html?cita_id=${cita.id_cita}" class="btn btn-sm btn-primary">
                  <i class="bi bi-file-text"></i> Generar Reporte
                </a>
              </div>` : ''}
            </div>`;
          contenedor.insertAdjacentHTML('beforeend', citaHTML);
          if (cita.estado === 'pendiente') iniciarContador(cita.id_cita, new Date(cita.fecha_hora));
        });
        contenedor.style.display = 'block';
      } else {
        contenedor.style.display = 'none';
      }
    } catch (error) {
      console.error('Error en toggleCitas:', error);
      contenedor.innerHTML = `<div class="text-danger mt-2">${error.message}</div>`;
    }
  }

  // Función para iniciar el contador de tiempo de las citas
  function iniciarContador(idCita, fechaCita) {
    const elemento = document.getElementById(`contador-${idCita}`);
    function actualizarContador() {
      const ahora = new Date();
      const diferencia = fechaCita - ahora;
      if (diferencia < 0) {
        elemento.innerHTML = '<span class="text-danger">Cita expirada</span>';
        return;
      }
      const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
      elemento.innerHTML = `<span class="text-success"><i class="bi bi-clock"></i> ${dias}d ${horas}h ${minutos}m restantes</span>`;
    }
    actualizarContador();
    setInterval(actualizarContador, 60000);
  }

  // Función para completar una cita
  async function completarCita(idCita) {
    try {
      await fetch(`/api/citas/${idCita}/completar`, { method: 'PATCH' });
      cargarListaEspera();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al completar cita');
    }
  }

  // Función para eliminar una cita
  async function eliminarCita(idCita) {
    if (!confirm('¿Eliminar cita?')) return;
    try {
      await fetch(`/api/citas/${idCita}`, { method: 'DELETE' });
      cargarListaEspera();
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Ejecutar funciones al cargar el DOM
  document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    toggleMenuByRole();
    if (window.location.pathname.includes('Lista_de_espera.html')) {
      cargarListaEspera();
    }
  });

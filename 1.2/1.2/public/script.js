// ====== FUNCIONES UTILITARIAS ======
const mostrarSpinner = () => {
  document.getElementById('loadingSpinner').style.display = 'block';
};

const ocultarSpinner = () => {
  document.getElementById('loadingSpinner').style.display = 'none';
};

const showError = (message) => {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  errorDiv.style.color = 'red';
  errorDiv.style.borderRadius = '25px';
  errorDiv.style.background = '#f2f4f4';
};

const clearError = () => {
  const errorDiv = document.getElementById('error-message');
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';
};

// ====== MODO DEMO (demo en línea) ======
// Si el servidor dice que es la demo, se esconde el ingreso con Google y se muestra «Probar la demo».
let modoDemo = false;
const modoListo = fetch('/api/modo')
  .then(r => (r.ok ? r.json() : { demo: false }))
  .then(d => { modoDemo = Boolean(d.demo); })
  .catch(() => {});

const activarModoDemo = () => {
  document.getElementById('buttonDiv')?.style.setProperty('display', 'none');
  document.getElementById('demo-entrada')?.style.setProperty('display', 'block');
};

window.entrarDemo = () => {
  mostrarSpinner();
  clearError();
  fetch('/api/login-demo', { method: 'POST' })
    .then(r => {
      if (!r.ok) throw new Error('No se pudo abrir la demo');
      return r.json();
    })
    .then(data => {
      localStorage.setItem('user', JSON.stringify({ email: data.email, role: data.rol, name: data.name }));
      localStorage.setItem('usuario', JSON.stringify(data));
      window.location.href = '/Lista_de_espera.html';
    })
    .catch(error => showError(error.message || 'No se pudo abrir la demo'))
    .finally(() => ocultarSpinner());
};

// ====== MANEJO DE AUTENTICACIÓN CON GOOGLE ======
const handleCredentialResponse = (response) => {
  mostrarSpinner();
  clearError();

  fetch('/api/login-google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokenId: response.credential })
  })
  .then(response => {
    if (!response.ok) throw new Error('Error en la respuesta del servidor');
    return response.json();
  })
  .then(data => {
    if (data.error) throw new Error(data.error);
    
    // Almacenar datos de usuario
    localStorage.setItem('user', JSON.stringify({
      email: data.email,
      role: data.rol,
      name: data.name
    }));
    localStorage.setItem("usuario", JSON.stringify(data));
    // Redirección segura
    window.location.href = '/Lista_de_espera.html';
  })
  .catch(error => {
    showError(error.message || 'Error al iniciar sesión');
    console.error('Error:', error);
  })
  .finally(() => ocultarSpinner());
};

// ====== INICIALIZACIÓN DE GOOGLE ======
const initGoogleAuth = () => {
  try {
    google.accounts.id.initialize({
      client_id: '161231616458-jdoht8pgpg0rrmkkscot2m9bsrv10km7.apps.googleusercontent.com',
      callback: handleCredentialResponse,
      auto_select: false
    });

    google.accounts.id.renderButton(
      document.getElementById('buttonDiv'),
      { 
        theme: 'outline', 
        size: 'large',
        width: '240px',
        text: 'signin_with',
        shape: 'rectangular'
      }
    );

    google.accounts.id.prompt();
  } catch (error) {
    console.error('Error inicializando Google Auth:', error);
    showError('Error al cargar el servicio de autenticación');
  }
};

// ====== FUNCIÓN DE LOGOUT GLOBAL ======
window.cerrarSesion = () => {
  localStorage.removeItem('user');
  window.location.href = '/';
  console.log('Sesión cerrada exitosamente');
};

// ====== VERIFICACIÓN DE AUTENTICACIÓN MEJORADA ======
const verificarAutenticacion = () => {
  const usuario = localStorage.getItem('user');
  const paginaActual = window.location.pathname.split('/').pop();
  const paginasProtegidas = [
    'Lista_de_espera.html',
    'Otra_pagina_protegida.html'
  ];

  // Redirigir si no está autenticado en página protegida
  if (!usuario && paginasProtegidas.includes(paginaActual)) {
    window.location.href = '/';
  }

  // Ocultar/mostrar botón según autenticación
  const botonLogout = document.querySelector('.btn.btn-danger');
  if (botonLogout) {
    botonLogout.style.display = usuario ? 'block' : 'none';
  }
};

// ====== CONTROL DE VISIBILIDAD DEL MENÚ POR ROL ======
const toggleMenuByRole = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'block';
    });
  }
};

// ====== INICIALIZACIÓN DE LA APLICACIÓN ======
document.addEventListener('DOMContentLoaded', () => {
  // Cargar Google SDK primero
  document.addEventListener('google-loaded', async () => {
    await modoListo;
    if (!modoDemo) initGoogleAuth();
  });
  modoListo.then(() => { if (modoDemo) activarModoDemo(); });

  // Verificar autenticación mejorada
  verificarAutenticacion();
  
  // Configurar menú según rol
  toggleMenuByRole();

  // Limpiar errores al recargar
  clearError();

  // Asignar evento de logout si existe el botón
  document.querySelector('.btn.btn-danger')?.addEventListener('click', cerrarSesion);
});

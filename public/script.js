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

// Función para manejar el inicio de sesión
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    // Validación básica
    if (!email || !password) {
      throw new Error('Por favor, completa todos los campos.');
    }

    // Enviar datos al servidor
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    // Manejar errores del servidor
    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    // Guardar token y datos del usuario
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

// Verificar si el usuario ya está autenticado
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (token && user) {
    // Redirigir según el rol
    if (user.role === 'admin') {
      window.location.href = 'Lista_de_espera.html';
    } else if (user.role === 'terapeuta') {
      window.location.href = 'reportes.html';
    }
  }
}

// Función para cargar la lista de espera
async function cargarListaEspera() {
  try {
    const response = await fetch('/api/lista-espera');
    const pacientes = await response.json();
    
    const contenedor = document.getElementById('lista-espera');
    contenedor.innerHTML = pacientes.map(paciente => `
      <div class="paciente-item">
        <img src="${paciente.foto_url || 'assets/default-avatar.png'}" 
             alt="${paciente.nombre}" class="avatar">
        <div class="info">
          <h3>${paciente.nombre} ${paciente.apellido}</h3>
          <p>Tipo de atención: ${paciente.tipo_atencion}</p>
          <span class="estado ${paciente.estado}">${paciente.estado}</span>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error:', error);
  }
}
// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Cargar lista de espera si estamos en la página correcta
  if (window.location.pathname.includes('Lista_de_espera.html')) {
    cargarListaEspera();
  }
});
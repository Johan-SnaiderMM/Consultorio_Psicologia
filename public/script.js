function handleCredentialResponse(response) {
  // Decodificar el token de ID de Google
  const jwt = response.credential;
  const payload = JSON.parse(atob(jwt.split('.')[1]));

  console.log("Usuario autenticado:", payload);

  if (payload.email.endsWith("@amigo.edu.co")) {
      alert("Inicio de sesión exitoso");
      // Redirigir al usuario a Lista.html
      window.location.href = "Lista_de_espera.html";
  } else {
    alert("Solo se permiten correos @amigo.edu.co");
  }
}

// Cargar el script de Google Identity Services correctamente
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



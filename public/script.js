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

function handleCredentialResponse(response) {
  // Decodificar el token de ID de Google
  const jwt = response.credential;
  const payload = JSON.parse(atob(jwt.split('.')[1]));

  console.log("Usuario autenticado:", payload);

  if (payload.email.endsWith("@amigo.edu.co")) {
    alert("Inicio de sesión exitoso");
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

// Cargar lista al iniciar si el usuario ya está autenticado
document.addEventListener('DOMContentLoaded', cargarListaEspera);

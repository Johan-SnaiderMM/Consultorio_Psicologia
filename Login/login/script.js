function handleCredentialResponse(response) {
  // Decodificar el token de ID de Google
  const jwt = response.credential;
  const payload = JSON.parse(atob(jwt.split('.')[1]));

  console.log("Usuario autenticado:", payload);

  if (payload.email.endsWith("@amigo.edu.co")) {
      alert("Inicio de sesión exitoso");
      // Redirigir al usuario a Lista.html
      window.location.href = "Lista.html";
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

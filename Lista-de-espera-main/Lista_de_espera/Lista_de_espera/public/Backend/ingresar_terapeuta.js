// Funciones de utilidad
const mostrarSpinner = () => document.getElementById('loadingSpinner').style.display = 'block';
const ocultarSpinner = () => document.getElementById('loadingSpinner').style.display = 'none';

const mostrarMensaje = (message, type = 'danger') => {
    const container = document.getElementById('message-container');
    container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    container.style.display = 'block';
    setTimeout(() => { container.style.display = 'none'; }, 5000);
};

// Verificación de rol de usuario
document.addEventListener("DOMContentLoaded", () => {
    try {
        // 1. Verificar si hay usuario autenticado
        const userData = localStorage.getItem('user');
        if (!userData) {
            mostrarMensaje('Debes iniciar sesión primero', 'warning');
            setTimeout(() => window.location.href = "/index.html", 2000);
            return;
        }

        // 2. Parsear datos del usuario
        const user = JSON.parse(userData);
        
        // 3. Verificar rol (con validación de propiedad)
        if (!user.role || user.role.toLowerCase() !== "admin") {
            mostrarMensaje('Acceso restringido a administradores', 'danger');
            setTimeout(() => window.location.href = "/Lista_de_espera.html", 2000);
            return;
        }

        // 4. Mostrar elementos admin
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });

    } catch (error) {
        console.error("Error de autenticación:", error);
        localStorage.clear(); // Limpiar datos corruptos
        window.location.href = "/index.html";
    }

    // Manejo del formulario
    document.getElementById('registroTerapeutaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarSpinner();
        
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Validación básica de campos
            if (!data.nombre || !data.apellido || !data.correo || !data.especialidad) {
                throw new Error("Todos los campos marcados con * son obligatorios");
            }

            const response = await fetch('/api/terapeutas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.error || 'Error al crear terapeuta');
            }

            mostrarMensaje('Terapeuta registrado exitosamente!', 'success');
            e.target.reset();

        } catch (error) {
            console.error('Error:', error);
            mostrarMensaje(`Error: ${error.message}`);
        } finally {
            ocultarSpinner();
        }
    });
});

// Función de cierre de sesión
window.cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
};
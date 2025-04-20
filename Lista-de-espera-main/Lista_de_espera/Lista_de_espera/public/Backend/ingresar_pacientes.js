// Funciones de utilidad
const mostrarSpinner = () => document.getElementById('loadingSpinner').style.display = 'block';
const ocultarSpinner = () => document.getElementById('loadingSpinner').style.display = 'none';

const mostrarMensaje = (message, type = 'danger') => {
    const container = document.getElementById('message-container');
    container.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    container.style.display = 'block';
    setTimeout(() => { container.style.display = 'none'; }, 5000);
};

// Autenticación y carga inicial
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role?.toLowerCase() !== "admin") {
            window.location.href = "/Lista_de_espera.html";
            return;
        }

        
        // Cargar terapeutas
        const response = await fetch('/api/terapeutas');
        const terapeutas = await response.json();
        
        const dropdown = document.getElementById('terapeutasDropdown');
        dropdown.innerHTML = terapeutas.map(t => 
            `<option value="${t.id_terapeuta}">${t.nombre} ${t.apellido}</option>`
        ).join('');

    } catch (error) {
        console.error("Error inicial:", error);
        window.location.href = "/index.html";
    }
});

// Manejo del formulario
document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarSpinner();

    try {
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Validación de email
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(data.correo)) {
            throw new Error("Formato de correo inválido");
        }
        
        console.log("Datos enviados:", data);
        const response = await fetch('/api/pacientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al registrar paciente');
        }

        mostrarMensaje('¡Paciente registrado exitosamente!', 'success');
        e.target.reset();

    } catch (error) {
        mostrarMensaje(`Error: ${error.message}`);
    } finally {
        ocultarSpinner();
    }
});

// Cierre de sesión
window.cerrarSesion = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/index.html';
};
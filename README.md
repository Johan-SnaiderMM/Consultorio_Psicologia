# 🧠 Sistema de Gestión - Consultorio Psicológico

¡Bienvenido al **Sistema de Gestión de Consultorio Psicológico**! Esta es una aplicación web premium diseñada para optimizar los flujos de trabajo clínicos de psicólogos y terapeutas, permitiendo la administración eficiente de listas de espera, citas de pacientes, redacción de informes evolutivos y generación automatizada de reportes médicos en PDF.

---

## 🌐 Demo en línea

**https://consultorio-psicologia-demo.vercel.app**: entra con el botón **Probar la demo** (sin Google). Todos los datos son **ficticios** (terapeutas, pacientes, citas y notas inventados) y se reinician solos.

La demo usa el mismo código, el mismo esquema y los mismos triggers del sistema: un Postgres real en memoria ([PGlite](https://pglite.dev)) reemplaza a la base local (`1.2/1.2/demo/`). Se activa sola en Vercel o con `DEMO=1 node server.js`; sin eso, todo funciona como se describe más abajo.

---

## 🚀 Tecnologías Utilizadas

El proyecto está construido bajo una arquitectura robusta y moderna sin dependencias excesivas:

* **Backend:** Node.js con Express.
* **Base de Datos:** PostgreSQL con transacciones robustas y triggers automáticos de validación de negocio.
* **Frontend:** HTML5, CSS3 personalizado (con efectos de desenfoque/glassmorphism y diseño responsive premium), y Javascript Vanilla para un alto rendimiento.
* **Librerías Clave:** 
  * `jsPDF` en el frontend para renderizado de documentos clínicos en PDF en tiempo real.
  * `pg` para la comunicación del pool de base de datos PostgreSQL.
  * Autenticación OAuth 2.0 con Google.

---

## 🌟 Características Principales

### 📋 1. Lista de Espera Inteligente
* Administración dinámica de pacientes en lista de espera.
* Priorización y estados personalizados para pacientes (`Activo`, `Intermitente`, `Pausa`, `Desertado`) con indicadores visuales interactivos.
* Contador dinámico en tiempo real que indica los días, horas y minutos restantes para la próxima cita agendada.

### 📅 2. Agendamiento y Reglas de Negocio Robustas
* Prevención estricta de solapamiento de citas médicas mediante triggers a nivel de base de datos y constraints de exclusión (`EXCLUDE USING GIST`).
* Regla de negocio de al menos 1 hora de separación de seguridad entre citas de un mismo terapeuta.
* Control del límite semanal de máximo 2 citas agendadas por terapeuta para garantizar la calidad en la atención psicológica.

### 📝 3. Editor de Reportes Clínicos y Evolutivos
* Sección interactiva para redactar y guardar las observaciones de cada consulta en tiempo real.
* Guardado persistente de la evolución del paciente (`Upsert`) con registro automático del editor responsable.
* Carga de datos histórica instantánea al seleccionar citas previas.

### 📄 4. Generación de PDFs en Tiempo Real
* **Reporte de Consulta Individual:** Genera un documento clínico oficial con los datos del paciente, detalles de la sesión y las observaciones redactadas.
* **Historial Completo del Paciente (Novedad):** Genera un PDF consolidado multi-página que recopila de manera ordenada y formal **todas las sesiones y evoluciones** registradas del paciente seleccionado en orden cronológico.

---

## 🛠️ Instalación y Configuración Local

### Prerrequisitos
* [Node.js](https://nodejs.org/) instalado.
* [PostgreSQL](https://www.postgresql.org/) (Versión 15 o superior recomendada).

### 1. Clonar el repositorio
```bash
git clone https://github.com/Johan-SnaiderMM/Consultorio_Psicologia.git
cd Consultorio_Psicologia
```

### 2. Configurar la Base de Datos
1. Crea una base de datos en PostgreSQL llamada `DBconsultoriopsi`.
2. Ejecuta el esquema base del proyecto:
   ```bash
   psql -U postgres -d DBconsultoriopsi -f 1.2/1.2/setup_schema.sql
   ```
3. Aplica las correcciones y optimizaciones de triggers para evitar falsos positivos de solapamiento de citas al actualizar estados o recalcular rangos:
   ```bash
   psql -U postgres -d DBconsultoriopsi -f 1.2/1.2/fix_trigger.sql
   psql -U postgres -d DBconsultoriopsi -f 1.2/1.2/fix_rango_trigger.sql
   ```

### 3. Instalar Dependencias
Entra en la carpeta del servidor e instala las dependencias de npm:
```bash
cd 1.2/1.2
npm install
```

### 4. Configurar Variables de Entorno
Crea un archivo `.env` en la ruta `1.2/1.2/.env` con tus credenciales de PostgreSQL:
```env
DB_USER=postgres
DB_PASSWORD=tu_contraseña
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=DBconsultoriopsi
```

### 5. Iniciar el Servidor
```bash
node server.js
```
El servidor comenzará a ejecutarse en 👉 **http://localhost:5001**.

---

## 🔒 Autenticación y Credenciales

El proyecto cuenta con inicio de sesión seguro integrado de Google para dominios institucionales (`@amigo.edu.co`).

* **Usuario Administrador por Defecto:**
  * **Nombre:** Johan
  * **Email:** `johan.morenomu@amigo.edu.co`
  * **Rol:** admin

---

## 🛠️ Últimas Mejoras y Correcciones de Errores

Recientemente se aplicaron los siguientes ajustes de ingeniería al software:

1. **Trigger de Validación Excluida en UPDATE:** Se corrigió el trigger `validar_espacio_citas()` en la BD para omitir la validación de solapamiento de citas cuando únicamente se actualiza el `estado` (ej. marcar como `completada`), lo que causaba el error *"Error al completar cita"*.
2. **Corrección de Duración en Agendamiento:** Se corrigió el envío de duración en la lista de espera, cambiando el string `"1 hour"` por el entero de minutos `60` para evitar conversiones erróneas en el parseador de base de datos.
3. **Consolidado Historial PDF (LEFT JOIN):** Se optimizó la consulta del endpoint `/api/reportes/paciente/:id` usando un `LEFT JOIN` a la tabla `Citas` en lugar de `INNER JOIN`. Ahora se pueden exportar historiales con citas completadas de manera inmediata, listando *"Sin observaciones registradas"* para las sesiones que aún no contienen anotaciones redactadas.
4. **Editor de Reportes y Evolución:** Se creó e implementó el editor y base de datos interactivo para que los terapeutas guarden de forma ágil e intuitiva sus notas de evolución directamente desde la UI de reportes.

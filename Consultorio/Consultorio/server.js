const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'DBconsultoriopsi',
  password: '0240',
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Ruta de prueba de conexión
app.get('/api/prueba-conexion', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ mensaje: 'Conexión exitosa a la base de datos' });
  } catch (error) {
    console.error('Error al conectar:', error);
    return res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// Ruta para ver usuarios
app.get('/api/ver-usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Usuarios');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// ========================================
// Rutas de Terapeutas
// ========================================

// Obtener todos los terapeutas
app.get('/api/terapeutas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id_terapeuta, nombre, apellido FROM Terapeutas');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener terapeutas' });
  }
});

// Crear un nuevo terapeuta
app.post('/api/terapeutas', async (req, res) => {
  const { nombre, apellido, correo, especialidad } = req.body;
  try {
    if (!nombre || !apellido || !correo || !especialidad) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const result = await pool.query(
      'INSERT INTO Terapeutas (nombre, apellido, correo, especialidad) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, apellido, correo, especialidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear terapeuta', detalle: err.message });
  }
});

// ========================================
// Rutas de Pacientes
// ========================================

// Obtener todos los pacientes
app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Pacientes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

// Crear un nuevo paciente y agregarlo a la lista de espera
app.post('/api/pacientes', async (req, res) => {
  const { nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id } = req.body;
  try {
    const pacienteResult = await pool.query(
      'INSERT INTO Pacientes (nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id]
    );
    // Agregar a la lista de espera
    await pool.query(
      'INSERT INTO ListaEspera (paciente_id, terapeuta_id) VALUES ($1, $2)',
      [pacienteResult.rows[0].id_paciente, terapeuta_id]
    );
    res.status(201).json(pacienteResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

// ========================================
// Rutas de Lista de Espera (Integradas desde MySQL)
// ========================================

// Obtener la lista de espera con detalle del paciente y terapeuta
app.get('/api/lista-espera', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.id_lista, le.paciente_id, le.terapeuta_id,
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
      ORDER BY le.creado_en ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lista de espera' });
  }
});

// Obtener un solo paciente de la lista de espera por ID
app.get('/api/lista-espera/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.id_lista, le.paciente_id, le.terapeuta_id,
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
      WHERE le.id_lista = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado en lista de espera' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener paciente de lista de espera' });
  }
});

// ========================================
// Rutas de Citas (Integradas desde MySQL)
// ========================================

// Crear una nueva cita
app.post('/api/citas', async (req, res) => {
  const { paciente_id, terapeuta_id, fecha_hora, duracion } = req.body;
  try {
    const errores = [];
    if (!paciente_id) errores.push('paciente_id es requerido');
    if (!terapeuta_id) errores.push('terapeuta_id es requerido');
    if (!fecha_hora) errores.push('fecha_hora es requerida');
    if (errores.length > 0) return res.status(400).json({ error: 'Datos incompletos', detalles: errores });
    
    const result = await pool.query(
      `INSERT INTO Citas (paciente_id, terapeuta_id, fecha_hora, duracion, estado)
       VALUES ($1, $2, $3, $4, 'pendiente') RETURNING *`,
      [paciente_id, terapeuta_id, new Date(fecha_hora).toISOString(), duracion || '1 hour']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cita', detalle: err.message });
  }
});

// Completar una cita
app.patch('/api/citas/:id/completar', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE Citas SET estado = 'completada' WHERE id_cita = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ mensaje: 'Cita completada', cita: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// Eliminar una cita
app.delete('/api/citas/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM Citas WHERE id_cita = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ mensaje: 'Cita eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

// Obtener citas asociadas a un registro de lista de espera
app.get('/api/citas-lista/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
        p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
        t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido
      FROM Citas c
      JOIN ListaEspera le ON c.paciente_id = le.paciente_id 
        AND c.terapeuta_id = le.terapeuta_id
      JOIN Pacientes p ON c.paciente_id = p.id_paciente
      JOIN Terapeutas t ON c.terapeuta_id = t.id_terapeuta
      WHERE le.id_lista = $1
      ORDER BY c.fecha_hora DESC
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error en consulta de citas:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// Obtener citas completadas
app.get('/api/citas-completadas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id_cita, c.fecha_hora, 
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido,
             p.tipo_atencion
      FROM Citas c
      JOIN Pacientes p ON c.paciente_id = p.id_paciente
      JOIN Terapeutas t ON c.terapeuta_id = t.id_terapeuta
      WHERE c.estado = 'completada'
      ORDER BY c.fecha_hora DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener citas completadas' });
  }
});

// Obtener una cita específica por ID
app.get('/api/citas/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido,
             p.tipo_atencion
      FROM Citas c
      JOIN Pacientes p ON c.paciente_id = p.id_paciente
      JOIN Terapeutas t ON c.terapeuta_id = t.id_terapeuta
      WHERE c.id_cita = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener cita:', err);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

// ========================================
// Ruta para crear reportes
// ========================================
app.post('/api/reportes', async (req, res) => {
  const { cita_id, contenido, duracion } = req.body;
  try {
    // Actualizar duración en la tabla Citas
    await pool.query(
      'UPDATE Citas SET duracion = $1 WHERE id_cita = $2',
      [duracion, cita_id]
    );

    const result = await pool.query(
      'INSERT INTO Reportes (cita_id, contenido) VALUES ($1, $2) RETURNING *',
      [cita_id, contenido]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear reporte' });
  }
});

// ========================================
// Ruta para login con Google
// ========================================
app.post('/api/login-google', async (req, res) => {
  try {
    const { tokenId } = req.body;
    
    // 1. Verificar el token de Google (usar librería oficial)
    // 2. Extraer el email del payload del token
    // 3. Buscar en la base de datos
    const email = "johan.morenomu@amigo.edu.co"; // Temporal para prueba
    
    const result = await pool.query(
      `SELECT email, rol FROM Usuarios WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no registrado' });
    }

    res.json({
      email: result.rows[0].email,
      rol: result.rows[0].rol // Asegurar que el campo se llama "rol"
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error de autenticación' });
  }
});

// Iniciar servidor
const server = app.listen(5001, () => {
  console.log('Servidor HTTP en http://localhost:5001');
});

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

// Ruta para obtener terapeutas
app.get('/api/terapeutas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Terapeutas');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener terapeutas' });
  }
});

// Ruta para crear terapeutas
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

// Ruta para obtener pacientes
app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Pacientes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pacientes' });
  }
});

// Ruta para crear pacientes
app.post('/api/pacientes', async (req, res) => {
  const { nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id } = req.body;
  try {
    const pacienteResult = await pool.query(
      'INSERT INTO Pacientes (nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id]
    );
    await pool.query('INSERT INTO ListaEspera (paciente_id, terapeuta_id) VALUES ($1, $2)', [pacienteResult.rows[0].id_paciente, terapeuta_id]);
    res.status(201).json(pacienteResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

// Ruta para obtener la lista de espera
app.get('/api/lista-espera', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.*, p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
      ORDER BY le.creado_en ASC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lista de espera' });
  }
});

// Ruta para obtener un paciente específico de la lista de espera
app.get('/api/lista-espera/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT le.*, p.id_paciente, p.nombre AS paciente_nombre, p.apellido AS paciente_apellido,
             t.nombre AS terapeuta_nombre, t.apellido AS terapeuta_apellido
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
      WHERE le.id_lista = $1`, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente no encontrado en lista de espera' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener paciente de lista de espera' });
  }
});

// Ruta para crear citas
app.post('/api/citas', async (req, res) => {
  const { paciente_id, terapeuta_id, fecha_hora, duracion } = req.body;
  try {
    const errores = [];
    if (!paciente_id) errores.push('paciente_id es requerido');
    if (!terapeuta_id) errores.push('terapeuta_id es requerido');
    if (!fecha_hora) errores.push('fecha_hora es requerida');
    if (errores.length > 0) return res.status(400).json({ error: 'Datos incompletos', detalles: errores });
    
    const result = await pool.query(
      `INSERT INTO Citas (paciente_id, terapeuta_id, fecha_hora, duracion, estado) VALUES ($1, $2, $3, $4, 'pendiente') RETURNING *`,
      [paciente_id, terapeuta_id, new Date(fecha_hora).toISOString(), duracion || '1 hour']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear cita', detalle: err.message });
  }
});

// Ruta para completar citas
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

// Ruta para eliminar citas
app.delete('/api/citas/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM Citas WHERE id_cita = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    res.json({ mensaje: 'Cita eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar cita' });
  }
});

// Ruta para obtener citas por lista de espera
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
      ORDER BY c.fecha_hora DESC`, 
      [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error en consulta de citas:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// Ruta para obtener citas completadas
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
      ORDER BY c.fecha_hora DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener citas completadas' });
  }
});

// Ruta para obtener una cita específica por ID
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
      WHERE c.id_cita = $1`, 
      [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error al obtener cita:', err);
    res.status(500).json({ error: 'Error al obtener cita' });
  }
});

// Ruta para crear reportes
app.post('/api/reportes', async (req, res) => {
  const { cita_id, contenido, duracion } = req.body;
  try {
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

// Iniciar servidor
const server = app.listen(5001, () => {
  console.log('Servidor HTTP en http://localhost:5001');
});

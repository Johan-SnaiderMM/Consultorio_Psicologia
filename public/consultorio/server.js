const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const WebSocket = require('ws');
const app = express();

// Configuración de middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'DBconsultoriopsi',
  password: '0240',
  port: 5432,
});

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

// Endpoints para Terapeutas
app.post('/api/terapeutas', async (req, res) => {
  const { nombre, apellido, correo, especialidad } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO Terapeutas (nombre, apellido, correo, especialidad) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, apellido, correo, especialidad]
    );
    notificarCambios();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando terapeuta:', err);
    res.status(500).json({ error: 'Error al crear terapeuta' });
  }
});

app.get('/api/terapeutas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id_terapeuta, nombre, apellido, especialidad FROM Terapeutas'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo terapeutas:', err);
    res.status(500).json({ error: 'Error al obtener terapeutas' });
  }
});

// Endpoints para Pacientes (corregido)
app.post('/api/pacientes', async (req, res) => {
  const { nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id } = req.body;
  try {
    // Insertar en Pacientes
    const pacienteResult = await pool.query(
      `INSERT INTO Pacientes 
      (nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, apellido, cedula, correo, tipo_atencion, terapeuta_id]
    );

    // Insertar en ListaEspera
    await pool.query(
      `INSERT INTO ListaEspera 
      (paciente_id, terapeuta_id) 
      VALUES ($1, $2)`,
      [pacienteResult.rows[0].id_paciente, terapeuta_id]
    );

    notificarCambios();
    res.status(201).json(pacienteResult.rows[0]);
  } catch (err) {
    console.error('Error creando paciente:', err);
    res.status(500).json({ error: 'Error al crear paciente' });
  }
});

// Endpoint lista de espera corregido
app.get('/api/lista-espera', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        le.id_lista,
        p.nombre,
        p.apellido,
        le.estado,
        le.fecha_solicitud,
        t.nombre AS terapeuta_nombre
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      LEFT JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
      ORDER BY le.creado_en ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en lista de espera:', err);
    res.status(500).json({ error: 'Error al obtener lista de espera' });
  }
});

app.put('/api/lista-espera/prioridad', async (req, res) => {
  const { orden } = req.body;
  try {
    await pool.query('BEGIN');
    for (let i = 0; i < orden.length; i++) {
      await pool.query(
        'UPDATE ListaEspera SET prioridad = $1 WHERE id_lista = $2',
        [i + 1, orden[i]]
      );
    }
    await pool.query('COMMIT');
    notificarCambios();
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Error actualizando prioridades' });
  }
});

app.put('/api/lista-espera/:id', async (req, res) => {
  const { id } = req.params;
  const { terapeuta_id, estado, observaciones } = req.body;
  try {
    const result = await pool.query(
      `UPDATE ListaEspera 
       SET terapeuta_id = COALESCE($1, terapeuta_id),
           estado = COALESCE($2, estado),
           observaciones = COALESCE($3, observaciones)
       WHERE id_lista = $4 RETURNING *`,
      [terapeuta_id, estado, observaciones, id]
    );
    notificarCambios();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando lista:', err);
    res.status(500).json({ error: 'Error al actualizar registro' });
  }
});

// Endpoints para Calendario
app.get('/api/eventos-lista-espera', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        le.id_lista AS id,
        CONCAT(p.nombre, ' ', p.apellido) AS title,
        le.fecha_solicitud AS start,
        le.estado,
        le.observaciones,
        t.nombre AS terapeuta
      FROM ListaEspera le
      JOIN Pacientes p ON le.paciente_id = p.id_paciente
      LEFT JOIN Terapeutas t ON le.terapeuta_id = t.id_terapeuta
    `);
    
    const eventos = result.rows.map(evento => ({
      ...evento,
      backgroundColor: evento.estado === 'pendiente' ? '#f59e0b' : '#10b981',
      borderColor: evento.estado === 'pendiente' ? '#f59e0b' : '#10b981',
      extendedProps: {
        observaciones: evento.observaciones,
        estado: evento.estado,
        terapeuta: evento.terapeuta
      }
    }));
    
    res.json(eventos);
  } catch (err) {
    console.error('Error en eventos calendario:', err);
    res.status(500).json({ error: 'Error al obtener eventos' });
  }
});

// Endpoints para Citas
app.get('/api/citas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id_cita,
        c.fecha_hora,
        c.duracion,
        p.nombre AS paciente_nombre,
        t.nombre AS terapeuta_nombre
      FROM Citas c
      JOIN Pacientes p ON c.paciente_id = p.id_paciente
      JOIN Terapeutas t ON c.terapeuta_id = t.id_terapeuta
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo citas:', err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// WebSocket
function notificarCambios() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ tipo: 'actualizacion' }));
    }
  });
}


// Manejo de errores
app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
const server = app.listen(5000, () => {
  console.log('Servidor HTTP en http://localhost:5000');
});



// Adjuntar WebSocket al servidor HTTP

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});
// Datos de la DEMO: TODOS ficticios (personas, cédulas, correos y notas clínicas inventados).
// Las fechas se calculan respecto a hoy para que la demo siempre se vea viva: sesiones ya hechas en las
// últimas semanas y citas pendientes en la semana que viene.
//
// Respetan las reglas del sistema (si no, los triggers de la base las rechazarían): máximo 2 citas por
// terapeuta en la misma semana y al menos 1 hora de separación entre citas de un mismo terapeuta.

const TERAPEUTAS = [
  ["Valentina", "Ospina", "valentina.ospina@demo.test", "Psicología clínica"],
  ["Andrés", "Mejía", "andres.mejia@demo.test", "Psicología infantil"],
  ["Laura", "Cárdenas", "laura.cardenas@demo.test", "Terapia de pareja y familia"],
  ["Camilo", "Restrepo", "camilo.restrepo@demo.test", "Neuropsicología"],
];

// nombre, apellido, cédula, edad, tipo de atención, dirección, EPS, estado, terapeuta (posición 1..4)
const PACIENTES = [
  ["Sofía", "Herrera", "1000000001", 29, "Individual", "Calle 10 # 20-30", "Sura", "activo", 1],
  ["Mateo", "Zapata", "1000000002", 34, "Individual", "Carrera 45 # 8-12", "Sanitas", "intermitente", 1],
  ["Isabella", "Roldán", "1000000003", 9, "Familiar", "Avenida 80 # 33-05", "Nueva EPS", "activo", 2],
  ["Samuel", "Vélez", "1000000004", 41, "Individual", "Calle 52 # 14-77", "Coosalud", "pausa", 2],
  ["Mariana", "Ortiz", "1000000005", 31, "Pareja", "Carrera 70 # 25-18", "Sura", "activo", 3],
  ["Julián", "Montoya", "1000000006", 33, "Pareja", "Carrera 70 # 25-18", "Sura", "activo", 3],
  ["Daniela", "Cano", "1000000007", 26, "Individual", "Calle 33 # 65-40", "Sanitas", "activo", 4],
  ["Felipe", "Arango", "1000000008", 52, "Individual", "Transversal 39 # 70-21", "Nueva EPS", "desertado", 4],
  ["Carolina", "Muñoz", "1000000009", 38, "Individual", "Calle 7 # 43-90", "Sura", "activo", 1],
  ["Esteban", "Giraldo", "1000000010", 12, "Familiar", "Carrera 51 # 12-34", "Coosalud", "activo", 2],
];

// terapeuta, paciente, semanas respecto a esta (negativo = pasado), día (0 = lunes), hora local de Colombia, estado
const CITAS = [
  [1, 1, -4, 0, 9, "completada"],
  [1, 2, -4, 2, 10, "completada"],
  [1, 1, -3, 0, 9, "completada"],
  [1, 1, -2, 0, 9, "completada"],
  [1, 2, -2, 2, 10, "completada"],
  [1, 1, -1, 0, 9, "completada"],
  [1, 1, 1, 1, 9, "pendiente"],
  [2, 4, -5, 1, 15, "completada"],
  [2, 3, -3, 3, 16, "completada"],
  [2, 3, -2, 3, 16, "completada"],
  [2, 3, -1, 3, 16, "completada"],
  [2, 3, 1, 3, 16, "pendiente"],
  [3, 5, -3, 2, 14, "completada"],
  [3, 5, -2, 2, 14, "completada"],
  [3, 6, -2, 4, 11, "completada"],
  [3, 5, -1, 2, 14, "completada"],
  [3, 6, -1, 4, 11, "completada"],
  [3, 5, 1, 2, 14, "pendiente"],
  [3, 6, 1, 4, 11, "pendiente"],
  [4, 8, -6, 1, 10, "completada"],
  [4, 7, -3, 1, 10, "completada"],
  [4, 7, -2, 1, 10, "completada"],
  [4, 7, -1, 1, 10, "completada"],
  [4, 7, 1, 1, 10, "pendiente"],
];

// Nota de evolución de cada sesión completada, en el orden de CITAS (por paciente, de la más vieja a la más nueva).
const NOTAS = {
  1: [
    "Sesión 1. Se explora el motivo de consulta: estrés por carga laboral y dificultad para dormir. Se acuerdan los objetivos de trabajo y se explica el encuadre terapéutico.",
    "Sesión 2. Se revisa el registro de sueño. Se entrena la respiración diafragmática y se asigna práctica diaria de cinco minutos.",
    "Sesión 3. Mejora parcial del sueño (de 4 a 6 horas). Se identifican pensamientos automáticos ante la sobrecarga y se practica la reestructuración cognitiva.",
    "Sesión 4. Se consolidan las estrategias de manejo del estrés. Se plantea espaciar las sesiones y se define el plan de seguimiento.",
  ],
  2: [
    "Sesión 1. Se identifican situaciones sociales que generan ansiedad. Se construye una jerarquía de exposición gradual.",
    "Sesión 2. Se revisa la primera exposición (saludar a un compañero nuevo). Se refuerzan los logros y se ajusta la siguiente tarea.",
  ],
  3: [
    "Sesión 1. Juego diagnóstico con la niña y su cuidadora. Se observan buena interacción y dificultad para nombrar emociones.",
    "Sesión 2. Se trabaja la identificación de emociones con tarjetas ilustradas. Se acuerdan pautas sencillas para la casa.",
    "Sesión 3. La niña nombra con más facilidad cómo se siente. Se practica un ejercicio de calma con respiración y se dan pautas a la familia.",
  ],
  4: ["Sesión 1. Entrevista inicial y devolución de objetivos. El paciente solicita una pausa por motivos de agenda."],
  5: [
    "Sesión 1. Se revisan expectativas de ambos y patrones de comunicación. Se acuerdan reglas básicas para conversar sin interrumpirse.",
    "Sesión 2. Se practica la escucha activa con ejercicios guiados. Ambos reconocen avances en los acuerdos del hogar.",
    "Sesión 3. Se trabaja la distribución de tareas y los tiempos de pareja. Se programa un seguimiento.",
  ],
  6: [
    "Sesión 1. Se exploran las preocupaciones por el cambio de horarios laborales. Se practica comunicar necesidades con mensajes en primera persona.",
    "Sesión 2. Se evalúan los acuerdos de la semana. Se refuerza la rutina compartida y se plantea una actividad conjunta.",
  ],
  7: [
    "Sesión 1. Adaptación a una nueva ciudad: se exploran el estado de ánimo y las redes de apoyo. Se plantean metas semanales pequeñas.",
    "Sesión 2. Se revisan las metas cumplidas y se programan actividades agradables. Mejora del ánimo según su reporte.",
    "Sesión 3. Se fortalece la rutina de actividad y contacto social. Se acuerda continuar con seguimiento quincenal.",
  ],
  8: ["Sesión 1. Entrevista inicial. Se acuerda un plan de trabajo; el paciente no vuelve a confirmar sus citas."],
};

/** Lunes (UTC) de la semana actual desplazado `semanas` semanas. */
function lunes(semanas) {
  const ahora = new Date();
  const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()));
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes + semanas * 7);
  return d;
}

/** Instante de una cita: `horaColombia` es la hora local (UTC-5), que se guarda en UTC. */
function instante(semanas, dia, horaColombia) {
  const d = lunes(semanas);
  d.setUTCDate(d.getUTCDate() + dia);
  d.setUTCHours(horaColombia + 5, 0, 0, 0);
  return d;
}

async function sembrar(db) {
  await db.query(
    `INSERT INTO Usuarios (nombre, email, rol) VALUES
       ('Administración Demo', 'demo@consultorio.test', 'admin'),
       ('Terapeuta Demo', 'terapeuta@consultorio.test', 'terapeuta')`
  );

  for (const [nombre, apellido, correo, especialidad] of TERAPEUTAS) {
    await db.query(`INSERT INTO Terapeutas (nombre, apellido, correo, especialidad) VALUES ($1, $2, $3, $4)`, [
      nombre,
      apellido,
      correo,
      especialidad,
    ]);
  }

  for (const [nombre, apellido, cedula, edad, tipo, direccion, eps, estado, terapeuta] of PACIENTES) {
    const correo = `${nombre}.${apellido}@demo.test`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    await db.query(
      `INSERT INTO Pacientes (nombre, apellido, cedula, edad, correo, tipo_atencion, direccion, eps, estado_paciente, terapeuta_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [nombre, apellido, cedula, edad, correo, tipo, direccion, eps, estado, terapeuta]
    );
    // Entran a la lista de espera en orden de llegada.
    await db.query(
      `INSERT INTO ListaEspera (paciente_id, terapeuta_id)
       SELECT id_paciente, terapeuta_id FROM Pacientes WHERE cedula = $1`,
      [cedula]
    );
  }

  const sesionDe = {};
  for (const [terapeuta, paciente, semanas, dia, hora, estado] of CITAS) {
    const tipo = PACIENTES[paciente - 1][4];
    const cita = await db.query(
      `INSERT INTO Citas (paciente_id, terapeuta_id, fecha_hora, duracion, estado, tipo_atencion)
       VALUES ($1, $2, $3, INTERVAL '60 minutes', $4, $5) RETURNING id_cita`,
      [paciente, terapeuta, instante(semanas, dia, hora).toISOString(), estado, tipo]
    );
    if (estado === "completada") {
      const n = (sesionDe[paciente] = (sesionDe[paciente] || 0) + 1);
      const nota = (NOTAS[paciente] || [])[n - 1];
      if (nota) {
        await db.query(`INSERT INTO Reportes (cita_id, contenido, editor) VALUES ($1, $2, $3)`, [
          cita.rows[0].id_cita,
          nota,
          "terapeuta@consultorio.test",
        ]);
      }
    }
  }
}

module.exports = { sembrar };

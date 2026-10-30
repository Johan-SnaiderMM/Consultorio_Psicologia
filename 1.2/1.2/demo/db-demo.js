// Base de datos de la DEMO en línea: Postgres real en memoria (PGlite) con el MISMO esquema, triggers y
// restricciones del sistema (setup_schema.sql + los dos fix_*.sql). No hay datos reales: todo sale de semilla.js
// y se reconstruye solo cada vez que el servidor arranca en frío.
//
// Expone lo mínimo de `pg.Pool` que usa server.js: `query(texto, params)` y `connect()` (con `query` y `release`).
// PGlite atiende una consulta a la vez, así que `connect()` toma un turno y lo suelta en `release()`: una
// transacción (BEGIN … COMMIT) nunca se mezcla con las consultas de otra petición.
const fs = require("fs");
const path = require("path");
const { PGlite } = require("@electric-sql/pglite");
const { btree_gist } = require("@electric-sql/pglite/contrib/btree_gist");
const { sembrar } = require("./semilla");

const RAIZ = path.join(__dirname, "..");
const leerSql = (nombre) => fs.readFileSync(path.join(RAIZ, nombre), "utf8");

/** Mismo contrato que `pg`: `rowCount` cuenta filas devueltas o afectadas. */
function normalizar(r) {
  const rows = r.rows || [];
  return { rows, rowCount: rows.length || r.affectedRows || 0, fields: r.fields };
}

/** Cola de turnos: quien llama espera a que termine el anterior y recibe la función para soltar el suyo. */
function crearTurnos() {
  let ultimo = Promise.resolve();
  return function tomar() {
    let soltar;
    const miTurno = new Promise((resolver) => (soltar = resolver));
    const anterior = ultimo;
    ultimo = anterior.then(() => miTurno);
    return anterior.then(() => soltar);
  };
}

async function iniciarBase() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(leerSql("setup_schema.sql"));
  await db.exec(leerSql("fix_trigger.sql"));
  await db.exec(leerSql("fix_rango_trigger.sql"));
  // El script del sistema deja un administrador real: en la demo se quita y solo hay cuentas ficticias.
  await db.exec("DELETE FROM Usuarios;");
  await sembrar(db);
  return db;
}

function crearPoolDemo() {
  const tomarTurno = crearTurnos();
  const listo = iniciarBase();
  // Si el arranque falla, que el error llegue a quien espere `pool.listo` y no quede como promesa sin atender.
  listo.catch((error) => console.error("No se pudo iniciar la base de la demo:", error));

  return {
    listo,
    async query(texto, params) {
      const db = await listo;
      const soltar = await tomarTurno();
      try {
        return normalizar(await db.query(texto, params || []));
      } finally {
        soltar();
      }
    },
    async connect() {
      const db = await listo;
      const soltar = await tomarTurno();
      let liberado = false;
      return {
        async query(texto, params) {
          return normalizar(await db.query(texto, params || []));
        },
        release() {
          if (liberado) return;
          liberado = true;
          soltar();
        },
      };
    },
  };
}

module.exports = { crearPoolDemo };

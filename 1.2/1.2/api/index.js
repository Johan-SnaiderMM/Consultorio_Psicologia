// Función de Vercel: entrega la misma app de Express (server.js), que en Vercel corre en modo demo
// (Postgres en memoria con datos ficticios, ver demo/). Los archivos estáticos salen de public/.
module.exports = require("../server");

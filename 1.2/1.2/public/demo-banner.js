// Aviso de la demo en línea: una franja fina arriba de cada pantalla. En el sistema normal no hace nada.
(function () {
  fetch('/api/modo')
    .then(function (r) { return r.ok ? r.json() : { demo: false }; })
    .then(function (d) {
      if (!d.demo) return;
      var franja = document.createElement('div');
      franja.textContent = 'DEMO PÚBLICA · todos los datos son ficticios y se reinician solos';
      franja.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;z-index:2000;padding:6px 12px;text-align:center;' +
        'font:600 13px/1.3 system-ui,sans-serif;letter-spacing:.04em;background:#1f6f8b;color:#fff;';
      document.body.appendChild(franja);
      document.body.style.paddingBottom = '34px';
    })
    .catch(function () {});
})();

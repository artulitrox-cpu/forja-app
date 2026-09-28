// Pone una versión (?v=...) en los <script src="js/..."> de index.html para que el navegador
// nunca mezcle un index.html nuevo con scripts antiguos de su caché.
// Uso: node tools/stamp.js [versión]   (por defecto, la fecha y hora actual)
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'index.html');
const v = process.argv[2] || new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const html = fs.readFileSync(file, 'utf8');
const out = html.replace(/(<script src="js\/[\w-]+\.js)(\?v=[\w.-]*)?"/g, `$1?v=${v}"`);
fs.writeFileSync(file, out);
console.log(`index.html: scripts con ?v=${v}`);

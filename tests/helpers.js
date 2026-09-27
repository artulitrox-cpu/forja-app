// Carga los scripts clásicos de js/ en un contexto vm compartido, como hace el navegador.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function load(files, globals = {}) {
  const ctx = vm.createContext({ console, Math, Date, JSON, ...globals });
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  }
  // Las declaraciones const/let de nivel superior no son propiedades del global:
  // se leen evaluando su nombre dentro del contexto.
  ctx.get = (name) => vm.runInContext(name, ctx);
  return ctx;
}

const LOGIC = ['js/catalog.js', 'js/plan.js'];

function sampleProfile(over = {}) {
  return {
    name: 'Prueba', age: 35, sex: 'm', height: 178, weight: 80,
    level: 'beg', goal: 'hyp', days: 3, equip: 'gym', ...over,
  };
}

// Los objetos del contexto vm tienen otros prototipos: se normalizan para compararlos.
const plain = (v) => JSON.parse(JSON.stringify(v));

module.exports = { load, LOGIC, sampleProfile, plain, ROOT };

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, sampleProfile } = require('./helpers');

// Reloj y avisos simulados: timer.js usa Date.now() y toast().
const clock = { t: 1e12 };
class FakeDate extends Date { static now() { return clock.t; } }
const toasts = [];
const c = load(['js/catalog.js', 'js/plan.js', 'js/timer.js', 'js/hr.js'], {
  Date: FakeDate, navigator: {}, location: { search: '' }, document: { addEventListener() {} },
  toast: (m) => toasts.push(m), window: {},
});
const zoneWatch = c.get('zoneWatch'), hrZoneOf = c.get('hrZoneOf');
const pr = sampleProfile({ age: 30 }); // FC máx. 190: Z2 114–132, Z3 133–151, Z4 152–170
const z = (bpm) => hrZoneOf(bpm, pr);
// Simula lecturas cada segundo durante n segundos.
function ride(bpm, n, lo, hi, elapsed0 = 600, grace = 0) {
  for (let i = 0; i < n; i++) { clock.t += 1000; zoneWatch(z(bpm), lo, hi, elapsed0 + i, grace); }
}

test('aviso para bajar solo tras 1 min seguido por encima de la zona', () => {
  toasts.length = 0;
  ride(140, 50, 2, 2);
  assert.equal(toasts.length, 0, 'un rato corto en Z3 no avisa');
  ride(125, 5, 2, 2);
  ride(140, 62, 2, 2);
  assert.deepEqual(toasts, ['Llevas 1 min en Z3: baja el ritmo hasta Z2.']);
});

test('aviso para subir en el final progresivo, con margen al empezar el tramo', () => {
  toasts.length = 0;
  clock.t += 120000;
  ride(125, 40, 3, 3, 0, 45);
  assert.equal(toasts.length, 0, 'sin aviso durante el margen');
  ride(125, 70, 3, 3, 40, 45);
  assert.deepEqual(toasts, ['Vas en Z2: sube el ritmo hasta Z3.']);
});

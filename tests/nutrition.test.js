const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/activities.js', 'js/nutrition.js']);
const macros = c.get('macros');
const addActivity = c.get('addActivity');

const NOW = new Date(2026, 8, 28, 18).getTime();
const mk = (over) => ({ profile: sampleProfile({ avail: [0, 2, 4], ...over }), activities: [] });

test('proteína por kg según objetivo', () => {
  assert.equal(macros(mk({ goal: 'fat', weight: 80 }), NOW).protein, 160);
  assert.equal(macros(mk({ goal: 'hyp', weight: 80 }), NOW).protein, 144);
  assert.equal(macros(mk({ goal: 'maint', weight: 80 }), NOW).protein, 128);
});

test('con IMC ≥ 30 se usa el peso de referencia (IMC 25)', () => {
  const m = macros(mk({ goal: 'fat', weight: 120, height: 170 }), NOW);
  assert.ok(Math.abs(m.refWeight - 72.25) < 0.1, String(m.refWeight));
  assert.equal(m.protein, Math.round(2 * m.refWeight));
});

test('las calorías cuadran: 4 kcal/g proteína y carbohidratos, 9 kcal/g grasa', () => {
  const m = macros(mk({ goal: 'maint', weight: 80 }), NOW);
  const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  assert.ok(Math.abs(kcal - m.kcal) <= 12, `${kcal} vs ${m.kcal}`);
  assert.ok(m.fat >= 0.6 * 80 - 1);
});

test('un día con deporte sube los carbohidratos, no la proteína', () => {
  const u = mk({ goal: 'fat', weight: 80 });
  const before = macros(u, NOW);
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 7, date: NOW - 3600e3 });
  const after = macros(u, NOW);
  assert.equal(after.protein, before.protein);
  assert.ok(after.carbs > before.carbs);
  assert.ok(after.kcal > before.kcal);
});

test('sin datos biométricos no hay objetivos', () => {
  assert.equal(macros(mk({ weight: null }), NOW), null);
});

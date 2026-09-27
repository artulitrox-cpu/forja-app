const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile, plain } = require('./helpers');

test('la lógica se carga sin DOM y genera un plan de cuerpo completo para principiante', () => {
  const c = load(LOGIC);
  const plan = c.get('genPlan')(sampleProfile());
  assert.equal(plan.split, 'fb');
  assert.equal(plan.days.length, 3);
  assert.deepEqual(plain(plan.days.map((d) => d.key)), ['fbA', 'fbB', 'fbC']);
});

test('presc acepta la semana del ciclo como parámetro', () => {
  const c = load(LOGIC);
  const ex = c.get('X')('bench_bb');
  const normal = c.get('presc')(ex, sampleProfile(), null);
  const deload = c.get('presc')(ex, sampleProfile(), { deload: true, week: 4, len: 4 });
  assert.ok(deload.sets < normal.sets);
});

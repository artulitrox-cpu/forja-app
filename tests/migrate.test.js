const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, plain } = require('./helpers');

// Estado v1 tal como lo guardaba la versión anterior (datos ficticios).
function v1User() {
  return {
    id: 'u1',
    profile: { name: 'Ana', age: 30, sex: 'f', height: 165, weight: 60, level: 'beg', goal: 'fat', days: 3, equip: 'gym' },
    plan: {
      split: 'fb', weekdays: ['Lun', 'Mié', 'Vie'],
      days: [
        // bench_bb no es la elección automática antigua (bench_bb sí lo era para press de pecho: primero del catálogo)
        { key: 'fbA', name: 'Cuerpo completo A', focus: 'x', items: [{ slot: 'squat', ex: 'goblet' }, { slot: 'chest_press', ex: 'bench_bb' }, { slot: 'horizontal_row', ex: 'row_bb' }, { slot: 'shoulder_press', ex: 'ohp_bb' }, { slot: 'core', ex: 'plank' }] },
        { key: 'fbB', name: 'Cuerpo completo B', focus: 'x', items: [{ slot: 'hinge', ex: 'rdl' }, { slot: 'core', ex: 'plank' }] },
        { key: 'fbC', name: 'Cuerpo completo C', focus: 'x', items: [{ slot: 'squat', ex: 'squat_bb' }, { slot: 'core', ex: 'plank' }] },
      ],
    },
    prog: { goblet: { w: 16, r: 10 } },
    history: [{ date: 1, day: 'Cuerpo completo A', items: [], vol: 100, sets: 3 }],
    next: 1, active: null, created: 1,
    cycle: { start: 1, len: 4, seen: -1, applied: 0, nextBoost: 1 }, checkins: [{ date: 1, weight: 60 }], checkinEvery: 14,
  };
}

test('migra un usuario v1 conservando cargas, historial y cambios del usuario', () => {
  const c = load(LOGIC);
  const u = v1User();
  assert.equal(c.get('migrateUser')(u), true);
  assert.equal(u.v, 2);
  assert.deepEqual(plain(u.profile.avail), [0, 2, 4]);
  assert.equal(u.profile.sessionMin, 60);
  assert.deepEqual(plain(u.prog), { goblet: { w: 16, r: 10 } });
  assert.equal(u.history.length, 1);
  assert.equal(u.next, 1);
  assert.deepEqual(plain(u.weeks), {});
  // goblet en sentadilla no era la elección automática antigua (squat_bb lo era): es un cambio del usuario
  assert.equal(u.swaps['fbA:squat:0'], 'goblet');
  assert.equal(u.plan.days[0].items[0].ex, 'goblet');
  // squat_bb sí era la elección automática: no se congela
  assert.ok(!Object.values(u.swaps).includes('squat_bb'));
  assert.ok(u.notice);
});

test('la migración es idempotente', () => {
  const c = load(LOGIC);
  const u = v1User();
  c.get('migrateUser')(u);
  const snap = JSON.stringify(u);
  assert.equal(c.get('migrateUser')(u), false);
  assert.equal(JSON.stringify(u), snap);
});

test('días "auto" se convierten en la sugerencia', () => {
  const c = load(LOGIC);
  const u = v1User();
  u.profile.days = 'auto';
  c.get('migrateUser')(u);
  assert.equal(u.profile.avail.length, c.get('suggestDays')(u.profile));
});

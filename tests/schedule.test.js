const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile, plain } = require('./helpers');

const c = load(LOGIC);
const strengthDays = c.get('strengthDays');
const weekSchedule = c.get('weekSchedule');
const genPlan = c.get('genPlan');
const weekKey = c.get('weekKey');

const WS = new Date(2026, 8, 28).getTime(); // lunes 28-09-2026
const DAY = 864e5;

function mkUser(over = {}, extra = {}) {
  const profile = sampleProfile({ avail: [0, 2, 4], sessionMin: 60, ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, created: WS - 60 * DAY,
    cycle: { start: WS, len: 4, seen: -1, applied: 0, nextBoost: 1 }, ...extra };
  u.plan = genPlan(profile);
  return u;
}

test('días de fuerza por objetivo', () => {
  const t = (goal, level, n) => strengthDays(sampleProfile({ goal, level }), n);
  assert.equal(t('fat', 'int', 6), 4);
  assert.equal(t('fat', 'int', 3), 3);
  assert.equal(t('hyp', 'int', 6), 5);
  assert.equal(t('maint', 'int', 5), 3);
  assert.equal(t('hyp', 'beg', 5), 3);
  assert.equal(t('fat', 'int', 0), 0);
});

test('perder grasa con 5 días: 4 de fuerza y 1 de cardio', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 1, 2, 3, 4] });
  const s = weekSchedule(u, WS);
  assert.equal(s.filter((e) => e.type === 'strength').length, 4);
  assert.equal(s.filter((e) => e.type === 'cardio').length, 1);
});

test('ganar músculo: como mucho 1 día de cardio; el resto, descanso', () => {
  const u = mkUser({ goal: 'hyp', level: 'beg', avail: [0, 1, 2, 3, 4, 5] });
  const s = weekSchedule(u, WS);
  assert.equal(s.filter((e) => e.type === 'strength').length, 3);
  assert.equal(s.filter((e) => e.type === 'cardio').length, 1);
  assert.equal(s.filter((e) => e.type === 'rest').length, 2);
});

test('7 días marcados → como mucho 6 sesiones (domingo descanso)', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 1, 2, 3, 4, 5, 6] });
  const s = weekSchedule(u, WS);
  assert.ok(s.filter((e) => e.type !== 'rest').length <= 6);
  assert.ok(!s.some((e) => e.wd === 6 && e.type !== 'rest'));
});

test('0 días → semana vacía sin errores', () => {
  const u = mkUser({}, { weeks: { [weekKey(WS)]: [] } });
  assert.deepEqual(plain(weekSchedule(u, WS)), []);
});

test('la semana editada sustituye a la habitual solo esa semana', () => {
  const u = mkUser({ avail: [0, 2, 4] }, { weeks: { [weekKey(WS)]: [1, 3] } });
  assert.deepEqual(plain(weekSchedule(u, WS).map((e) => e.wd)), [1, 3]);
  assert.deepEqual(plain(weekSchedule(u, WS + 7 * DAY).map((e) => e.wd)), [0, 2, 4]);
});

test('la rotación de fuerza continúa desde u.next', () => {
  const u = mkUser({}, { next: 1 });
  const s = weekSchedule(u, WS).filter((e) => e.type === 'strength');
  assert.equal(s[0].tpl.key, 'fbB');
  assert.equal(s[1].tpl.key, 'fbC');
  assert.equal(s[2].tpl.key, 'fbA');
});

test('sesiones hechas esta semana se marcan como hechas', () => {
  const u = mkUser({}, { next: 1, history: [{ date: WS + 3600e3, day: 'Cuerpo completo A', kind: 'strength', items: [] }] });
  const s = weekSchedule(u, WS).filter((e) => e.type === 'strength');
  assert.equal(s[0].done, true);
  assert.equal(s[0].name, 'Cuerpo completo A');
  assert.equal(s[1].done, false);
  assert.equal(s[1].tpl.key, 'fbB');
});

test('Empuje/Tirón/Pierna con menos de 3 días de fuerza esa semana → cuerpo completo', () => {
  const u = mkUser({ level: 'int', goal: 'hyp', avail: [0, 1, 3, 4] }, {});
  assert.equal(u.plan.split, 'ppl');
  u.weeks[weekKey(WS)] = [0, 3];
  const s = weekSchedule(u, WS).filter((e) => e.type === 'strength');
  assert.equal(s.length, 2);
  assert.ok(s.every((e) => e.tpl.key.startsWith('fb')), plain(s.map((e) => e.tpl.key)).join());
});

test('los días de fuerza quedan repartidos, no juntos al principio', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 1, 2, 3] });
  const s = weekSchedule(u, WS);
  assert.deepEqual(plain(s.map((e) => e.type)), ['strength', 'strength', 'strength', 'strength']);
  const u2 = mkUser({ goal: 'maint', level: 'int', avail: [0, 1, 2, 3, 4] });
  const types = plain(weekSchedule(u2, WS).map((e) => e.type));
  assert.equal(types.filter((t) => t === 'strength').length, 3);
  assert.notDeepEqual(types, ['strength', 'strength', 'strength', 'cardio', 'cardio']);
});

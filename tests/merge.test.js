const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, plain } = require('./helpers');

const c = load([...LOGIC, 'js/merge.js']);
const mergeUser = c.get('mergeUser');
const validBackup = c.get('validBackup');

const base = (over = {}) => ({ id: 'u1', v: 2, profile: { name: 'A', goal: 'fat' }, plan: { days: [] }, prog: {}, next: 0,
  history: [], activities: [], injuries: [], checkins: [], tomb: {}, updatedAt: 100, ...over });

test('las sesiones y actividades de ambos dispositivos se conservan', () => {
  const phone = base({ history: [{ date: 10, day: 'A' }], activities: [{ id: 'a1', date: 5 }], updatedAt: 200, next: 1 });
  const laptop = base({ history: [{ date: 20, day: 'B' }], activities: [{ id: 'a2', date: 6 }], updatedAt: 150 });
  const m = mergeUser(phone, laptop);
  assert.deepEqual(plain(m.history.map((h) => h.day)), ['B', 'A']); // más reciente primero
  assert.deepEqual(plain(m.activities.map((a) => a.id)).sort(), ['a1', 'a2']);
  assert.equal(m.next, 1); // escalares del más reciente
  assert.equal(m.updatedAt, 200);
});

test('lo borrado en un dispositivo no reaparece desde el otro', () => {
  const a = base({ activities: [], tomb: { a1: 300 }, updatedAt: 300 });
  const b = base({ activities: [{ id: 'a1', date: 5 }], updatedAt: 100 });
  assert.equal(mergeUser(a, b).activities.length, 0);
  assert.equal(mergeUser(b, a).activities.length, 0);
});

test('una lesión modificada gana por su propia fecha de cambio', () => {
  const a = base({ injuries: [{ id: 'i1', active: false, upd: 500 }], updatedAt: 100 });
  const b = base({ injuries: [{ id: 'i1', active: true, upd: 200 }], updatedAt: 900 });
  assert.equal(mergeUser(a, b).injuries[0].active, false);
});

test('check-ins por fecha y sin duplicados', () => {
  const a = base({ checkins: [{ date: 1, weight: 80 }, { date: 2, weight: 79 }] });
  const b = base({ checkins: [{ date: 2, weight: 79 }, { date: 3, weight: 78 }], updatedAt: 101 });
  assert.deepEqual(plain(mergeUser(a, b).checkins.map((x) => x.date)), [3, 2, 1]);
});

test('combinar es idempotente y simétrico en colecciones', () => {
  const a = base({ history: [{ date: 1 }], activities: [{ id: 'x', date: 1 }], updatedAt: 100 });
  const b = base({ history: [{ date: 2 }], activities: [{ id: 'y', date: 2 }], updatedAt: 200 });
  const ab = mergeUser(a, b), ba = mergeUser(b, a);
  assert.deepEqual(plain(ab.history), plain(ba.history));
  assert.deepEqual(plain(mergeUser(ab, ab)), plain(ab));
});

test('validación de la copia de seguridad', () => {
  assert.equal(validBackup({ app: 'forja', state: { users: { u1: base() } } }), true);
  assert.equal(validBackup({ users: {} }), false);
  assert.equal(validBackup(null), false);
});

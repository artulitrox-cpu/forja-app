const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, plain } = require('./helpers');

const c = load([...LOGIC, 'js/progress.js']);
const e1rm = c.get('e1rm');
const records = c.get('records');
const newRecords = c.get('newRecords');
const weeklySets = c.get('weeklySets');
const e1rmSeries = c.get('e1rmSeries');
const MUSCLE_GROUPS = c.get('MUSCLE_GROUPS');
const EX = c.get('EX');

const S = (w, r, rt = 'ok') => ({ w, r, rt });
const H = (date, items) => ({ date, day: 'X', kind: 'strength', items });

test('1RM estimado (Epley) y casos límite', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.equal(Math.round(e1rm(100, 10) * 10) / 10, 133.3);
  assert.equal(e1rm(0, 10), 0);
  assert.equal(e1rm(100, 0), 0);
  assert.equal(Math.round(e1rm(100, 20)), Math.round(e1rm(100, 12))); // más de 12 reps no infla la estimación
});

test('récords por ejercicio a partir del historial', () => {
  const hist = [H(3, [{ ex: 'bench_bb', sets: [S(80, 8)] }]), H(1, [{ ex: 'bench_bb', sets: [S(70, 10), S(75, 6)] }]), H(2, [{ ex: 'pushup', sets: [S(null, 25)] }])];
  const r = records(hist);
  assert.equal(Math.round(r.bench_bb.e1rm * 10) / 10, 101.3);
  assert.equal(r.bench_bb.w, 80);
  assert.equal(r.bench_bb.date, 3);
  assert.equal(r.pushup.reps, 25);
  assert.equal(r.pushup.e1rm, 0);
});

test('récords nuevos de una sesión frente al historial anterior', () => {
  const prev = [H(1, [{ ex: 'bench_bb', sets: [S(80, 8)] }, { ex: 'pushup', sets: [S(null, 20)] }])];
  const h = H(2, [{ ex: 'bench_bb', sets: [S(80, 10)] }, { ex: 'pushup', sets: [S(null, 18)] }, { ex: 'squat_bb', sets: [S(100, 5)] }]);
  const n = plain(newRecords(prev, h));
  assert.deepEqual(n.map((x) => x.ex), ['bench_bb']); // squat_bb es la primera vez: no cuenta como récord
  assert.equal(n[0].kind, 'e1rm');
});

test('series por grupo muscular: 1 principal, 0,5 secundario, solo series hechas de esa semana', () => {
  const ws = 1000;
  const hist = [H(ws + 10, [{ ex: 'bench_bb', sets: [S(80, 8), S(80, 8), S(80, 8, null)] }]), H(ws - 10, [{ ex: 'bench_bb', sets: [S(80, 8)] }])];
  const w = weeklySets(hist, ws);
  assert.equal(w.chest, 2);
  assert.equal(w.triceps, 1);
  assert.equal(w.shoulders, 1);
});

test('todo músculo del catálogo pertenece a un grupo', () => {
  const all = new Set(EX.flatMap((e) => [...e.m, ...e.s]));
  const grouped = new Set(Object.values(MUSCLE_GROUPS).flatMap((g) => g.mus));
  for (const m of all) assert.ok(grouped.has(m) || m === 'Core', m);
});

test('serie de evolución del 1RM por sesión', () => {
  const hist = [H(3, [{ ex: 'bench_bb', sets: [S(80, 8)] }]), H(1, [{ ex: 'bench_bb', sets: [S(70, 10)] }])];
  const s = plain(e1rmSeries(hist, 'bench_bb'));
  assert.deepEqual(s.map((p) => p.t), [1, 3]);
  assert.ok(s[1].v > s[0].v);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/activities.js']);
const activityCalc = c.get('activityCalc');
const addActivity = c.get('addActivity');
const legFatigue = c.get('legFatigue');
const legAdjust = c.get('legAdjust');
const dayKcal = c.get('dayKcal');
const kcalTarget = c.get('kcalTarget');
const buildSession = c.get('buildSession');
const weekSchedule = c.get('weekSchedule');
const genPlan = c.get('genPlan');
const dayKey = c.get('dayKey');
const SPORTS = c.get('SPORTS');

const H = 3600e3, DAY = 864e5;
const NOW = new Date(2026, 8, 28, 18, 0).getTime();
const WS = new Date(2026, 8, 28).getTime();

function mkUser(over = {}) {
  const profile = sampleProfile({ level: 'int', goal: 'fat', avail: [0, 2, 4, 5], sessionMin: 90, weight: 80, ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], activities: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 } };
  u.plan = genPlan(profile);
  return u;
}

test('cada deporte tiene tipos con MET y carga de piernas', () => {
  for (const s of Object.values(SPORTS)) {
    assert.ok(s.types.length > 0, s.n);
    for (const t of s.types) assert.ok(t.met > 0 && t.legs >= 0 && t.legs <= 1.2, `${s.n}/${t.n}`);
  }
});

test('kcal = MET × factor RPE × peso × horas', () => {
  // Futsal jugador de campo: MET 10, RPE 5 (factor 1), 80 kg, 1 h → 800 kcal
  const r = activityCalc({ sport: 'futsal', type: 'field', min: 60, rpe: 5 }, sampleProfile({ weight: 80 }));
  assert.equal(r.kcal, 800);
  // sin peso → 70 kg
  const r2 = activityCalc({ sport: 'futsal', type: 'field', min: 60, rpe: 5 }, sampleProfile({ weight: null }));
  assert.equal(r2.kcal, 700);
  assert.equal(r2.assumedWeight, true);
});

test('fatiga de piernas y niveles', () => {
  const hi = activityCalc({ sport: 'futsal', type: 'field', min: 60, rpe: 8 }, sampleProfile());
  assert.equal(hi.fatigue, 88);
  assert.equal(hi.level, 'high');
  const lo = activityCalc({ sport: 'running', type: 'easy', min: 40, rpe: 5 }, sampleProfile());
  assert.equal(lo.fatigue, 23);
  assert.equal(lo.level, 'low');
  const mid = activityCalc({ sport: 'padel', type: 'comp', min: 60, rpe: 6 }, sampleProfile());
  assert.equal(mid.level, 'moderate');
  assert.equal(activityCalc({ sport: 'football', type: 'mid', min: 120, rpe: 10 }, sampleProfile()).fatigue, 100);
});

test('decaimiento: 100 % en 24 h, 60 % hasta 48 h, nada después', () => {
  const u = mkUser();
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 8, date: NOW - 12 * H });
  assert.equal(legFatigue(u, NOW).value, 88);
  assert.equal(legFatigue(u, NOW + 18 * H).value, Math.round(88 * 0.6));
  assert.equal(legFatigue(u, NOW + 40 * H).value, 0);
});

test('recomendación: 15 % con fatiga alta, 10 % moderada, nada baja', () => {
  const u = mkUser();
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 8, date: NOW - 2 * H });
  const a = legAdjust(u, NOW);
  assert.equal(a.pct, 15);
  assert.equal(a.sport, 'Futsal');
  assert.match(a.text, /Reduce la carga de piernas un 15 % hoy por fatiga acumulada de Futsal/);
  assert.equal(legAdjust(u, NOW + 30 * H).pct, 10); // 88 × 0,6 = 53
  assert.equal(legAdjust(u, NOW + 60 * H).pct, 0);
});

test('"No aplicar hoy" desactiva el ajuste solo ese día', () => {
  const u = mkUser();
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 8, date: NOW - 2 * H });
  u.fatigueSkip = dayKey(NOW);
  assert.equal(legAdjust(u, NOW).pct, 0);
  assert.equal(legAdjust(u, NOW).skipped, true);
});

test('con fatiga alta, el HIIT del día pasa a cardio suave', () => {
  const u = mkUser({ goal: 'fat' });
  const e = weekSchedule(u, WS).find((x) => x.cond && x.cond.kind === 'hiit');
  assert.ok(e, 'la semana de prueba debe tener HIIT');
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 8, date: NOW - 2 * H });
  const s = buildSession(u, e, { ws: WS, now: NOW });
  assert.equal(s.cond.kind, 'liss');
  assert.ok(s.notes.some((n) => /fatiga/i.test(n)));
  assert.equal(s.legAdj.pct, 15);
});

test('balance calórico: el deporte de hoy se suma al gasto antes del factor del objetivo', () => {
  const u = mkUser({ goal: 'maint' });
  const base = kcalTarget(u.profile);
  assert.equal(dayKcal(u, NOW).total, base);
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 5, date: NOW - 2 * H }); // 800 kcal
  const d = dayKcal(u, NOW);
  assert.equal(d.sport, 800);
  assert.equal(d.total, base + 800);
  // la actividad de ayer no cuenta hoy
  assert.equal(dayKcal(u, NOW + DAY).sport, 0);
});

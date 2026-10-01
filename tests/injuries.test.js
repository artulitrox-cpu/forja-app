const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile, plain } = require('./helpers');

const FILES = [...LOGIC, 'js/injuries.js'];
const c = load(FILES);
const triage = c.get('triage');
const exBlocked = c.get('exBlocked');
const injuryMap = c.get('injuryMap');
const addInjury = c.get('addInjury');
const resolveInjury = c.get('resolveInjury');
const deleteInjury = c.get('deleteInjury');
const buildSession = c.get('buildSession');
const weekSchedule = c.get('weekSchedule');
const genPlan = c.get('genPlan');
const X = c.get('X');
const EX = c.get('EX');
const CARDIO_M = c.get('CARDIO_M');
const MUSCLES = c.get('MUSCLES');
const regionOf = c.get('regionOf');

const DAY = 864e5;
const WS = new Date(2026, 8, 28).getTime();

function mkUser(over = {}) {
  const profile = sampleProfile({ level: 'int', goal: 'fat', avail: [0, 2, 4], sessionMin: 90, ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 } };
  u.plan = genPlan(profile);
  return u;
}

test('triaje: señales de alarma o dolor ≥ 8 → derivar a un profesional', () => {
  assert.equal(triage({ pain: 3, mob: 0, infl: 0, rest: 0, flags: ['numb'] }).level, 'refer');
  assert.equal(triage({ pain: 8, mob: 0, infl: 0, rest: 0, flags: [] }).level, 'refer');
});

test('triaje: umbrales de la puntuación 5/6 y 10/11', () => {
  assert.equal(triage({ pain: 5, mob: 0, infl: 0, rest: 0, flags: [] }).level, 'mild');
  assert.equal(triage({ pain: 4, mob: 1, infl: 0, rest: 0, flags: [] }).level, 'moderate'); // 6
  assert.equal(triage({ pain: 6, mob: 1, infl: 1, rest: 0, flags: [] }).level, 'moderate'); // 10
  assert.equal(triage({ pain: 7, mob: 1, infl: 1, rest: 0, flags: [] }).level, 'severe'); // 11
  const t = triage({ pain: 2, mob: 0, infl: 0, rest: 0, flags: [] });
  assert.equal(t.label, 'Sobrecarga leve');
  assert.match(t.range, /3 a 7 días/);
});

test('exBlocked: principal siempre; secundario solo si no es leve; Core como alias', () => {
  const bench = X('bench_bb'); // m: Pectoral; s: Tríceps, Deltoide anterior
  assert.equal(exBlocked(bench, { Pectoral: 'mild' }), 'Pectoral');
  assert.equal(exBlocked(bench, { 'Tríceps': 'mild' }), null);
  assert.equal(exBlocked(bench, { 'Tríceps': 'moderate' }), 'Tríceps');
  const pushup = X('pushup'); // s incluye Core
  assert.equal(exBlocked(pushup, { Abdomen: 'moderate' }), 'Abdomen');
});

test('la sesión sustituye o omite los ejercicios afectados y no toca u.plan', () => {
  const u = mkUser();
  const before = JSON.stringify(u.plan);
  addInjury(u, { muscle: 'Pectoral', pain: 6, mob: 1, infl: 0, rest: 0, flags: [] });
  const map = plain(injuryMap(u));
  for (const e of weekSchedule(u, WS).filter((x) => x.type === 'strength')) {
    const s = buildSession(u, e, { ws: WS });
    for (const it of s.items) assert.equal(exBlocked(X(it.ex), map), null, `${it.ex} sigue bloqueado`);
    for (const it of s.items.filter((x) => x.sub)) {
      assert.equal(X(it.ex).slot, X(it.sub.from).slot);
      assert.equal(it.sub.mus, 'Pectoral');
    }
    for (const o of s.omitted) assert.ok(o.mus);
  }
  assert.equal(JSON.stringify(u.plan), before);
});

test('un hueco sin alternativas seguras se omite con aviso', () => {
  const u = mkUser({ equip: 'body' });
  addInjury(u, { muscle: 'Glúteos', pain: 6, mob: 1, infl: 1, rest: 0, flags: [] });
  let omitted = 0;
  for (const e of weekSchedule(u, WS).filter((x) => x.type === 'strength')) {
    const s = buildSession(u, e, { ws: WS });
    omitted += s.omitted.length;
    for (const o of s.omitted) assert.ok(s.notes.some((n) => n.includes(`molestia muscular en ${o.mus}`)));
  }
  assert.ok(omitted > 0);
});

test('el cardio cambia de máquina y, sin opciones, se omite', () => {
  const u = mkUser({ goal: 'fat', avail: [0, 1, 2, 3, 4, 5] });
  addInjury(u, { muscle: 'Cuádriceps', pain: 3, mob: 0, infl: 0, rest: 0, flags: [] });
  for (const e of weekSchedule(u, WS).filter((x) => x.cond)) {
    const s = buildSession(u, e, { ws: WS });
    if (s.cond) assert.ok(!CARDIO_M[s.cond.machine].mus.includes('Cuádriceps'), s.cond.machine);
  }
  const u2 = mkUser({ goal: 'fat', equip: 'body', avail: [0, 1, 2, 3, 4, 5] });
  for (const m of ['Cuádriceps', 'Gemelos', 'Glúteos']) addInjury(u2, { muscle: m, pain: 3, mob: 0, infl: 0, rest: 0, flags: [] });
  const e = weekSchedule(u2, WS).find((x) => x.cond);
  const s = buildSession(u2, e, { ws: WS });
  assert.equal(s.cond, null);
  assert.ok(s.notes.some((n) => /cardio/i.test(n)));
});

test('movilidad y estiramientos de la zona lesionada se omiten', () => {
  const u = mkUser();
  addInjury(u, { muscle: 'Isquiotibiales', pain: 4, mob: 1, infl: 0, rest: 0, flags: [] });
  for (const e of weekSchedule(u, WS).filter((x) => x.type !== 'rest')) {
    const s = buildSession(u, e, { ws: WS });
    assert.ok(!s.stretch.some((x) => x.mus.includes('Isquiotibiales')));
  }
});

test('dar de alta la lesión restaura los ejercicios originales', () => {
  const u = mkUser();
  const e0 = weekSchedule(u, WS).find((x) => x.type === 'strength');
  const orig = plain(buildSession(u, e0, { ws: WS }).items.map((it) => it.ex));
  const inj = addInjury(u, { muscle: 'Pectoral', pain: 6, mob: 1, infl: 0, rest: 0, flags: [] });
  const during = plain(buildSession(u, e0, { ws: WS }).items.map((it) => it.ex));
  assert.notDeepEqual(during, orig);
  resolveInjury(u, inj.id);
  assert.deepEqual(plain(buildSession(u, e0, { ws: WS }).items.map((it) => it.ex)), orig);
  assert.equal(u.injuries[0].active, false);
  deleteInjury(u, inj.id);
  assert.equal(u.injuries.length, 0);
});

test('una lesión nueva del mismo músculo sustituye a la activa; máximo 30 guardadas', () => {
  const u = mkUser();
  addInjury(u, { muscle: 'Bíceps', pain: 2, mob: 0, infl: 0, rest: 0, flags: [] });
  addInjury(u, { muscle: 'Bíceps', pain: 6, mob: 1, infl: 0, rest: 0, flags: [] });
  assert.equal(u.injuries.filter((i) => i.active && i.muscle === 'Bíceps').length, 1);
  assert.equal(u.injuries.find((i) => i.active).level, 'moderate');
  for (let i = 0; i < 40; i++) addInjury(u, { muscle: MUSCLES[i % MUSCLES.length], pain: 2, mob: 0, infl: 0, rest: 0, flags: [] });
  assert.ok(u.injuries.length <= 30);
});

test('todo músculo del catálogo pertenece a una región', () => {
  const names = new Set(EX.flatMap((e) => [...e.m, ...e.s]).filter((m) => m !== 'Core'));
  for (const m of names) assert.ok(regionOf(m), m);
});

test('articulaciones: cada una está en una región y tiene sus propios niveles', () => {
  const JOINTS = c.get('JOINTS');
  for (const j of Object.keys(JOINTS)) {
    assert.ok(MUSCLES.includes(j), j);
    assert.ok(regionOf(j), j);
  }
  assert.equal(triage({ muscle: 'Tobillo', pain: 6, mob: 1, infl: 1, rest: 0, flags: [] }).label, 'Esguince o tendinitis moderada');
  assert.equal(triage({ muscle: 'Rodilla', pain: 2, mob: 0, infl: 0, rest: 0, flags: ['unstable'] }).level, 'refer');
  assert.equal(triage({ muscle: 'Cuádriceps', pain: 6, mob: 1, infl: 1, rest: 0, flags: [] }).label, 'Distensión moderada');
});

test('esguince de tobillo: fuera impacto y gemelos de pie; grave, también zancadas', () => {
  assert.equal(exBlocked(X('calf_stand'), { Tobillo: 'mild' }), 'Tobillo');
  assert.equal(exBlocked(X('calf_seated'), { Tobillo: 'mild' }), null);
  assert.equal(exBlocked(X('lunge_db'), { Tobillo: 'mild' }), null);
  assert.equal(exBlocked(X('lunge_db'), { Tobillo: 'severe' }), 'Tobillo');
  assert.equal(exBlocked(X('legpress'), { Tobillo: 'severe' }), null);
  assert.equal(exBlocked(X('bench_bb'), { Tobillo: 'severe' }), null);
});

test('rodilla, muñeca, codo y cuello bloquean lo que cargan y dejan alternativas', () => {
  assert.equal(exBlocked(X('leg_ext'), { Rodilla: 'mild' }), 'Rodilla');
  assert.equal(exBlocked(X('squat_bb'), { Rodilla: 'moderate' }), 'Rodilla');
  assert.equal(exBlocked(X('hip_thrust_machine'), { Rodilla: 'moderate' }), null);
  assert.equal(exBlocked(X('pushup'), { Muñeca: 'mild' }), 'Muñeca');
  assert.equal(exBlocked(X('bench_db'), { Muñeca: 'moderate' }), 'Muñeca');
  assert.equal(exBlocked(X('chest_machine'), { Muñeca: 'moderate' }), null);
  assert.equal(exBlocked(X('curl_db'), { Codo: 'mild' }), 'Codo');
  assert.equal(exBlocked(X('ohp_bb'), { Cuello: 'mild' }), 'Cuello');
});

test('con una lesión de rodilla la semana entera queda sin ejercicios ni cardio que la carguen', () => {
  const u = mkUser({ goal: 'fat', avail: [0, 1, 2, 3, 4, 5] });
  addInjury(u, { muscle: 'Rodilla', pain: 5, mob: 1, infl: 1, rest: 0, flags: [] });
  const map = injuryMap(u), JOINTS = c.get('JOINTS');
  for (const e of weekSchedule(u, WS).filter((x) => x.type !== 'rest')) {
    const s = buildSession(u, e, { ws: WS });
    for (const it of s.items) assert.equal(exBlocked(X(it.ex), map), null, it.ex);
    if (s.cond) assert.ok(!JOINTS.Rodilla.cardio(CARDIO_M[s.cond.machine], true), s.cond.machine);
    for (const o of s.omitted) assert.ok(s.notes.some((n) => n.includes(`lesión en ${o.mus}`)));
  }
});

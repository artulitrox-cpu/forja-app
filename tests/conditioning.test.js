const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load(LOGIC);
const weekSchedule = c.get('weekSchedule');
const genPlan = c.get('genPlan');
const CARDIO_M = c.get('CARDIO_M');
const hrZone = c.get('hrZone');

const DAY = 864e5;
const WS = new Date(2026, 8, 28).getTime(); // lunes

function mkUser(over = {}, extra = {}) {
  const profile = sampleProfile({ level: 'int', avail: [0, 1, 2, 3, 4, 5], sessionMin: 60, ...over });
  // cycle.start 1 semana antes: semana 2 de 4 (no descarga). created hace meses.
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 }, ...extra };
  u.plan = genPlan(profile);
  return u;
}
const conds = (s) => s.filter((e) => e.cond).map((e) => e.cond);
const isLeg = (e) => e && e.type === 'strength' && e.tpl && e.tpl.items.some((it) => it.slot === 'squat' || it.slot === 'hinge');

const PROFILES = [];
for (const goal of ['fat', 'hyp', 'maint']) for (const level of ['beg', 'int', 'adv'])
  for (const avail of [[0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5]]) PROFILES.push({ goal, level, avail });

test('nunca hay HIIT el día anterior a una sesión de fuerza con sentadilla o bisagra', () => {
  for (const p of PROFILES) {
    const s = weekSchedule(mkUser(p), WS);
    s.forEach((e) => {
      if (!e.cond || e.cond.kind !== 'hiit') return;
      const next = s.find((x) => x.wd === e.wd + 1);
      assert.ok(!isLeg(next), `${JSON.stringify(p)} HIIT el ${e.wd} antes de pierna`);
    });
  }
});

test('tope semanal de HIIT por objetivo', () => {
  const cap = { fat: 2, maint: 1, hyp: 0 };
  for (const p of PROFILES) {
    const n = conds(weekSchedule(mkUser(p), WS)).filter((x) => x.kind === 'hiit' || x.kind === 'mod').length;
    assert.ok(n <= cap[p.goal], `${JSON.stringify(p)}: ${n} HIIT`);
  }
});

test('perder grasa: acondicionamiento en todas las sesiones de fuerza y algún HIIT', () => {
  const s = weekSchedule(mkUser({ goal: 'fat', avail: [0, 2, 4, 5] }), WS);
  assert.ok(s.filter((e) => e.type === 'strength').every((e) => e.cond));
  assert.ok(conds(s).some((x) => x.kind === 'hiit'));
});

test('ganar músculo: solo LISS y como mucho 2 bloques tras la fuerza', () => {
  for (const level of ['beg', 'int', 'adv']) {
    const s = weekSchedule(mkUser({ goal: 'hyp', level, avail: [0, 1, 2, 3, 4, 5] }), WS);
    assert.ok(conds(s).every((x) => x.kind === 'liss'));
    assert.ok(s.filter((e) => e.type === 'strength' && e.cond).length <= 2);
  }
});

test('principiante: sin HIIT en sus 2 primeras semanas', () => {
  const u = mkUser({ goal: 'fat', level: 'beg', avail: [0, 2, 4, 5] }, { created: WS + 1 * DAY, cycle: { start: WS, len: 4, seen: -1, applied: 0, nextBoost: 1 } });
  assert.ok(conds(weekSchedule(u, WS)).every((x) => x.kind === 'liss'));
  assert.ok(conds(weekSchedule(u, WS + 7 * DAY)).every((x) => x.kind === 'liss'));
  assert.ok(conds(weekSchedule(u, WS + 14 * DAY)).some((x) => x.kind !== 'liss'));
});

test('bajo impacto: intervalos moderados y solo máquinas de bajo impacto', () => {
  for (const over of [{ age: 65 }, { weight: 125, height: 170 }]) {
    const s = weekSchedule(mkUser({ goal: 'fat', avail: [0, 2, 4, 5], ...over }), WS);
    for (const x of conds(s)) {
      assert.notEqual(x.kind, 'hiit');
      assert.equal(CARDIO_M[x.machine].impact, 'low', x.machine);
    }
    assert.ok(conds(s).some((x) => x.kind === 'mod'));
  }
});

test('semana de descarga: sin HIIT y bloques más cortos', () => {
  const normal = mkUser({ goal: 'fat', avail: [0, 2, 4, 5] });
  const deload = mkUser({ goal: 'fat', avail: [0, 2, 4, 5] }, { cycle: { start: WS - 21 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 } });
  const a = conds(weekSchedule(normal, WS)), b = conds(weekSchedule(deload, WS));
  assert.ok(b.every((x) => x.kind === 'liss'));
  const sum = (l) => l.reduce((t, x) => t + x.min, 0);
  assert.ok(sum(b) < sum(a));
});

test('en casa sin máquinas solo se usa cardio sin material', () => {
  const s = weekSchedule(mkUser({ goal: 'fat', equip: 'db', avail: [0, 2, 4, 5] }), WS);
  for (const x of conds(s)) assert.equal(CARDIO_M[x.machine].eq, 'body');
});

test('pulso orientativo: 60–70 % de la FC máxima de Tanaka', () => {
  assert.deepEqual({ ...hrZone(sampleProfile({ age: 40 })) }, { lo: 108, hi: 126, max: 180 });
  assert.equal(hrZone(sampleProfile({ age: '' })), null);
});

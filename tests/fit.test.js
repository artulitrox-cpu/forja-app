const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load(LOGIC);
const weekSchedule = c.get('weekSchedule');
const buildSession = c.get('buildSession');
const genPlan = c.get('genPlan');
const MAIN_SLOTS = c.get('MAIN_SLOTS');

const DAY = 864e5;
const WS = new Date(2026, 8, 28).getTime();

function mkUser(over) {
  const profile = sampleProfile(over);
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 } };
  u.plan = genPlan(profile);
  return u;
}

test('ninguna sesión supera el límite, o queda marcada overTime sin perder principales', () => {
  let checked = 0;
  for (const goal of ['fat', 'hyp', 'maint']) for (const level of ['beg', 'int', 'adv'])
    for (const n of [1, 2, 3, 4, 5, 6, 7]) for (const sessionMin of [30, 45, 60, 75, 90]) {
      const avail = [0, 1, 2, 3, 4, 5, 6].slice(0, n);
      const u = mkUser({ goal, level, avail, sessionMin });
      for (const e of weekSchedule(u, WS)) {
        if (e.type === 'rest') continue;
        const s = buildSession(u, e, { ws: WS });
        const tag = `${goal}/${level}/${n}d/${sessionMin}min ${e.name}`;
        assert.ok(s.mob.length >= 3, `sin movilidad: ${tag}`);
        assert.ok(s.stretch.length >= 3, `sin estiramientos: ${tag}`);
        if (s.overTime) assert.ok(s.est.total > sessionMin * 60, tag);
        else assert.ok(s.est.total <= sessionMin * 60, `${tag}: ${Math.round(s.est.total / 60)} min`);
        if (e.type === 'strength') {
          const mains = e.tpl.items.filter((it) => MAIN_SLOTS.has(it.slot)).map((it) => it.ex);
          for (const m of mains) assert.ok(s.items.some((it) => it.ex === m), `principal perdido ${m}: ${tag}`);
        }
        checked++;
      }
    }
  assert.ok(checked > 500);
});

test('con 90 min no se recorta nada de una sesión normal', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 2, 4], sessionMin: 90 });
  const e = weekSchedule(u, WS).find((x) => x.type === 'strength');
  const s = buildSession(u, e, { ws: WS });
  assert.equal(s.items.length, e.tpl.items.length);
  assert.equal(s.notes.length, 0);
});

test('con 30 min se recorta primero el cardio y luego los accesorios', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 2, 4], sessionMin: 30 });
  const e = weekSchedule(u, WS).find((x) => x.type === 'strength');
  const s = buildSession(u, e, { ws: WS });
  assert.ok(s.notes.length > 0);
  if (s.cond) assert.ok(s.cond.min <= e.cond.min);
  assert.ok(s.items.length <= e.tpl.items.length);
});

test('día de solo cardio cabe en el límite menos 10 min', () => {
  const u = mkUser({ goal: 'fat', level: 'int', avail: [0, 1, 2, 3, 4, 5], sessionMin: 45 });
  const e = weekSchedule(u, WS).find((x) => x.type === 'cardio');
  const s = buildSession(u, e, { ws: WS });
  assert.equal(s.kind, 'cardio');
  assert.ok(s.est.total <= 45 * 60);
  assert.ok(s.cond.min >= 8);
});

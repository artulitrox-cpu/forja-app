const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile, plain } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/progress.js', 'js/activities.js']);
const g = (n) => c.get(n);
const genPlan = g('genPlan'), weekSchedule = g('weekSchedule'), buildSession = g('buildSession'), X = g('X'), groupOf = g('groupOf');
const presc = g('presc'), cycleLen = g('cycleLen'), upgradePlan = g('upgradePlan'), AV = g('AVAIL_DEFAULT');
const WS = new Date(2026, 10, 2).getTime(), DAY = 864e5;

function mkUser(over = {}, extra = {}) {
  const profile = sampleProfile({ level: 'int', goal: 'hyp', sessionMin: 60, ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], activities: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 6, seen: -1, applied: 0, nextBoost: 1 }, ...extra };
  u.plan = genPlan(profile);
  return u;
}
// Veces por semana que cada grupo es músculo principal en alguna sesión de fuerza.
function freq(u) {
  const f = {};
  weekSchedule(u, WS).filter((e) => e.type === 'strength').forEach((e) => {
    const s = buildSession(u, e, { ws: WS, now: WS + e.wd * DAY });
    new Set(s.items.flatMap((it) => X(it.ex).m.map(groupOf)).filter(Boolean)).forEach((k) => { f[k] = (f[k] || 0) + 1; });
  });
  return f;
}

test('reparto según días: cuerpo completo, torso/pierna y torso/pierna + empuje/tirón/pierna', () => {
  assert.equal(genPlan(sampleProfile({ level: 'beg', avail: AV[5] })).split, 'fb');
  assert.equal(genPlan(sampleProfile({ level: 'int', goal: 'hyp', avail: AV[3] })).split, 'fb');
  assert.deepEqual(plain(genPlan(sampleProfile({ level: 'int', goal: 'hyp', avail: AV[4] })).days.map((d) => d.key)), ['upA', 'loA', 'upB', 'loB']);
  assert.deepEqual(plain(genPlan(sampleProfile({ level: 'int', goal: 'hyp', avail: AV[5] })).days.map((d) => d.key)), ['upA', 'loA', 'push', 'pull', 'legs']);
});

test('con 4 y 5 días, cuádriceps, isquios y pecho se entrenan al menos 2 veces por semana', () => {
  for (const days of [4, 5]) for (const goal of ['hyp', 'fat']) {
    const f = freq(mkUser({ goal, avail: AV[days] }));
    for (const k of ['quads', 'hams', 'chest', 'back']) assert.ok((f[k] || 0) >= 2, `${goal}/${days}d ${k}: ${f[k] || 0}`);
  }
});

test('el día de empuje ya no repite tres presses', () => {
  const push = genPlan(sampleProfile({ level: 'int', goal: 'hyp', avail: AV[5] })).days.find((d) => d.key === 'push');
  const presses = push.items.filter((it) => ['chest_press', 'incline_press', 'shoulder_press'].includes(it.slot)).length;
  assert.ok(presses <= 2, `presses: ${presses}`);
});

test('perder grasa usa rangos de masa muscular (8–12 en básicos) y más descanso', () => {
  const p = presc(X('bench_bb'), sampleProfile({ goal: 'fat', level: 'int' }), null);
  assert.equal(p.min, 8);
  assert.ok(p.rest >= 90);
  const hyp = presc(X('bench_bb'), sampleProfile({ goal: 'hyp', level: 'int', sessionMin: 60 }), null);
  assert.equal(hyp.rest, 120);
  assert.equal(presc(X('bench_bb'), sampleProfile({ goal: 'hyp', level: 'int', sessionMin: 45 }), null).rest, 90);
});

test('bloques de 6 semanas (5 para avanzados)', () => {
  assert.equal(cycleLen(sampleProfile({ level: 'beg' })), 6);
  assert.equal(cycleLen(sampleProfile({ level: 'int' })), 6);
  assert.equal(cycleLen(sampleProfile({ level: 'adv' })), 5);
});

test('prevención para futsal: 2 sesiones separadas con nórdico, Copenhague y gemelo, nunca la víspera del partido', () => {
  const u = mkUser({ goal: 'hyp', avail: AV[5], sports: [{ sport: 'futsal', wd: 3 }] });
  const s = weekSchedule(u, WS);
  const pre = s.filter((e) => e.prehab);
  assert.equal(pre.length, 2);
  assert.ok(Math.abs(pre[0].wd - pre[1].wd) >= 2);
  assert.ok(pre.every((e) => e.wd !== 2), 'no la víspera (miércoles)');
  const ses = buildSession(u, pre[0], { ws: WS, now: WS + pre[0].wd * DAY });
  const ids = ses.items.filter((it) => it.pre).map((it) => it.ex);
  assert.ok(ids.includes('copenhagen') && ids.includes('nordic'), ids.join());
  assert.ok(ses.est.total <= 60 * 60, 'cabe en 60 min');
  // Sin deporte, no hay bloque de prevención.
  assert.ok(!weekSchedule(mkUser({ goal: 'hyp', avail: AV[5] }), WS).some((e) => e.prehab));
});

test('actualizar el plan: torso/pierna, bloque de 6 semanas y conserva los cambios de ejercicio por hueco', () => {
  const u = mkUser({ goal: 'hyp', avail: AV[4] });
  u.plan = genPlan(u.profile, { split: 'ppl' });
  u.swaps = { 'push:chest_press:0': 'chest_machine' };
  u.cycle.len = 4;
  assert.ok(upgradePlan(u));
  assert.equal(u.plan.split, 'ul');
  assert.equal(u.cycle.len, 6);
  assert.ok(u.plan.days.some((d) => d.items.some((it) => it.slot === 'chest_press' && it.ex === 'chest_machine')));
  assert.ok(!upgradePlan(u), 'idempotente');
});

test('torso/pierna: el día B usa otra variante de remo, jalón, sentadilla, curl femoral y gemelos', () => {
  const days = genPlan(sampleProfile({ level: 'int', goal: 'hyp', avail: AV[4] })).days;
  const ex = (name, slot) => days.find((d) => d.name === name).items.find((it) => it.slot === slot).ex;
  for (const slot of ['horizontal_row', 'vertical_pull', 'biceps', 'triceps']) assert.notEqual(ex('Torso A', slot), ex('Torso B', slot), slot);
  for (const slot of ['squat', 'hamstring_curl', 'calves']) assert.notEqual(ex('Pierna A', slot), ex('Pierna B', slot), slot);
  // Los principiantes repiten los básicos para aprender la técnica.
  const fb = genPlan(sampleProfile({ level: 'beg', avail: AV[3] })).days;
  assert.equal(fb[0].items.find((it) => it.slot === 'squat').ex, fb[2].items.find((it) => it.slot === 'squat').ex);
});

test('gimnasio: accesorios de pierna en máquina, sin isométricos ni sentadilla goblet en intermedios y avanzados', () => {
  for (const level of ['int', 'adv']) for (const goal of ['fat', 'hyp']) for (let cyc = 0; cyc < 6; cyc++) {
    for (const d of genPlan(sampleProfile({ level, goal, avail: AV[4] }), { cyc }).days) for (const it of d.items) {
      const e = X(it.ex), where = `${level}/${goal} bloque ${cyc + 1} ${d.name}: ${e.n}`;
      if (['hamstring_curl', 'quad_iso', 'calves'].includes(it.slot)) assert.equal(e.eq, 'machine', where);
      if (it.slot !== 'core') assert.ok(!e.time, where);
      assert.notEqual(e.id, 'goblet', where);
    }
  }
  // Con mancuernas en casa la goblet sigue siendo la sentadilla.
  assert.equal(genPlan(sampleProfile({ level: 'int', equip: 'db', avail: AV[4] })).days[1].items[0].ex, 'goblet');
});

test('plan v3 → v4: nuevas variantes sin reiniciar el bloque ni la rotación', () => {
  const u = mkUser({ avail: AV[4] }, { planV: 3, next: 2, swaps: { 'upB:horizontal_row:2': 'row_cable' } });
  const cycle = plain(u.cycle);
  assert.ok(upgradePlan(u));
  assert.equal(u.next, 2);
  assert.deepEqual(plain(u.cycle), cycle);
  const upB = u.plan.days.find((d) => d.key === 'upB');
  assert.equal(upB.items.find((it) => it.slot === 'horizontal_row').ex, 'row_cable', 'conserva el cambio del usuario');
  assert.equal(upB.items.find((it) => it.slot === 'vertical_pull').ex, 'latpull_n');
  assert.ok(u.notice);
  assert.ok(!upgradePlan(u), 'idempotente');
});

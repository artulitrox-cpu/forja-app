const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile, plain } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/activities.js']);
const weekSchedule = c.get('weekSchedule');
const genPlan = c.get('genPlan');
const weekKey = c.get('weekKey');
const skipDay = c.get('skipDay');
const addExtra = c.get('addExtra');
const setMatch = c.get('setMatch');
const removeMatch = c.get('removeMatch');
const undoChange = c.get('undoChange');
const freeDays = c.get('freeDays');
const weekEdit = c.get('weekEdit');
const addActivity = c.get('addActivity');
const isLegTpl = c.get('isLegTpl');
const lostSessions = c.get('lostSessions');

const DAY = 864e5;
const WS = new Date(2026, 8, 28).getTime(); // lunes

function mkUser(over = {}, extra = {}) {
  const profile = sampleProfile({ level: 'int', goal: 'fat', avail: [0, 2, 4], sessionMin: 60, sports: [], ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], activities: [], created: WS - 120 * DAY,
    cycle: { start: WS - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 }, ...extra };
  u.plan = genPlan(profile);
  return u;
}
const types = (s) => plain(s.map((e) => `${e.wd}:${e.type}`));
const at = (s, wd) => s.find((e) => e.wd === wd);

test('el partido habitual bloquea el gimnasio ese día', () => {
  const u = mkUser({ avail: [0, 1, 2, 3, 4], sports: [{ sport: 'futsal', wd: 2 }] });
  const s = weekSchedule(u, WS);
  assert.equal(at(s, 2).type, 'match');
  assert.equal(at(s, 2).sport, 'futsal');
  assert.equal(at(s, 2).name, 'Futsal');
});

test('el partido cuenta como día de cardio', () => {
  const base = weekSchedule(mkUser({ avail: [0, 1, 2, 3, 4, 5] }), WS);
  const withMatch = weekSchedule(mkUser({ avail: [0, 1, 2, 3, 4, 5], sports: [{ sport: 'football', wd: 6 }] }), WS);
  const cardio = (s) => s.filter((e) => e.type === 'cardio').length;
  assert.equal(cardio(withMatch), Math.max(0, cardio(base) - 1));
});

test('víspera de partido: la sesión de pierna se intercambia con una sin pierna', () => {
  // PPL (int, fat, 4 días): lun Empuje, mar Tirón, jue Pierna, vie Empuje B. Partido el viernes → jueves es víspera.
  const u = mkUser({ avail: [0, 1, 3, 4, 5], sports: [{ sport: 'futsal', wd: 4 }] });
  assert.equal(u.plan.split, 'ppl');
  const s = weekSchedule(u, WS);
  const eve = at(s, 3);
  assert.equal(eve.type, 'strength');
  assert.ok(!isLegTpl(eve.tpl), `víspera con pierna: ${eve.name}`);
  assert.ok(s.some((e) => e.type === 'strength' && e.tpl && isLegTpl(e.tpl)), 'la sesión de pierna sigue en la semana');
});

test('víspera sin intercambio posible: solo tren superior y no avanza la rotación', () => {
  const u = mkUser({ level: 'beg', avail: [0, 2, 4], sports: [{ sport: 'futsal', wd: 5 }] }); // cuerpo completo; viernes víspera
  const s = weekSchedule(u, WS);
  const eve = at(s, 4);
  assert.ok(eve.tpl.upper);
  assert.equal(eve.dayIdx, null);
  assert.ok(eve.tpl.items.length > 0);
  assert.ok(!isLegTpl(eve.tpl));
  assert.match(eve.name, /tren superior/);
});

test('víspera de partido: sin HIIT', () => {
  for (let wd = 1; wd <= 6; wd++) {
    const u = mkUser({ avail: [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== wd), sports: [{ sport: 'futsal', wd }] });
    const eve = at(weekSchedule(u, WS), wd - 1);
    if (eve && eve.cond) assert.equal(eve.cond.kind, 'liss', `día ${wd - 1}`);
  }
});

test('"no voy" corre la rotación al siguiente día y ofrece días libres', () => {
  const u = mkUser({ avail: [0, 2, 4] });
  const before = weekSchedule(u, WS).filter((e) => e.type === 'strength').map((e) => e.tpl.key);
  skipDay(u, WS, 0);
  const s = weekSchedule(u, WS);
  assert.equal(at(s, 0).type, 'skip');
  assert.equal(at(s, 2).tpl.key, before[0]);
  assert.equal(at(s, 4).tpl.key, before[1]);
  assert.deepEqual(plain(freeDays(u, WS, 0)), [1, 3, 5, 6]);
  assert.deepEqual(plain(freeDays(u, WS, 3)), [5, 6]);
});

test('día extra: sigue la rotación y respeta el tope de fuerza', () => {
  const u = mkUser({ avail: [0, 2, 4] });
  addExtra(u, WS, 5);
  const s = weekSchedule(u, WS);
  assert.ok(at(s, 5).extra);
  assert.equal(s.filter((e) => e.type === 'strength').length, 4); // fat: tope 4
  addExtra(u, WS, 6);
  const s2 = weekSchedule(u, WS);
  assert.equal(s2.filter((e) => e.type === 'strength').length, 4);
  assert.equal(s2.filter((e) => e.type === 'cardio').length, 1);
});

test('partido de último minuto: el gimnasio de ese día se aparta y la sesión se corre', () => {
  const u = mkUser({ avail: [0, 2, 4] });
  const first = weekSchedule(u, WS).find((e) => e.type === 'strength').tpl.key;
  setMatch(u, WS, 0, 'football');
  const s = weekSchedule(u, WS);
  assert.equal(at(s, 0).type, 'match');
  assert.equal(at(s, 2).tpl.key, first);
});

test('partido registrado: queda hecho', () => {
  const u = mkUser({ avail: [0, 2, 4], sports: [{ sport: 'futsal', wd: 1 }] });
  addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 7, date: WS + DAY + 20 * 3600e3 });
  assert.equal(at(weekSchedule(u, WS), 1).done, true);
});

test('deshacer devuelve la semana exacta de antes', () => {
  const u = mkUser({ avail: [0, 2, 4], sports: [{ sport: 'futsal', wd: 1 }] });
  const orig = JSON.stringify(types(weekSchedule(u, WS)));
  skipDay(u, WS, 0);
  addExtra(u, WS, 5);
  removeMatch(u, WS, 1);
  setMatch(u, WS, 3, 'padel');
  const w = weekEdit(u, WS);
  assert.equal(w.log.length, 4);
  // deshacer en otro orden que el de los cambios
  undoChange(u, WS, w.log[1].id);
  undoChange(u, WS, w.log[0].id);
  undoChange(u, WS, w.log[1].id);
  undoChange(u, WS, w.log[0].id);
  assert.equal(JSON.stringify(types(weekSchedule(u, WS))), orig);
});

test('semanas del formato anterior (lista de días) siguen funcionando', () => {
  const u = mkUser({ avail: [0, 2, 4] }, {});
  u.weeks[weekKey(WS)] = [1, 3];
  assert.deepEqual(types(weekSchedule(u, WS)).map((x) => x.split(':')[0]), ['1', '3']);
  skipDay(u, WS, 1);
  assert.equal(at(weekSchedule(u, WS), 1).type, 'skip');
  assert.deepEqual(plain(weekEdit(u, WS).days), [1, 3]);
});

test('solo se pierde una sesión si el "no voy" no cabe en otro día', () => {
  const u = mkUser({ avail: [0, 2, 4] }); // 3 días, 3 de fuerza: saltar uno pierde una sesión
  skipDay(u, WS, 0);
  assert.equal(lostSessions(u, WS), 1);
  const u2 = mkUser({ avail: [0, 1, 2, 3, 4, 5] }); // 4 fuerza + 2 cardio: al saltar se pierde un cardio, no la fuerza
  skipDay(u2, WS, 0);
  assert.equal(weekSchedule(u2, WS).filter((e) => e.type === 'strength').length, 4);
  assert.equal(lostSessions(u2, WS), 1);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/activities.js', 'js/push.js'], { navigator: {} });
const upcomingReminders = c.get('upcomingReminders');
const genPlan = c.get('genPlan');
const addInjury = c.get('addInjury');

const DAY = 864e5;
const MON = new Date(2026, 8, 28, 6, 0).getTime(); // lunes 06:00

function mkUser(over = {}, extra = {}) {
  const profile = sampleProfile({ level: 'int', goal: 'fat', avail: [0, 2, 4], sessionMin: 60, sports: [{ sport: 'futsal', wd: 1 }], ...over });
  const u = { profile, swaps: {}, prog: {}, history: [], next: 0, weeks: {}, cprog: {}, injuries: [], activities: [], checkins: [{ date: MON - 10 * DAY, weight: 80 }], checkinEvery: 14,
    created: MON - 120 * DAY, cycle: { start: MON - 7 * DAY, len: 4, seen: -1, applied: 0, nextBoost: 1 }, settings: { push: { on: true, hour: 8 } }, ...extra };
  u.plan = genPlan(profile);
  return u;
}

test('un aviso por día de entreno y de partido, a la hora elegida', () => {
  const r = upcomingReminders(mkUser(), MON, 7);
  const train = r.filter((x) => x.tag.startsWith('train'));
  const match = r.filter((x) => x.tag.startsWith('match'));
  assert.equal(match.length, 1);
  assert.match(match[0].title, /Hoy juegas Futsal/);
  assert.ok(train.length >= 3);
  for (const x of r) assert.equal(new Date(x.at).getHours() >= 8, true);
  assert.equal(new Date(train[0].at).getHours(), 8);
  assert.match(train[0].title, /^Hoy toca: /);
});

test('no hay avisos en el pasado', () => {
  const late = new Date(2026, 8, 28, 20, 0).getTime();
  const r = upcomingReminders(mkUser(), late, 7);
  assert.ok(r.every((x) => x.at > late));
});

test('check-in pendiente y revisión de lesión', () => {
  const u = mkUser();
  addInjury(u, { muscle: 'Bíceps', pain: 2, mob: 0, infl: 0, rest: 0, flags: [], date: MON - 2 * DAY });
  const r = upcomingReminders(u, MON, 7);
  assert.ok(r.some((x) => x.tag.startsWith('checkin')), 'check-in a los 14 días');
  assert.ok(r.some((x) => x.tag.startsWith('injury') && /Bíceps/.test(x.title)));
});

test('sin sesión el día de "no voy"; desactivado no genera nada', () => {
  const u = mkUser();
  u.weeks['2026-09-28'] = { matches: {}, skips: [0], extras: [], log: [] };
  const r = upcomingReminders(u, MON, 1);
  assert.ok(!r.some((x) => x.tag.startsWith('train')));
  u.settings.push.on = false;
  assert.equal(upcomingReminders(u, MON, 7).length, 0);
});

test('app Android: los avisos se convierten en notificaciones locales con ids fijos', () => {
  const localNotifs = c.get('localNotifs');
  const r = upcomingReminders(mkUser(), MON, 7);
  const n = localNotifs(r);
  assert.equal(n.length, r.length);
  assert.equal(n[0].id, 1000);
  assert.equal(n[0].title, r[0].title);
  assert.equal(n[0].schedule.at.getTime(), r[0].at);
  assert.equal(n[0].schedule.allowWhileIdle, true);
  assert.equal(n[0].channelId, 'forja-reminders');
  assert.ok(localNotifs(Array.from({ length: 80 }, (_, i) => ({ at: MON + i, title: 't', body: 'b', tag: 'x' }))).length <= 60);
});

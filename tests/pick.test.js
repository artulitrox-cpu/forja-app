const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load(LOGIC);
const pickEx = c.get('pickEx');
const genPlan = c.get('genPlan');
const X = c.get('X');
const MAIN_SLOTS = c.get('MAIN_SLOTS');

test('principiante en gimnasio: press de pecho guiado (máquina o polea)', () => {
  const ex = pickEx('chest_press', sampleProfile({ level: 'beg' }));
  assert.ok(['machine', 'cable'].includes(ex.eq), ex.id);
});

test('intermedio: básicos con mancuernas o barra', () => {
  const ex = pickEx('chest_press', sampleProfile({ level: 'int' }));
  assert.ok(['db', 'bar'].includes(ex.eq), ex.id);
});

test('avanzado: principal con barra, accesorio en máquina o polea', () => {
  const pr = sampleProfile({ level: 'adv' });
  assert.equal(pickEx('squat', pr).eq, 'bar');
  assert.ok(['machine', 'cable'].includes(pickEx('lateral', pr).eq));
});

test('perfil de bajo impacto nunca recibe ejercicios con carga axial', () => {
  for (const pr of [sampleProfile({ age: 65, level: 'adv' }), sampleProfile({ weight: 120, height: 170, level: 'adv' })]) {
    const plan = genPlan(pr);
    for (const d of plan.days) for (const it of d.items) assert.ok(!X(it.ex).spine, `${it.ex} en ${d.name}`);
  }
});

test('el material limita la elección', () => {
  const ex = pickEx('squat', sampleProfile({ equip: 'db' }));
  assert.ok(['db', 'body'].includes(ex.eq));
  assert.equal(pickEx('chest_fly', sampleProfile({ equip: 'body' })), null);
});

test('los principales se mantienen entre bloques y algún accesorio rota', () => {
  const pr = sampleProfile({ level: 'int', goal: 'hyp', days: 4 });
  const a = genPlan(pr, { cyc: 0 });
  const b = genPlan(pr, { cyc: 1 });
  let changed = 0;
  a.days.forEach((d, i) => d.items.forEach((it, j) => {
    const other = b.days[i].items[j];
    if (MAIN_SLOTS.has(it.slot)) assert.equal(it.ex, other.ex, `principal cambió: ${it.slot}`);
    else if (it.ex !== other.ex) changed++;
  }));
  assert.ok(changed > 0, 'ningún accesorio rotó');
});

test('los cambios del usuario (swaps) tienen prioridad', () => {
  const pr = sampleProfile();
  const base = genPlan(pr);
  const it = base.days[0].items[0];
  const plan = genPlan(pr, { swaps: { [it.key]: 'goblet' } });
  assert.equal(plan.days[0].items[0].ex, 'goblet');
});

test('ganar músculo añade accesorios de los huecos nuevos', () => {
  const plan = genPlan(sampleProfile({ level: 'int', goal: 'hyp', days: 4 }));
  const slots = plan.days.flatMap((d) => d.items.map((it) => it.slot));
  assert.ok(slots.includes('chest_fly') && slots.includes('quad_iso') && slots.includes('glute_iso'));
});

test('ningún día repite ejercicio', () => {
  for (const level of ['beg', 'int', 'adv']) for (const goal of ['fat', 'hyp', 'maint']) {
    const plan = genPlan(sampleProfile({ level, goal, days: 5 }));
    for (const d of plan.days) {
      const ids = d.items.map((it) => it.ex);
      assert.equal(new Set(ids).size, ids.length, `${level}/${goal} ${d.name}`);
    }
  }
});

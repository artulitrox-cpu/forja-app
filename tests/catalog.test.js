const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC } = require('./helpers');

const c = load(LOGIC);
const EX = c.get('EX');
const SLOT_LABEL = c.get('SLOT_LABEL');
const POSE_KEYS = ['squat', 'bench', 'ohp', 'row', 'pull', 'curl', 'lateral', 'hinge', 'lunge', 'plank', 'pushup', 'calf', 'crunch', 'facepull', 'pushdown', 'legcurl'];

test('cada ejercicio tiene id único, hueco conocido, material válido y animación existente', () => {
  const ids = new Set();
  for (const e of EX) {
    assert.ok(!ids.has(e.id), `id repetido: ${e.id}`);
    ids.add(e.id);
    assert.ok(SLOT_LABEL[e.slot], `hueco desconocido en ${e.id}: ${e.slot}`);
    assert.ok(['bar', 'db', 'cable', 'machine', 'body'].includes(e.eq), `material en ${e.id}`);
    assert.ok(POSE_KEYS.includes(e.anim), `animación en ${e.id}: ${e.anim}`);
    assert.ok(e.m.length > 0, `sin músculos principales: ${e.id}`);
  }
});

test('hay ejercicios para los huecos nuevos en gimnasio', () => {
  for (const slot of ['chest_fly', 'quad_iso', 'glute_iso']) {
    assert.ok(EX.some((e) => e.slot === slot && ['machine', 'cable'].includes(e.eq)), slot);
  }
});

test('el catálogo incluye máquinas de gimnasio completo', () => {
  for (const id of ['smith_squat', 'hack', 'leg_ext', 'pec_deck', 'cable_fly', 'chest_row', 'assist_machine', 'abductor']) {
    assert.ok(EX.some((e) => e.id === id), id);
  }
});

test('cada foto del mapa existe (inicio y final)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const PHOTO = c.get('PHOTO');
  const ids = new Set(EX.map((e) => e.id));
  for (const [id, src] of Object.entries(PHOTO)) {
    assert.ok(ids.has(id), `ejercicio desconocido en PHOTO: ${id}`);
    for (const i of [0, 1]) assert.ok(fs.existsSync(path.join(__dirname, '..', 'img', 'ex', `${src}-${i}.webp`)), `${src}-${i}.webp`);
  }
});

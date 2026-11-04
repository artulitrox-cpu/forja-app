const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC, sampleProfile } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/activities.js', 'js/hr.js'], { navigator: {} });
const parseHeartRate = c.get('parseHeartRate');
const parseBattery = c.get('parseBattery');
const hrSupported = c.get('hrSupported');
const hrMax = c.get('hrMax');
const hrZoneOf = c.get('hrZoneOf');
const keytelPerMin = c.get('keytelPerMin');
const kcalFromSamples = c.get('kcalFromSamples');
const restReady = c.get('restReady');
const suggestRpe = c.get('suggestRpe');
const liveSummary = c.get('liveSummary');
const hrZone = c.get('hrZone');

const dv = (bytes) => new DataView(new Uint8Array(bytes).buffer);
const man = sampleProfile({ sex: 'm', age: 35, weight: 80, height: 178 });
const woman = sampleProfile({ sex: 'f', age: 30, weight: 60, height: 165 });

test('pulso en uint8 (flags bit 0 = 0)', () => {
  assert.equal(parseHeartRate(dv([0x00, 72])), 72);
  assert.equal(parseHeartRate(dv([0x06, 140, 0x10, 0x00])), 140);
});

test('pulso en uint16 little-endian (flags bit 0 = 1)', () => {
  assert.equal(parseHeartRate(dv([0x01, 0x2c, 0x01])), 300);
  assert.equal(parseHeartRate(dv([0x01, 0x96, 0x00])), 150);
});

test('batería (0x2A19): un byte en %', () => {
  assert.equal(parseBattery(dv([85])), 85);
});

test('sin Web Bluetooth no está disponible', () => {
  assert.equal(hrSupported(), false);
});

test('FC máxima 220 − edad y zonas 1–5', () => {
  assert.equal(hrMax(man), 185);
  assert.equal(hrZoneOf(100, man).z, 1); // 54 %
  assert.equal(hrZoneOf(111, man).z, 2); // 60 %
  assert.equal(hrZoneOf(130, man).z, 3); // 70,3 %
  assert.equal(hrZoneOf(150, man).z, 4); // 81 %
  assert.equal(hrZoneOf(170, man).z, 5); // 92 %
  assert.equal(hrZoneOf(170, man).name, 'Máximo');
  assert.equal(hrZoneOf(120, sampleProfile({ age: '' })), null);
  // el LISS usa la misma FC máxima
  assert.equal(hrZone(man).max, 185);
});

test('Keytel: hombre y mujer', () => {
  assert.equal(Math.round(keytelPerMin(150, man) * 100) / 100, 14.94);
  assert.equal(Math.round(keytelPerMin(150, woman) * 100) / 100, 9.88);
});

test('Keytel: nunca por debajo del gasto en reposo', () => {
  const floor = c.get('bmr')(man) / 1440;
  assert.ok(Math.abs(keytelPerMin(40, man) - floor) < 1e-9);
});

test('integración de lecturas: los huecos no suman', () => {
  const t0 = 1_000_000;
  const cont = Array.from({ length: 61 }, (_, i) => ({ t: t0 + i * 1000, v: 150 })); // 60 s seguidos
  const r = kcalFromSamples(cont, man);
  assert.equal(Math.round(r.kcal * 100) / 100, 14.94);
  assert.equal(r.coveredMs, 60000);
  const gap = [{ t: t0, v: 150 }, { t: t0 + 600000, v: 150 }]; // 10 min sin lecturas → solo 10 s
  assert.equal(kcalFromSamples(gap, man).coveredMs, 10000);
});

test('descanso inteligente: < 115 ppm y al menos 30 s', () => {
  assert.equal(restReady(110, 40), true);
  assert.equal(restReady(110, 20), false);
  assert.equal(restReady(120, 90), false);
  assert.equal(restReady(null, 90), false);
});

test('RPE sugerido por el pulso medio', () => {
  assert.equal(suggestRpe(100, man), 4); // Z1
  assert.equal(suggestRpe(130, man), 6); // Z3
  assert.equal(suggestRpe(150, man), 8); // Z4
  assert.equal(suggestRpe(175, man), 9); // Z5
  assert.equal(suggestRpe(null, man), 6);
});

test('resumen del partido: kcal reales + MET en los huecos', () => {
  const start = 1_000_000, now = start + 60 * 60000; // 60 min
  const samples = Array.from({ length: 30 * 60 + 1 }, (_, i) => ({ t: start + i * 1000, v: 150 })); // 30 min con pulso
  const s = liveSummary({ sport: 'futsal', type: 'field', start }, samples, man, now, 7);
  assert.equal(s.min, 60);
  assert.deepEqual({ ...s.hr }, { avg: 150, max: 150 });
  const real = 14.94 * 30;
  assert.ok(Math.abs(s.kcalReal - Math.round(real)) <= 1, `${s.kcalReal}`);
  const met30 = c.get('activityCalc')({ sport: 'futsal', type: 'field', min: 30, rpe: 7 }, man).kcal;
  assert.ok(Math.abs(s.kcal - (s.kcalReal + met30)) <= 1);
  const none = liveSummary({ sport: 'futsal', type: 'field', start }, [], man, now, 7);
  assert.equal(none.hr, null);
  assert.equal(none.kcalReal, null);
});

test('pico sostenido: ignora picos sueltos de la banda y cuenta 5 s seguidos', () => {
  const hrPeakOf = c.get('hrPeakOf');
  const run = (from, vals) => vals.map((v, i) => ({ t: from + i * 1000, v }));
  // Un pico de 2 lecturas a 230 (camiseta seca) no cuenta; 6 s a 196–198 sí: el pico sostenido es 196.
  const s = [...run(0, [150, 155, 230, 229, 160, 165]), ...run(20000, [196, 197, 198, 197, 196, 196, 170])];
  assert.equal(hrPeakOf(s), 196);
  // Con cortes de señal entre lecturas no hay 5 s seguidos.
  assert.equal(hrPeakOf([{ t: 0, v: 200 }, { t: 3000, v: 200 }, { t: 6000, v: 200 }]), null);
});

test('FC máx. medida: sube las zonas, nunca las baja y descarta valores imposibles', () => {
  const notePeak = c.get('notePeak');
  const run = (v) => Array.from({ length: 8 }, (_, i) => ({ t: i * 1000, v }));
  const u = { profile: sampleProfile({ age: 30 }) };
  assert.equal(hrMax(u.profile), 190);
  assert.equal(notePeak(u, run(180)), null, 'por debajo de la fórmula no cambia nada');
  assert.deepEqual({ ...notePeak(u, run(198)) }, { before: 190, now: 198 });
  assert.equal(hrMax(u.profile), 198);
  assert.equal(hrZone(u.profile).hi, Math.round(198 * 0.7));
  assert.equal(notePeak(u, run(194)), null, 'un pico menor no la baja');
  assert.equal(notePeak(u, run(230)), null, 'más de 25 ppm sobre la fórmula es un error de lectura');
  assert.equal(hrMax(u.profile), 198);
});

test('partido con poca señal: pulso parcial y sin esfuerzo propuesto', () => {
  const start = 0, now = 70 * 60000;
  const near = (from, min, v) => Array.from({ length: min * 60 }, (_, i) => ({ t: from + i * 1000, v }));
  // Solo 15 de 70 min con señal (al volver al banquillo, con el pulso ya bajo).
  const s = liveSummary({ start, sport: 'futsal', type: 'field' }, [...near(0, 5, 120), ...near(30 * 60000, 5, 115), ...near(60 * 60000, 5, 118)], man, now);
  assert.equal(s.partial, true);
  assert.equal(s.coveredMin, 15);
  assert.ok(!s.rpe, 'sin esfuerzo propuesto');
  // Con señal casi todo el rato sí se propone.
  const full = liveSummary({ start, sport: 'futsal', type: 'field' }, near(0, 68, 165), man, now);
  assert.equal(full.partial, false);
  assert.ok(full.rpe >= 6);
});

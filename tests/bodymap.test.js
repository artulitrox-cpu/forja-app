const test = require('node:test');
const assert = require('node:assert/strict');
const { load, LOGIC } = require('./helpers');

const c = load([...LOGIC, 'js/injuries.js', 'js/bodymap.js'], {
  esc: (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])),
});
const bodySvg = c.get('bodySvg');
const MUSCLES = c.get('MUSCLES');
const REGIONS = c.get('REGIONS');
const REGION_BOX = c.get('REGION_BOX');

test('cada músculo tiene al menos una forma en la figura (frente o espalda)', () => {
  const svg = bodySvg('front', null, {}) + bodySvg('back', null, {});
  for (const m of MUSCLES) assert.ok(svg.includes(`data-muscle="${m}"`), m);
});

test('cada región tiene encuadre de zoom', () => {
  for (const r of REGIONS) assert.ok(REGION_BOX[r.id], r.id);
});

test('en el nivel de región solo los músculos de esa región son seleccionables', () => {
  const svg = bodySvg('front', 'chest', { Pectoral: 'moderate' });
  assert.ok(svg.includes('data-a="injmuscle" data-m="Pectoral"'));
  assert.ok(!svg.includes('data-m="Bíceps"'));
  assert.match(svg, /class="mz mz-hurt mz-on"[^>]*data-muscle="Pectoral"/);
  assert.ok(svg.includes(`viewBox="${REGION_BOX.chest.join(' ')}"`));
});

test('lesión leve y fuerte se pintan distinto', () => {
  const svg = bodySvg('back', null, { Glúteos: 'mild', Lumbares: 'refer' });
  assert.match(svg, /mz-mild[^>]*data-muscle="Glúteos"/);
  assert.match(svg, /mz-hurt[^>]*data-muscle="Lumbares"/);
});

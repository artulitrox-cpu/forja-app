const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers');

const FILES = ['js/i18n-en.js', 'js/i18n.js', 'js/catalog.js', 'js/plan.js', 'js/injuries.js', 'js/activities.js', 'js/hr.js', 'js/progress.js', 'js/i18n-en-catalog.js'];
const en = load(FILES, { navigator: { language: 'en-AU' } });
const es = load(FILES, { navigator: { language: 'es-CL' } });
const tr = en.get('tr');

test('idioma por defecto según el navegador', () => {
  assert.equal(en.get('LANG'), 'en');
  assert.equal(es.get('LANG'), 'es');
  assert.equal(es.get('tr')('Hoy toca'), 'Hoy toca');
});

test('frases fijas, catálogo y espacios de los extremos', () => {
  assert.equal(tr('Empezar sesión'), 'Start session');
  assert.equal(tr('Press de banca con barra'), 'Barbell bench press');
  assert.equal(tr('  Cuádriceps '), '  Quads ');
});

test('patrones con partes variables', () => {
  assert.equal(tr('Cambiar Press de banca con barra'), 'Change Barbell bench press');
  assert.equal(tr('22,5 kg × 12 (sugerido)'), '22,5 kg × 12 (suggested)');
  assert.equal(tr('Serie 2 de 3, Press francés'), 'Set 2 of 3, Skull crushers');
  assert.equal(tr('Recomendación: Reduce la carga de piernas un 15 % hoy por fatiga acumulada de Futsal.'), 'Recommendation: Reduce leg load by 15 % today due to accumulated fatigue from Futsal.');
  assert.equal(tr('Barra, press de pecho'), 'Barbell, chest press');
  assert.equal(tr('Futsal · 60 min · RPE 8'), 'Futsal · 60 min · RPE 8');
  assert.equal(tr('Hola, Ana. Hoy toca'), 'Hi, Ana. Today’s session');
});

test('sin traducción devuelve el original', () => {
  assert.equal(tr('Frase inventada que no existe'), 'Frase inventada que no existe');
});

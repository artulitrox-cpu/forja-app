// Genera las formas de la figura de js/bodymap.js (bloque entre los marcadores <body-shapes>).
// Fuente: tools/body-src/bodyFront.ts y bodyBack.ts de react-native-body-highlighter
// (https://github.com/HichamELBSI/react-native-body-highlighter, MIT, ver tools/body-src/LICENSE).
// Uso: node tools/body.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function load(file) {
  const src = fs.readFileSync(path.join(__dirname, 'body-src', file), 'utf8')
    .replace(/^import .*$/m, '').replace(/export const \w+: BodyPart\[\] =/, 'module.exports =');
  const m = { exports: {} };
  new Function('module', src)(m);
  return m.exports;
}

// Las dos vistas ocupan 724 × 1448; la espalda está desplazada 724 en x (se compensa al pintarla).
const VIEW = { front: { file: 'bodyFront.ts', cx: 362 }, back: { file: 'bodyBack.ts', cx: 1086 } };
// Pieza de la fuente → músculo de Forja. Una cadena asigna todas las piezas; un objeto por índice ({ _: por defecto };
// 'r1' = índice 1 solo del lado derecho, porque en la espalda la fuente no ordena igual los dos lados);
// una lista superpone recortes de la misma pieza: y = franja vertical; d = distancia al eje del cuerpo (lateral ↔ medial).
// null = pieza decorativa (no se puede tocar).
const MAP = {
  front: {
    chest: [{ m: 'Pectoral' }, { m: 'Pectoral superior', y: [0, 357] }],
    obliques: 'Oblicuos', abs: 'Abdomen',
    biceps: [{ m: 'Bíceps' }, { m: 'Braquial', y: [470, 9999] }],
    triceps: 'Tríceps', neck: 'Cuello', trapezius: 'Trapecio',
    deltoids: [{ m: 'Deltoide anterior' }, { m: 'Deltoide lateral', d: [137, 999] }],
    adductors: { 0: 'Flexores de cadera', _: 'Aductores' },
    quadriceps: 'Cuádriceps', knees: 'Rodilla', calves: 'Gemelos', ankles: 'Tobillo',
    forearm: [{ m: 'Antebrazo' }, { m: 'Codo', y: [0, 545] }],
    hands: { 0: 'Muñeca', _: null },
    tibialis: null, feet: null, head: null, hair: null,
  },
  back: {
    neck: 'Cuello',
    trapezius: [{ m: 'Trapecio' }, { m: 'Romboides', y: [362, 462], d: [0, 46] }],
    deltoids: 'Deltoide posterior',
    'upper-back': { l1: 'Dorsal ancho', r2: 'Dorsal ancho', _: 'Manguito rotador' },
    triceps: 'Tríceps', 'lower-back': 'Lumbares',
    forearm: { l1: 'Codo', r0: 'Codo', _: 'Antebrazo' },
    gluteal: 'Glúteos', adductors: 'Aductores', hamstring: 'Isquiotibiales',
    calves: { l1: 'Sóleo', l3: 'Sóleo', r2: 'Sóleo', r3: 'Sóleo', _: 'Gemelos' },
    ankles: 'Tendón de Aquiles',
    hands: { l2: 'Muñeca', r0: 'Muñeca', _: null },
    feet: null, head: null, hair: null,
  },
};

function clipRect(c, side, cx) {
  const [y0, y1] = c.y || [0, 1448];
  if (!c.d) return [cx - 724, y0, 1448, y1 - y0];
  const [d0, d1] = c.d;
  return side === 'right' ? [cx + d0, y0, d1 - d0, y1 - y0] : [cx - d1, y0, d1 - d0, y1 - y0];
}

const out = {}, decor = {};
for (const [view, { file, cx }] of Object.entries(VIEW)) {
  out[view] = []; decor[view] = [];
  for (const part of load(file)) {
    if (!(part.slug in MAP[view])) throw new Error(`${view}: pieza sin asignar: ${part.slug}`);
    const rule = MAP[view][part.slug];
    for (const side of ['left', 'right', 'common']) (part.path[side] || []).forEach((d, i) => {
      const k = side[0] + i, r = rule && typeof rule === 'object' && !Array.isArray(rule) ? (k in rule ? rule[k] : i in rule ? rule[i] : rule._) : rule;
      if (r == null) { decor[view].push(d); return; }
      if (typeof r === 'string') { out[view].push([r, d]); return; }
      for (const c of r) out[view].push(c.y || c.d ? [c.m, d, clipRect(c, side, cx)] : [c.m, d]);
    });
  }
}

const rows = (list) => list.map((x) => '  ' + JSON.stringify(x)).join(',\n');
const block = `// <body-shapes> generado por tools/body.js (figura de react-native-body-highlighter, MIT): no editar a mano.
// [músculo, path, recorte opcional [x, y, ancho, alto]].
const BODY_SHAPES={
 front:[
${rows(out.front)}],
 back:[
${rows(out.back)}]};
const BODY_DECOR={front:${JSON.stringify(decor.front)},back:${JSON.stringify(decor.back)}};
// </body-shapes>`;

const file = path.join(root, 'js/bodymap.js');
const src = fs.readFileSync(file, 'utf8');
const re = /\/\/ <body-shapes>[\s\S]*?\/\/ <\/body-shapes>/;
if (!re.test(src)) throw new Error('js/bodymap.js: faltan los marcadores <body-shapes>');
fs.writeFileSync(file, src.replace(re, () => block));
console.log(`bodymap: ${out.front.length} formas de frente, ${out.back.length} de espalda`);

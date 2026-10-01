/* Forja: figura anatómica (frente y espalda) para elegir el músculo lesionado. Script clásico.
   bodySvg() solo genera texto; zoomBody() anima el viewBox en el navegador. */

const BODY_FULL=[0,0,200,420];
// Encuadre de cada región al hacer zoom: [x, y, ancho, alto].
const REGION_BOX={shoulders:[26,38,148,78],arms:[16,86,168,176],chest:[52,62,96,64],back:[46,50,108,164],core:[58,106,84,118],legs:[52,196,96,218]};
// Formas de cada músculo, dibujadas en el lado izquierdo de la figura (x < 100) y reflejadas.
// e = elipse [cx,cy,rx,ry]; r = rectángulo centrado [x,y,w,h,rx]; p = polígono (sin reflejo).
const BODY_SHAPES={
 front:[
  ['Deltoide anterior',{e:[65,80,10,12]}],['Deltoide lateral',{e:[53,86,6,12]}],
  ['Pectoral superior',{e:[85,82,14,6]}],['Pectoral',{e:[84,99,16,12]}],
  ['Bíceps',{e:[50,118,7,19]}],['Braquial',{e:[43,141,4,10]}],['Antebrazo',{e:[42,196,7,28]}],
  ['Abdomen',{r:[88,116,24,70,8],single:1}],['Oblicuos',{e:[77,152,7,26]}],['Flexores de cadera',{e:[85,208,7,9]}],
  ['Cuádriceps',{e:[83,262,13,38]}],['Aductores',{e:[96,246,4,22]}],['Gemelos',{e:[81,352,7,26]}],
  ['Cuello',{r:[93,46,14,14,4],single:1}],['Codo',{e:[46,159,6,6]}],['Muñeca',{e:[37,236,5,6]}],['Rodilla',{e:[83.5,312,9,9]}],['Tobillo',{e:[83.5,394,8,6]}]],
 back:[
  ['Trapecio',{p:'100,54 126,72 100,112 74,72'}],['Deltoide posterior',{e:[65,82,10,12]}],['Deltoide lateral',{e:[53,86,6,12]}],
  ['Manguito rotador',{e:[79,96,9,8]}],['Romboides',{e:[92,100,5,12]}],['Dorsal ancho',{e:[80,136,13,28]}],['Lumbares',{r:[89,162,22,38,6],single:1}],
  ['Tríceps',{e:[50,118,7,19]}],['Antebrazo',{e:[42,196,7,28]}],
  ['Glúteos',{e:[86,224,15,16]}],['Isquiotibiales',{e:[85,276,12,32]}],['Aductores',{e:[97,262,4,18]}],['Gemelos',{e:[85,340,10,22]}],['Sóleo',{e:[85,374,7,12]}],
  ['Cuello',{r:[93,46,14,14,4],single:1}],['Codo',{e:[46,159,6,6]}],['Muñeca',{e:[37,236,5,6]}],['Tendón de Aquiles',{e:[83.5,394,4,8]}]]};
const BODY_SIL=`<circle cx="100" cy="30" r="18"/><rect x="92" y="46" width="16" height="16" rx="4"/>
 <path d="M58 70 Q100 58 142 70 L136 200 Q135 210 134 218 L66 218 Q65 210 64 200 Z"/>
 <rect x="42" y="70" width="18" height="100" rx="9" transform="rotate(6 51 70)"/><rect x="140" y="70" width="18" height="100" rx="9" transform="rotate(-6 149 70)"/>
 <rect x="33" y="166" width="17" height="86" rx="8" transform="rotate(3 41 166)"/><rect x="150" y="166" width="17" height="86" rx="8" transform="rotate(-3 159 166)"/>
 <rect x="69" y="212" width="29" height="112" rx="13"/><rect x="102" y="212" width="29" height="112" rx="13"/>
 <rect x="72" y="318" width="23" height="88" rx="10"/><rect x="105" y="318" width="23" height="88" rx="10"/>`;
// Formas SVG de un músculo (con su reflejo), cada una con su título accesible.
function shapeMarkup(sh,attrs,title){const t=`<title>${title}</title>`,out=[];
 if(sh.e){const [cx,cy,rx,ry]=sh.e;out.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}>${t}</ellipse>`);if(!sh.single)out.push(`<ellipse cx="${200-cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}>${t}</ellipse>`)}
 else if(sh.r){const [x,y,w,h,r]=sh.r;out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}>${t}</rect>`)}
 else if(sh.p)out.push(`<polygon points="${sh.p}" ${attrs}>${t}</polygon>`);
 return out.join('')}
// view: 'front' | 'back'; region: id de REGIONS o null; injured: { músculo: nivel }.
function bodySvg(view,region,injured={},box){const vb=(box||(region?REGION_BOX[region]:BODY_FULL)).join(' ');
 const shapes=BODY_SHAPES[view].map(([mus,sh])=>{const reg=regionOf(mus),lvl=injured[mus],inR=region&&reg&&reg.id===region;
  const cls=['mz',lvl?(lvl==='mild'?'mz-mild':'mz-hurt'):'',region?(inR?'mz-on':'mz-off'):''].filter(Boolean).join(' ');
  const act=region?(inR?`data-a="injmuscle" data-m="${esc(mus)}"`:''):`data-a="injregion" data-v="${reg?reg.id:''}"`;
  return shapeMarkup(sh,`class="${cls}" ${act} data-muscle="${esc(mus)}"`,esc(mus))}).join('');
 return `<svg id="bodymap" viewBox="${vb}" class="bodymap" role="img" aria-label="Figura humana, vista ${view==='front'?'de frente':'de espalda'}"><g class="sil">${BODY_SIL}</g>${shapes}</svg>`}
// Anima el viewBox del SVG de una caja a otra (350 ms). Con "reducir movimiento", salta directamente.
function zoomBody(from,to,done){const el=document.getElementById('bodymap');if(!el){done&&done();return}
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,t0=performance.now(),D=350,ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
 const step=now=>{const k=reduce?1:Math.min(1,(now-t0)/D),e=ease(k);el.setAttribute('viewBox',from.map((v,i)=>(v+(to[i]-v)*e).toFixed(2)).join(' '));
  if(k<1)requestAnimationFrame(step);else done&&done()};requestAnimationFrame(step)}

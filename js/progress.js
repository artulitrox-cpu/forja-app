/* Forja: progreso de fuerza (sin DOM). Script clásico.
   1RM estimado (Epley), récords personales, series semanales por grupo muscular y evolución por ejercicio. */

// Epley: peso × (1 + reps/30). Por encima de 12 reps la estimación deja de ser fiable: se limita a 12.
const e1rm=(w,r)=>w>0&&r>0?(r===1?w:w*(1+Math.min(r,12)/30)):0;
const doneSets=it=>(it.sets||[]).filter(s=>s.rt&&(+s.r||0)>0);
// Mejor marca de un ejercicio en una sesión: 1RM estimado, peso máximo y reps máximas (peso corporal).
function bestOf(it){let e=0,w=0,reps=0;doneSets(it).forEach(s=>{e=Math.max(e,e1rm(+s.w||0,+s.r));w=Math.max(w,+s.w||0);reps=Math.max(reps,+s.r||0)});return {e1rm:e,w,reps}}
// Récords por ejercicio: {ex: {e1rm, w, reps, date}} (date = sesión del mejor 1RM, o de las reps si es peso corporal).
function records(history){const R={};
 [...history].sort((a,b)=>a.date-b.date).forEach(h=>(h.items||[]).forEach(it=>{const b=bestOf(it),r=R[it.ex]||(R[it.ex]={e1rm:0,w:0,reps:0,date:h.date});
  if(b.e1rm>r.e1rm){r.e1rm=b.e1rm;r.date=h.date}if(b.w>r.w)r.w=b.w;if(b.reps>r.reps){r.reps=b.reps;if(!r.e1rm)r.date=h.date}}));
 return R}
// Récords que bate una sesión respecto al historial anterior (la primera vez de un ejercicio no cuenta).
function newRecords(prevHistory,h){const R=records(prevHistory),out=[];
 (h.items||[]).forEach(it=>{const r=R[it.ex];if(!r)return;const b=bestOf(it);
  if(b.e1rm>0&&b.e1rm>r.e1rm+.01)out.push({ex:it.ex,kind:'e1rm',value:b.e1rm,prev:r.e1rm});
  else if(!b.e1rm&&!r.e1rm&&b.reps>r.reps)out.push({ex:it.ex,kind:'reps',value:b.reps,prev:r.reps})});
 return out}
// Grupos musculares para el volumen semanal.
const MUSCLE_GROUPS={
 chest:{n:'Pecho',mus:['Pectoral','Pectoral superior']},
 back:{n:'Espalda',mus:['Dorsal ancho','Romboides','Trapecio','Lumbares']},
 shoulders:{n:'Hombros',mus:['Deltoide anterior','Deltoide lateral','Deltoide posterior','Manguito rotador']},
 biceps:{n:'Bíceps',mus:['Bíceps','Braquial','Antebrazo']},
 triceps:{n:'Tríceps',mus:['Tríceps']},
 quads:{n:'Cuádriceps',mus:['Cuádriceps','Aductores']},
 hams:{n:'Isquiotibiales',mus:['Isquiotibiales']},
 glutes:{n:'Glúteos',mus:['Glúteos']},
 calves:{n:'Gemelos',mus:['Gemelos','Sóleo']},
 core:{n:'Core',mus:['Abdomen','Oblicuos','Flexores de cadera']}};
const groupOf=m=>m==='Core'?'core':Object.keys(MUSCLE_GROUPS).find(g=>MUSCLE_GROUPS[g].mus.includes(m))||null;
// Rango orientativo de series semanales por grupo según el objetivo.
const SET_TARGET={hyp:[10,20],fat:[6,12],maint:[6,12]};
// Series hechas por grupo en la semana que empieza en ws: principal 1, secundario 0,5 (cada grupo cuenta una vez por serie).
function weeklySets(history,ws){const out={},end=ws+7*864e5;
 history.filter(h=>h.date>=ws&&h.date<end).forEach(h=>(h.items||[]).forEach(it=>{const ex=X(it.ex);if(!ex)return;const n=doneSets(it).length;if(!n)return;
  const prim=new Set(ex.m.map(groupOf).filter(Boolean)),sec=new Set(ex.s.map(groupOf).filter(g=>g&&!prim.has(g)));
  prim.forEach(g=>{out[g]=(out[g]||0)+n});sec.forEach(g=>{out[g]=(out[g]||0)+n*.5})}));
 return out}
// Evolución del 1RM estimado de un ejercicio: [{t, v}] por sesión, de más antigua a más reciente.
function e1rmSeries(history,exId){return history.filter(h=>(h.items||[]).some(it=>it.ex===exId)).map(h=>({t:h.date,v:Math.round(bestOf(h.items.find(it=>it.ex===exId)).e1rm*10)/10})).filter(p=>p.v>0).sort((a,b)=>a.t-b.t)}

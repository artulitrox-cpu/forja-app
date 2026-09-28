/* Forja: actividades y deportes extra (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html.
   Calorías con MET orientativos (Compendium of Physical Activities) y fatiga de piernas para ajustar el gimnasio. */

// met: equivalente metabólico con RPE 5. legs: carga de piernas (0–1,2).
const SPORTS={
 football:{n:'Fútbol',types:[{id:'gk',n:'Portero',met:5,legs:.5},{id:'def',n:'Defensa',met:9,legs:.9},{id:'mid',n:'Centrocampista',met:10,legs:1},{id:'fwd',n:'Delantero',met:9.5,legs:1},{id:'rec',n:'Partido recreativo',met:7,legs:.8}]},
 futsal:{n:'Futsal',types:[{id:'field',n:'Jugador de campo (alta intensidad discontinua)',met:10,legs:1.1},{id:'gk',n:'Portero',met:5,legs:.5},{id:'rec',n:'Recreativo',met:7.5,legs:.9}]},
 running:{n:'Running',km:true,types:[{id:'easy',n:'Rodaje suave',met:8,legs:.7},{id:'tempo',n:'Tempo',met:10.5,legs:.9},{id:'intervals',n:'Series o intervalos',met:11.5,legs:1},{id:'long',n:'Tirada larga',met:9,legs:.9},{id:'trail',n:'Trail',met:9.5,legs:1}]},
 cycling:{n:'Ciclismo',km:true,types:[{id:'easy',n:'Paseo',met:5,legs:.5},{id:'road',n:'Ruta moderada',met:8,legs:.8},{id:'intervals',n:'Intervalos',met:10,legs:.9},{id:'mtb',n:'Montaña (MTB)',met:8.5,legs:.9}]},
 padel:{n:'Pádel',types:[{id:'rec',n:'Recreativo',met:6,legs:.6},{id:'comp',n:'Competitivo',met:8,legs:.7}]},
 other:{n:'Otro',types:[{id:'steady',n:'Continuo moderado',met:6,legs:.6},{id:'hiit',n:'Intermitente intenso',met:8,legs:.8},{id:'skill',n:'Técnico o de baja intensidad',met:4,legs:.3}]}};
const FATIGUE_LVL=v=>v>=60?'high':v>=30?'moderate':'low';
const FATIGUE_LBL={low:'Baja',moderate:'Moderada',high:'Alta'};
const sportType=a=>{const s=SPORTS[a.sport]||SPORTS.other;return s.types.find(t=>t.id===a.type)||s.types[0]};
const sportName=a=>a.sport==='other'&&a.name?a.name:(SPORTS[a.sport]||SPORTS.other).n;
const dayKey=ts=>weekKey(ts);
// Calorías y fatiga de piernas de una actividad.
function activityCalc(a,pr){const t=sportType(a),w=pr&&pr.weight>0?pr.weight:70,rpe=Math.max(1,Math.min(10,+a.rpe||5)),min=Math.max(0,+a.min||0);
 const kcal=Math.round(t.met*(.7+.06*rpe)*w*min/60),fatigue=Math.min(100,Math.round(t.legs*rpe*min/6));
 return {kcal,fatigue,level:FATIGUE_LVL(fatigue),assumedWeight:!(pr&&pr.weight>0)}}
function addActivity(u,d){const r=activityCalc(d,u.profile),date=d.date||Date.now();
 const a={id:'a'+date.toString(36)+Math.random().toString(36).slice(2,6),date,sport:d.sport,type:sportType(d).id,name:d.sport==='other'?(d.name||'').slice(0,40):undefined,
  min:+d.min,rpe:+d.rpe,km:d.km>0?+d.km:undefined,kcal:r.kcal,fatigue:r.fatigue,level:r.level};
 u.activities=[a,...(u.activities||[])].sort((x,y)=>y.date-x.date).slice(0,200);return a}
function deleteActivity(u,id){u.activities=(u.activities||[]).filter(a=>a.id!==id);if(typeof tombstone==='function')tombstone(u,id)}
// Decaimiento de la fatiga: 100 % en 24 h, 60 % hasta 48 h, nada después.
const decay=h=>h<0?0:h<24?1:h<48?.6:0;
function legFatigue(u,now=Date.now()){let v=0,top=null,topV=0;
 (u.activities||[]).forEach(a=>{const x=a.fatigue*decay((now-a.date)/36e5);v+=x;if(x>topV){topV=x;top=a}});
 return {value:Math.min(100,Math.round(v)),top}}
// Recomendación para el gimnasio de hoy.
function legAdjust(u,now=Date.now()){const f=legFatigue(u,now),pct=f.value>=60?15:f.value>=35?10:0;
 if(!pct)return {pct:0,value:f.value,text:''};
 const sport=sportName(f.top);
 if(u.fatigueSkip===dayKey(now))return {pct:0,value:f.value,skipped:true,sport,text:''};
 return {pct,value:f.value,sport,text:`Recomendación: Reduce la carga de piernas un ${pct} % hoy por fatiga acumulada de ${sport}.`}}
// Actividades de las últimas horas (por defecto 48 h).
const recentActivities=(u,now=Date.now(),h=48)=>(u.activities||[]).filter(a=>a.date<=now&&now-a.date<h*36e5);
// Objetivo calórico del día: (gasto + deporte de hoy) × factor del objetivo.
function dayKcal(u,now=Date.now()){const pr=u.profile,k=dayKey(now),sport=(u.activities||[]).filter(a=>dayKey(a.date)===k).reduce((t,a)=>t+a.kcal,0),t=tdee(pr);
 if(!t)return {total:null,sport,base:null};
 const f=(GOAL_KCAL[pr.goal]||1)+(pr.kcalAdj||0);return {total:Math.round((t+sport)*f/10)*10,sport,base:kcalTarget(pr)}}
// Peso sugerido con fatiga de piernas (solo ejercicios de tren inferior).
function legScaledWeight(ex,w,adj){if(!w||!adj||!adj.pct||!LOWER_SLOTS.has(ex.slot))return w;const st=stepOf(ex);return Math.max(st,Math.round(w*(1-adj.pct/100)/st)*st)}

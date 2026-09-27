/* Forja: lesiones y recuperación (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html.
   Es una estimación orientativa, no un diagnóstico: con señales de alarma se recomienda acudir a un profesional. */

/* ---- Regiones y músculos (mismos nombres que el catálogo de ejercicios) ---- */
const REGIONS=[
 {id:'shoulders',n:'Hombros',mus:['Deltoide anterior','Deltoide lateral','Deltoide posterior','Manguito rotador']},
 {id:'arms',n:'Brazos',mus:['Bíceps','Braquial','Tríceps','Antebrazo']},
 {id:'chest',n:'Pecho',mus:['Pectoral','Pectoral superior']},
 {id:'back',n:'Espalda',mus:['Trapecio','Dorsal ancho','Romboides','Lumbares']},
 {id:'core',n:'Core',mus:['Abdomen','Oblicuos','Flexores de cadera']},
 {id:'legs',n:'Piernas',mus:['Cuádriceps','Aductores','Glúteos','Isquiotibiales','Gemelos','Sóleo']}];
const MUSCLES=REGIONS.flatMap(r=>r.mus);
const regionOf=m=>REGIONS.find(r=>r.mus.includes(m))||null;

/* ---- Triaje ---- */
const INJ_LEVELS={
 mild:{label:'Sobrecarga leve',range:'3 a 7 días de descarga local',days:3,block:'Solo se bloquean los ejercicios donde es el músculo principal.'},
 moderate:{label:'Distensión moderada',range:'1 a 2 semanas de descarga local',days:7,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'},
 severe:{label:'Distensión o sobrecarga importante',range:'2 a 4 semanas de descarga local',days:14,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'},
 refer:{label:'Posible lesión importante: consulta a un profesional',range:'Hasta valoración profesional',days:7,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'}};
const LEVEL_RANK={mild:1,moderate:2,severe:3,refer:4};
const RED_FLAGS=[['numb','Hormigueo, entumecimiento o pérdida de fuerza'],['load','No puedo apoyar ni usar la zona'],['pop','Noté un chasquido o fue un golpe fuerte'],['swell','Hinchazón grande o moratón extenso']];
const TRIAGE_Q=[['mob','Movilidad',['Normal','Algo limitada','Muy limitada']],['infl','Inflamación',['No','Leve','Visible o caliente']],['rest','Dolor en reposo',['No','A veces','Constante']]];
// Puntuación = dolor + 2 × (movilidad + inflamación + reposo). Alarma o dolor ≥ 8 → derivar.
function triage({pain=1,mob=0,infl=0,rest=0,flags=[]}){const score=pain+2*(mob+infl+rest);
 const level=flags.length||pain>=8?'refer':score>=11?'severe':score>=6?'moderate':'mild';
 return {level,score,...INJ_LEVELS[level]}}

/* ---- Lesiones del usuario ---- */
const activeInjuries=u=>(u.injuries||[]).filter(i=>i.active).sort((a,b)=>b.date-a.date);
function addInjury(u,d){const t=triage(d),now=d.date||Date.now();
 u.injuries=(u.injuries||[]).filter(i=>!(i.active&&i.muscle===d.muscle));
 const inj={id:'i'+now.toString(36)+Math.random().toString(36).slice(2,6),muscle:d.muscle,date:now,pain:d.pain,mob:d.mob,infl:d.infl,rest:d.rest,flags:[...(d.flags||[])],
  level:t.level,reviewAt:now+t.days*864e5,active:true,resolvedAt:null};
 u.injuries.unshift(inj);u.injuries.sort((a,b)=>b.date-a.date);u.injuries=u.injuries.slice(0,30);return inj}
function resolveInjury(u,id){const i=(u.injuries||[]).find(x=>x.id===id);if(i){i.active=false;i.resolvedAt=Date.now()}return i}
function deleteInjury(u,id){u.injuries=(u.injuries||[]).filter(x=>x.id!==id)}
// { músculo: nivel } de las lesiones activas.
function injuryMap(u){const m={};activeInjuries(u).forEach(i=>{if(!m[i.muscle]||LEVEL_RANK[i.level]>LEVEL_RANK[m[i.muscle]])m[i.muscle]=i.level});return m}

/* ---- Integración con el generador ---- */
// Músculo lesionado que bloquea el ejercicio: principal siempre; secundario si la lesión no es leve.
function exBlocked(ex,map){for(const m of ex.m.flatMap(expandMus))if(map[m])return m;
 for(const m of ex.s.flatMap(expandMus))if(map[m]&&map[m]!=='mild')return m;return null}
// Secundario con lesión leve: se permite con aviso.
function exWarn(ex,map){for(const m of ex.s.flatMap(expandMus))if(map[m]==='mild')return m;return null}
// Sustituye cada ejercicio bloqueado por el mejor del mismo hueco que no esté bloqueado; si no hay, lo omite.
function safeItems(u,items,map=injuryMap(u)){const kept=[],omitted=[],notes=[];if(!Object.keys(map).length)return {items,omitted,notes};
 items.forEach(it=>{const ex=X(it.ex),mus=exBlocked(ex,map);
  if(!mus){const w=exWarn(ex,map);kept.push(w?{...it,warn:w}:it);return}
  const exclude=[...items.map(x=>x.ex),...kept.map(x=>x.ex)];let alt=null;
  for(let n=0;n<EX.length;n++){const c=pickEx(it.slot,u.profile,{exclude});if(!c)break;if(!exBlocked(c,map)){alt=c;break}exclude.push(c.id)}
  if(alt){kept.push({...it,ex:alt.id,sub:{from:it.ex,mus}});notes.push(`${alt.n} en lugar de ${ex.n} por molestia en ${mus}.`)}
  else{omitted.push({ex:it.ex,slot:it.slot,mus});notes.push(`Ejercicio omitido por molestia muscular en ${mus}: ${ex.n}.`)}});
 return {items:kept,omitted,notes}}
// Cardio: cualquier lesión en los músculos de la máquina obliga a cambiarla; sin opciones, se omite.
function safeCond(u,c,map=injuryMap(u)){if(!c||!Object.keys(map).length)return {cond:c,note:''};
 const hurt=m=>m.mus.some(x=>map[x]),cur=CARDIO_M[c.machine];if(cur&&!hurt(cur))return {cond:c,note:''};
 const pool=cardioPool(u.profile,{hiit:c.kind!=='liss'}).filter(m=>!hurt(m));
 const mus=cur?cur.mus.find(x=>map[x]):'';
 if(pool.length)return {cond:{...c,machine:pool[0].id},note:`${pool[0].n} en lugar de ${cur?cur.n.toLowerCase():'la máquina prevista'} por molestia en ${mus}.`};
 return {cond:null,note:`Bloque de cardio omitido por molestia muscular en ${mus}.`}}
// Músculos que moviliza cada zona de movilidad.
const MOB_ZONE_MUS={hombro:['Deltoide anterior','Deltoide lateral','Deltoide posterior','Manguito rotador'],toracica:['Trapecio','Romboides','Dorsal ancho','Lumbares'],cadera:['Glúteos','Flexores de cadera','Aductores','Isquiotibiales'],tobillo:['Gemelos','Sóleo'],general:[]};
function safeMobility(list,map){return list.filter(m=>!(MOB_ZONE_MUS[m.zone]||[]).some(x=>map[x]))}
function safeStretch(list,map){return list.filter(s=>!s.mus.some(x=>map[x]))}
// Ejercicios del plan afectados por una lesión (para el resultado del triaje).
function affectedBy(u,muscle,level){const map={[muscle]:level},seen=new Set(),out=[];
 u.plan.days.forEach(d=>d.items.forEach(it=>{if(seen.has(it.ex))return;seen.add(it.ex);const ex=X(it.ex);if(exBlocked(ex,map))out.push(ex)}));return out}

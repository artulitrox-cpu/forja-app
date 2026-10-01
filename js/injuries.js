/* Forja: lesiones y recuperación (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html.
   Es una estimación orientativa, no un diagnóstico: con señales de alarma se recomienda acudir a un profesional. */

/* ---- Regiones y músculos (mismos nombres que el catálogo de ejercicios) ---- */
const REGIONS=[
 {id:'shoulders',n:'Hombros y cuello',mus:['Deltoide anterior','Deltoide lateral','Deltoide posterior','Manguito rotador','Cuello']},
 {id:'arms',n:'Brazos',mus:['Bíceps','Braquial','Tríceps','Antebrazo','Codo','Muñeca']},
 {id:'chest',n:'Pecho',mus:['Pectoral','Pectoral superior']},
 {id:'back',n:'Espalda',mus:['Trapecio','Dorsal ancho','Romboides','Lumbares']},
 {id:'core',n:'Core',mus:['Abdomen','Oblicuos','Flexores de cadera']},
 {id:'legs',n:'Piernas',mus:['Cuádriceps','Aductores','Glúteos','Isquiotibiales','Gemelos','Sóleo','Rodilla','Tobillo','Tendón de Aquiles']}];
const MUSCLES=REGIONS.flatMap(r=>r.mus);
const regionOf=m=>REGIONS.find(r=>r.mus.includes(m))||null;

/* ---- Articulaciones y tendones ----
   No son músculos del catálogo: cada una tiene reglas propias sobre qué ejercicios, cardio, movilidad y estiramientos carga.
   ex/cardio/mob/str(x, sev): sev = la lesión no es leve. Devuelven true si hay que bloquear. */
const has=(...ids)=>x=>ids.includes(x.id);
const FREE=e=>e.eq==='bar'||e.eq==='db';
const JOINTS={
 'Tobillo':{hint:'Esguince de tobillo (ligamentos laterales)',
  ex:(e,sev)=>e.impact||e.slot==='calves'&&e.id!=='calf_seated'||sev&&(e.slot==='lunge'||e.slot==='calves'||has('squat_bb','goblet','air_squat','smith_squat','sl_rdl','wall_sit')(e)),
  cardio:(c,sev)=>c.impact==='high'||sev&&has('treadmill_walk','stair','walk','step_march','elliptical','skierg')(c),
  mob:(m,sev)=>m.zone==='tobillo'||sev&&has('m_squat_hold','m_lunge_rot','m_jacks')(m),str:(s,sev)=>sev&&s.id==='s_calf'},
 'Tendón de Aquiles':{hint:'Tendinopatía o sobrecarga del tendón de Aquiles',
  ex:(e,sev)=>e.impact||e.slot==='calves'||has('nordic')(e)||sev&&(e.slot==='lunge'||has('sl_rdl','air_squat')(e)),
  cardio:(c,sev)=>c.impact==='high'||has('stair','treadmill_walk')(c)||sev&&has('elliptical','walk','step_march')(c),
  mob:m=>m.zone==='tobillo'||has('m_jacks')(m),str:s=>s.id==='s_calf'},
 'Rodilla':{hint:'Ligamentos (cruzado o lateral), menisco o tendón rotuliano',
  ex:(e,sev)=>e.impact||e.slot==='lunge'||e.slot==='quad_iso'||has('nordic')(e)||sev&&(e.slot==='squat'||e.slot==='hamstring_curl'||has('sl_rdl','deadlift')(e)),
  cardio:(c,sev)=>c.impact==='high'||has('stair')(c)||sev&&has('treadmill_walk','elliptical','step_march','rower','airbike')(c),
  mob:m=>has('m_squat_hold','m_lunge_rot','m_jacks')(m),str:(s,sev)=>sev&&has('s_quad','s_hipflex')(s)},
 'Muñeca':{hint:'Esguince o tendinitis de muñeca',
  ex:(e,sev)=>has('pushup','decline_pushup','pike','bench_dip','skull','curl_bb','inv_row')(e)||sev&&(FREE(e)||has('pullup','chinup','assisted','hanging_raise','plank','ytw')(e)),
  cardio:(c,sev)=>sev&&has('airbike','rower','skierg','bw_circuit')(c),
  mob:m=>has('m_catcow','m_thread','m_inchworm')(m),str:(s,sev)=>sev&&s.id==='s_bi'},
 'Codo':{hint:'Epicondilitis (codo de tenista o de golfista)',
  ex:(e,sev)=>e.slot==='biceps'||e.slot==='triceps'||sev&&['chest_press','incline_press','shoulder_press','vertical_pull','horizontal_row'].includes(e.slot),
  cardio:(c,sev)=>sev&&has('airbike','rower','skierg')(c),
  mob:()=>false,str:(s,sev)=>sev&&has('s_tri','s_bi')(s)},
 'Cuello':{hint:'Contractura o rigidez cervical',
  ex:(e,sev)=>has('ohp_bb','ohp_db','arnold','pike','deadlift')(e)||sev&&(e.slot==='shoulder_press'||has('squat_bb','rdl','row_bb','tbar','pullup','chinup','oh_ext','rope_oh','skull','hanging_raise','cable_crunch')(e)),
  cardio:(c,sev)=>sev&&c.impact==='high',
  mob:(m,sev)=>sev&&has('m_inchworm','m_jacks')(m),str:(s,sev)=>sev&&s.id==='s_trap'}};
const isJoint=m=>!!JOINTS[m];
// Primera articulación lesionada que bloquea x según la regla k ('ex' | 'cardio' | 'mob' | 'str').
function jointHit(map,k,x){for(const j in map)if(JOINTS[j]&&JOINTS[j][k](x,map[j]!=='mild'))return j;return null}

/* ---- Triaje ---- */
const INJ_LEVELS={
 mild:{label:'Sobrecarga leve',range:'3 a 7 días de descarga local',days:3,block:'Solo se bloquean los ejercicios donde es el músculo principal.'},
 moderate:{label:'Distensión moderada',range:'1 a 2 semanas de descarga local',days:7,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'},
 severe:{label:'Distensión o sobrecarga importante',range:'2 a 4 semanas de descarga local',days:14,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'},
 refer:{label:'Posible lesión importante: consulta a un profesional',range:'Hasta valoración profesional',days:7,block:'Se bloquean los ejercicios que lo usan como músculo principal o secundario.'}};
const LEVEL_RANK={mild:1,moderate:2,severe:3,refer:4};
const RED_FLAGS=[['numb','Hormigueo, entumecimiento o pérdida de fuerza'],['load','No puedo apoyar ni usar la zona'],['pop','Noté un chasquido o fue un golpe fuerte'],['swell','Hinchazón grande o moratón extenso']];
// Solo para articulaciones: inestabilidad o bloqueo apuntan a ligamento o menisco.
const JOINT_FLAGS=[['unstable','La articulación falla o se me va'],['locked','Se bloquea o no puedo estirarla del todo']];
const flagsFor=m=>isJoint(m)?[...RED_FLAGS,...JOINT_FLAGS]:RED_FLAGS;
// Articulaciones: mismas puntuaciones, nombres y plazos propios (ligamentos y tendones tardan más).
const JOINT_LEVELS={
 mild:{label:'Molestia articular leve',range:'5 a 10 días de descarga',days:5,block:'Se evitan el impacto y los ejercicios que más cargan la articulación.'},
 moderate:{label:'Esguince o tendinitis moderada',range:'2 a 3 semanas de descarga',days:14,block:'Se bloquean los ejercicios que cargan la articulación y se buscan alternativas en máquina.'},
 severe:{label:'Esguince o lesión importante',range:'3 a 6 semanas de descarga',days:21,block:'Se bloquean los ejercicios que cargan la articulación y se buscan alternativas en máquina.'},
 refer:{label:'Posible lesión de ligamento o tendón: consulta a un profesional',range:'Hasta valoración profesional',days:7,block:'Se bloquean los ejercicios que cargan la articulación y se buscan alternativas en máquina.'}};
const levelInfo=(m,l)=>(isJoint(m)?JOINT_LEVELS:INJ_LEVELS)[l];
const TRIAGE_Q=[['mob','Movilidad',['Normal','Algo limitada','Muy limitada']],['infl','Inflamación',['No','Leve','Visible o caliente']],['rest','Dolor en reposo',['No','A veces','Constante']]];
// Puntuación = dolor + 2 × (movilidad + inflamación + reposo). Alarma o dolor ≥ 8 → derivar.
function triage({muscle,pain=1,mob=0,infl=0,rest=0,flags=[]}){const score=pain+2*(mob+infl+rest);
 const level=flags.length||pain>=8?'refer':score>=11?'severe':score>=6?'moderate':'mild';
 return {level,score,...levelInfo(muscle,level)}}

/* ---- Lesiones del usuario ---- */
const activeInjuries=u=>(u.injuries||[]).filter(i=>i.active).sort((a,b)=>b.date-a.date);
function addInjury(u,d){const t=triage(d),now=d.date||Date.now();
 u.injuries=(u.injuries||[]).filter(i=>{const rep=i.active&&i.muscle===d.muscle;if(rep&&typeof tombstone==='function')tombstone(u,i.id);return !rep});
 const inj={id:'i'+now.toString(36)+Math.random().toString(36).slice(2,6),muscle:d.muscle,date:now,pain:d.pain,mob:d.mob,infl:d.infl,rest:d.rest,flags:[...(d.flags||[])],
  level:t.level,reviewAt:now+t.days*864e5,active:true,resolvedAt:null,upd:Date.now()};
 u.injuries.unshift(inj);u.injuries.sort((a,b)=>b.date-a.date);u.injuries=u.injuries.slice(0,30);return inj}
function resolveInjury(u,id){const i=(u.injuries||[]).find(x=>x.id===id);if(i){i.active=false;i.resolvedAt=Date.now();i.upd=Date.now()}return i}
function deleteInjury(u,id){u.injuries=(u.injuries||[]).filter(x=>x.id!==id);if(typeof tombstone==='function')tombstone(u,id)}
// { músculo: nivel } de las lesiones activas.
function injuryMap(u){const m={};activeInjuries(u).forEach(i=>{if(!m[i.muscle]||LEVEL_RANK[i.level]>LEVEL_RANK[m[i.muscle]])m[i.muscle]=i.level});return m}

/* ---- Integración con el generador ---- */
// Músculo lesionado que bloquea el ejercicio: principal siempre; secundario si la lesión no es leve.
function exBlocked(ex,map){for(const m of ex.m.flatMap(expandMus))if(map[m])return m;
 for(const m of ex.s.flatMap(expandMus))if(map[m]&&map[m]!=='mild')return m;return jointHit(map,'ex',ex)}
// Secundario con lesión leve: se permite con aviso.
function exWarn(ex,map){for(const m of ex.s.flatMap(expandMus))if(map[m]==='mild')return m;return null}
// Sustituye cada ejercicio bloqueado por el mejor del mismo hueco que no esté bloqueado; si no hay, lo omite.
function safeItems(u,items,map=injuryMap(u)){const kept=[],omitted=[],notes=[];if(!Object.keys(map).length)return {items,omitted,notes};
 items.forEach(it=>{const ex=X(it.ex),mus=exBlocked(ex,map);
  if(!mus){const w=exWarn(ex,map);kept.push(w?{...it,warn:w}:it);return}
  const exclude=[...items.map(x=>x.ex),...kept.map(x=>x.ex)];let alt=null;
  for(let n=0;n<EX.length;n++){const c=pickEx(it.slot,u.profile,{exclude});if(!c)break;if(!exBlocked(c,map)){alt=c;break}exclude.push(c.id)}
  if(alt){kept.push({...it,ex:alt.id,sub:{from:it.ex,mus}});notes.push(`${alt.n} en lugar de ${ex.n} por molestia en ${mus}.`)}
  else{omitted.push({ex:it.ex,slot:it.slot,mus});notes.push(isJoint(mus)?`Ejercicio omitido por lesión en ${mus}: ${ex.n}.`:`Ejercicio omitido por molestia muscular en ${mus}: ${ex.n}.`)}});
 return {items:kept,omitted,notes}}
// Cardio: cualquier lesión en los músculos de la máquina obliga a cambiarla; sin opciones, se omite.
function safeCond(u,c,map=injuryMap(u)){if(!c||!Object.keys(map).length)return {cond:c,note:''};
 const hurt=m=>m.mus.some(x=>map[x])||!!jointHit(map,'cardio',m),cur=CARDIO_M[c.machine];if(cur&&!hurt(cur))return {cond:c,note:''};
 const pool=cardioPool(u.profile,{hiit:c.kind!=='liss'}).filter(m=>!hurt(m));
 const mus=cur?cur.mus.find(x=>map[x])||jointHit(map,'cardio',cur):'';
 if(pool.length)return {cond:{...c,machine:pool[0].id},note:`${pool[0].n} en lugar de ${cur?cur.n.toLowerCase():'la máquina prevista'} por molestia en ${mus}.`};
 return {cond:null,note:isJoint(mus)?`Bloque de cardio omitido por lesión en ${mus}.`:`Bloque de cardio omitido por molestia muscular en ${mus}.`}}
// Músculos que moviliza cada zona de movilidad.
const MOB_ZONE_MUS={hombro:['Deltoide anterior','Deltoide lateral','Deltoide posterior','Manguito rotador'],toracica:['Trapecio','Romboides','Dorsal ancho','Lumbares'],cadera:['Glúteos','Flexores de cadera','Aductores','Isquiotibiales'],tobillo:['Gemelos','Sóleo'],general:[]};
function safeMobility(list,map){return list.filter(m=>!(MOB_ZONE_MUS[m.zone]||[]).some(x=>map[x])&&!jointHit(map,'mob',m))}
function safeStretch(list,map){return list.filter(s=>!s.mus.some(x=>map[x])&&!jointHit(map,'str',s))}
// Ejercicios del plan afectados por una lesión (para el resultado del triaje).
function affectedBy(u,muscle,level){const map={[muscle]:level},seen=new Set(),out=[];
 u.plan.days.forEach(d=>d.items.forEach(it=>{if(seen.has(it.ex))return;seen.add(it.ex);const ex=X(it.ex);if(exBlocked(ex,map))out.push(ex)}));return out}

/* Forja: generador de planes, biometría y periodización (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ---- Utilidades puras ---- */
const rnd=x=>Math.round(x*4)/4;
const fmtKg=w=>(Math.round(w*100)/100).toString().replace('.',',');
function fmtDur(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`}
function weekStartOf(ts){const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
const weekStart=()=>weekStartOf(Date.now());
const unit=ex=>ex.time?'s':'reps';
function inc(ex){if(ex.eq==='body')return 0;if(ex.iso)return 1;if(ex.eq==='db')return 2;return LOWER.has(ex.slot)?5:2.5}
/* ---- Biometría ---- */
const hasBio=pr=>!!pr&&pr.weight>0&&pr.height>0&&pr.age>0;
function bmi(pr){return hasBio(pr)?pr.weight/((pr.height/100)**2):null}
function bmiCat(b){return b==null?'':b<18.5?'Bajo peso':b<25?'Normal':b<30?'Sobrepeso':'Obesidad'}
function bmr(pr){if(!hasBio(pr))return null;if(pr.bf>0)return Math.round(370+21.6*pr.weight*(1-pr.bf/100));return Math.round(10*pr.weight+6.25*pr.height-5*pr.age+(pr.sex==='f'?-161:5))}
const bmrFormula=pr=>pr&&pr.bf>0?'Katch-McArdle (usa tu % de grasa del último check-in)':'Mifflin-St Jeor';
function suggestDays(pr){let d={fat:4,hyp:4,maint:3}[pr.goal]||3;
 if(pr.level==='beg')d=3;else if(pr.level==='adv'&&pr.goal!=='maint')d+=1;
 const b=bmi(pr);if(b&&b>=30&&pr.goal==='fat'&&pr.level!=='beg')d=Math.max(d,4);
 if((pr.age||0)>=60||(b&&b>=35))d=Math.min(d,3);
 return Math.min(5,Math.max(2,d))}
/* ---- Disponibilidad semanal (0 = lunes … 6 = domingo) ---- */
const DAY_SHORT=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DAY_LONG=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const SESSION_MIN=[30,45,60,75,90];
const AVAIL_DEFAULT={1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,2,4,5],6:[0,1,2,3,4,5],7:[0,1,2,3,4,5,6]};
const MAX_SESSIONS=6;
// Días habituales del perfil. Perfiles antiguos (sin avail) usan su número de días o la sugerencia.
function availOf(pr){if(Array.isArray(pr.avail))return [...pr.avail].sort((a,b)=>a-b);
 const n=(!pr.days||pr.days==='auto')?suggestDays(pr):+pr.days;return AVAIL_DEFAULT[Math.max(1,Math.min(7,n))]}
// Sesiones por semana (tope 6: con 7 días marcados el domingo es descanso).
const daysOf=pr=>Math.min(MAX_SESSIONS,availOf(pr).length);
// Días de fuerza según objetivo y días disponibles (spec §3).
function strengthDays(pr,n){n=Math.min(MAX_SESSIONS,n);if(n<=0)return 0;
 let f={fat:Math.min(n,4),hyp:Math.min(n,5),maint:Math.min(n,3)}[pr.goal]??Math.min(n,3);
 if(pr.level==='beg')f=Math.min(f,3);return Math.max(1,f)}
function tdee(pr){const b=bmr(pr);if(!b)return null;const d=daysOf(pr);return Math.round(b*(d<=3?1.375:d<=5?1.55:1.725))}
const GOAL_KCAL={fat:.8,hyp:1.1,maint:1};
function kcalTarget(pr){const t=tdee(pr);return t?Math.round(t*((GOAL_KCAL[pr.goal]||1)+(pr.kcalAdj||0))/10)*10:null}
const nf=n=>Number(n).toLocaleString('es-ES',{maximumFractionDigits:1});
function adjNotes(pr){const n=[],b=bmi(pr),a=pr.age||0;
 n.push({fat:'Perder grasa: rangos de 10 a 15 reps y descansos cortos para más gasto por sesión.',hyp:'Masa muscular: básicos en 8 a 12 reps a RPE 8 y aislamientos en 10 a 15.',maint:'Mantenimiento: volumen moderado a RPE 7,5 para salud y constancia.'}[pr.goal]||'');
 if(pr.level==='beg')n.push('Principiante: una serie menos y RPE un punto más bajo para aprender la técnica.');
 if(pr.level==='adv')n.push('Avanzado: una serie extra en los ejercicios básicos.');
 if(a>=50)n.push('50 años o más: RPE medio punto más bajo y 15 s más de descanso.');
 if(a>=65)n.push('65 años o más: una serie menos en los ejercicios básicos.');
 if(b&&b>=30)n.push('IMC de 30 o más: pierna con 2 reps más y menos carga para cuidar las articulaciones.');
 if(hasBio(pr))n.push(`Pesos iniciales sugeridos a partir de tu peso corporal (${nf(pr.weight)} kg), tu sexo y tu nivel.`);
 const d=suggestDays(pr);n.push(`Días sugeridos: ${d} por semana según objetivo, nivel${hasBio(pr)?', edad e IMC':''}.`);
 return n.filter(Boolean)}
/* Peso inicial sugerido: fracción del peso corporal por patrón y material */
const RATIO={
 bar:{chest_press:.5,incline_press:.4,shoulder_press:.3,triceps:.2,horizontal_row:.4,biceps:.2,squat:.6,hinge:.7,lunge:.3},
 db:{chest_press:.15,incline_press:.12,shoulder_press:.1,lateral:.04,triceps:.08,horizontal_row:.15,rear_delt:.03,biceps:.07,squat:.2,hinge:.15,lunge:.1,hamstring_curl:.05,calves:.1},
 machine:{chest_press:.4,incline_press:.35,shoulder_press:.3,lateral:.1,rear_delt:.15,squat:1,hamstring_curl:.25,calves:.6},
 cable:{triceps:.15,vertical_pull:.45,horizontal_row:.4,rear_delt:.1,biceps:.15,lateral:.03,core:.25}};
function startW(ex,pr){if(!hasBio(pr)||ex.eq==='body')return null;const r=(RATIO[ex.eq]||{})[ex.slot];if(!r)return null;
 let w=pr.weight*r*({beg:1,int:1.35,adv:1.7}[pr.level]||1)*(pr.sex==='f'?.7:1)*(pr.age>=50?.85:1)*(pr.loadMod||1);
 const st=ex.eq==='db'?1:2.5;w=Math.max(st,Math.round(w/st)*st);if(ex.eq==='bar')w=Math.max(20,w);return w}
/* ---- Periodización por mesociclos ---- */
const WMS=7*864e5;
function wk(u,ws=weekStart()){const c=u.cycle;let abs=Math.round((ws-c.start)/WMS);if(abs<0){c.start=ws;abs=0}
 const week=abs%c.len+1;return {abs,week,len:c.len,cyc:Math.floor(abs/c.len),deload:week===c.len}}
const curWeek=()=>{const u=typeof U==='function'?U():null;return u&&u.cycle?wk(u):null};
function rpeOffset(wi){if(!wi||wi.deload)return 0;const L=wi.len-1;return L>1?Math.round((-.5+(wi.week-1)/(L-1))*2)/2:0}
const stepOf=ex=>ex.eq==='db'?1:ex.iso?1:2.5;
function checkCycle(u){const wi=wk(u),c=u.cycle;if(wi.cyc>c.applied){const b=c.nextBoost||1;
 if(b!==1){Object.entries(u.prog).forEach(([id,g])=>{const ex=X(id);if(ex&&g.w)g.w=Math.max(stepOf(ex),Math.round(g.w*b/stepOf(ex))*stepOf(ex))});u.profile.loadMod=(u.profile.loadMod||1)*b;
  c.boostMsg=`Cargas ${b>1?'subidas':'bajadas'} un ${nf(Math.abs(b-1)*100)} % por tu último check-in.`}else c.boostMsg='';
 c.applied=wi.cyc;c.nextBoost=1;regenPlan(u);save()}}
// Regenera el plan conservando los cambios de ejercicio del usuario y rotando accesorios por bloque.
function regenPlan(u){u.swaps=u.swaps||{};u.plan=genPlan(u.profile,{swaps:u.swaps,cyc:u.cycle?wk(u).cyc:0});return u.plan}
const WEEK={2:['Lun','Jue'],3:['Lun','Mié','Vie'],4:['Lun','Mar','Jue','Vie'],5:['Lun','Mar','Mié','Vie','Sáb'],6:['Lun','Mar','Mié','Jue','Vie','Sáb']};

/* ============ Generador de planes ============ */
const TPL={
 push:{name:'Empuje',focus:'Pecho, hombro y tríceps',slots:['chest_press','shoulder_press','incline_press','lateral','triceps']},
 pull:{name:'Tirón',focus:'Espalda y bíceps',slots:['vertical_pull','horizontal_row','rear_delt','biceps','horizontal_row']},
 legs:{name:'Pierna',focus:'Cuádriceps, glúteos e isquios',slots:['squat','hinge','lunge','hamstring_curl','calves']},
 fbA:{name:'Cuerpo completo A',focus:'Sentadilla, empuje y remo',slots:['squat','chest_press','horizontal_row','shoulder_press','biceps']},
 fbB:{name:'Cuerpo completo B',focus:'Bisagra, tirón y zancada',slots:['hinge','incline_press','vertical_pull','lunge','triceps']},
 fbC:{name:'Cuerpo completo C',focus:'Pierna, hombro y espalda',slots:['squat','shoulder_press','horizontal_row','hamstring_curl','lateral']}
};
// Accesorios extra al final de cada plantilla cuando el objetivo es ganar músculo (los primeros que quita el recorte por tiempo).
const TPL_HYP={push:['chest_fly'],legs:['quad_iso','glute_iso'],fbA:['quad_iso'],fbB:['glute_iso'],fbC:['chest_fly']};
// Ejercicios principales: se mantienen entre bloques para medir el progreso.
const MAIN_SLOTS=new Set(['squat','hinge','chest_press','incline_press','shoulder_press','horizontal_row','vertical_pull']);
// Preferencia de material por nivel (más alto = preferido). El avanzado distingue principales y accesorios.
const LEVEL_PREF={beg:{machine:3,cable:3,db:2,bar:1,body:1},int:{machine:2,cable:2,db:3,bar:3,body:1},advMain:{machine:1,cable:1,db:2,bar:3,body:1},advAcc:{machine:3,cable:3,db:2,bar:1,body:1}};
// 60 años o más, o IMC de 35 o más: sin carga axial alta ni impacto.
const lowImpact=pr=>(pr.age||0)>=60||(bmi(pr)||0)>=35;
function pickEx(slot,pr,{off=0,cyc=0,exclude=[]}={}){
 let list=EX.filter(e=>e.slot===slot&&ALLOW[pr.equip||'gym'].includes(e.eq)&&!exclude.includes(e.id));
 if(lowImpact(pr)){const safe=list.filter(e=>!e.spine&&!e.impact);if(safe.length)list=safe}
 if(!list.length)return null;
 const main=MAIN_SLOTS.has(slot),pref=pr.level==='adv'?LEVEL_PREF[main?'advMain':'advAcc']:LEVEL_PREF[pr.level]||LEVEL_PREF.beg;
 const scored=list.map((e,i)=>({e,sc:pref[e.eq]||0,i})).sort((a,b)=>b.sc-a.sc||a.i-b.i);
 const shift=off+(main?0:cyc),top=scored[0].sc;
 let tier=scored.filter(x=>x.sc===top);
 if(tier.length<2&&shift>0)tier=scored.filter(x=>x.sc>=top-1);
 return tier[shift%tier.length].e}
function genPlan(pr,{swaps={},cyc=0,split=null,nd=strengthDays(pr,daysOf(pr))}={}){
 const ppl=split?split==='ppl':pr.level!=='beg'&&nd>=4;
 const keys=ppl?['push','pull','legs']:['fbA','fbB','fbC'];
 const count={beg:4,int:5,adv:5}[pr.level]||4;
 const days=[];
 for(let i=0;i<Math.max(1,nd);i++){
  const k=keys[i%3],tpl=TPL[k],round=Math.floor(i/3),tag=k+(ppl&&round?'B':''),used={},items=[];
  const slots=[...tpl.slots.slice(0,count),...(pr.goal==='hyp'&&TPL_HYP[k]||[]),'core'];
  slots.forEach((sl,pos)=>{const key=`${tag}:${sl}:${pos}`,off=(used[sl]||0)+(ppl?round:0);used[sl]=(used[sl]||0)+1;
   const exclude=items.map(x=>x.ex),sw=swaps[key]&&X(swaps[key]);
   const ex=sw&&!exclude.includes(sw.id)?sw:pickEx(sl,pr,{off,cyc,exclude});
   if(ex)items.push({slot:sl,ex:ex.id,key})});
  days.push({key:k,name:ppl?`${tpl.name} ${round?'B':'A'}`:tpl.name,focus:tpl.focus,items});
 }
 return {split:ppl?'ppl':'fb',days,weekdays:WEEK[Math.max(2,Math.min(6,nd))]};
}
function presc(ex,pr,wi=curWeek()){
 const B={str:{c:[4,4,6,8,150],i:[3,8,10,8,90]},hyp:{c:[3,8,12,8,90],i:[3,10,15,8.5,60]},fat:{c:[3,10,12,7,60],i:[3,12,15,7,45]},maint:{c:[3,8,12,7.5,90],i:[2,10,15,7.5,60]},end:{c:[3,15,20,7,45],i:[2,15,20,7,30]}}[pr.goal];
 let [sets,min,max,rpe,rest]=ex.iso?B.i:B.c;
 if(pr.level==='beg'){sets=Math.max(2,sets-1);rpe-=1}
 if(pr.level==='adv'&&!ex.iso){sets+=1;rpe=Math.min(9,rpe+.5)}
 const age=pr.age||0,b=bmi(pr);
 if(age>=50){rpe-=.5;rest+=15}
 if(age>=65&&!ex.iso)sets=Math.max(2,sets-1);
 if(b&&b>=30&&LOWER.has(ex.slot)&&!ex.iso){min+=2;max+=2;rpe-=.5}
 if(ex.time){min={beg:20,int:30,adv:40}[pr.level];max=min+20;rest=Math.min(rest,60)}
 else if(ex.slot==='core'){min=Math.max(min,10);max=Math.max(max,15)}
 if(wi){if(wi.deload){sets=Math.max(1,Math.round(sets*.7));rpe-=1.5}else rpe+=rpeOffset(wi)}
 rpe=Math.max(5,Math.min(9.5,rpe));
 return {sets,min,max,rpe,rest};
}
function prog(u,ex,p){let g=u.prog[ex.id];if(!g)g=u.prog[ex.id]={w:null,r:p.min};return g}
const presTxt=(p,ex)=>`${p.sets} × ${p.min}–${p.max} ${unit(ex)}`;
const rirTxt=rpe=>{const r=10-rpe;return r<=0?'al fallo':`deja unas ${String(r).replace('.',',')} reps en reserva`};
function loadTxt(ex,g,pr){if(ex.eq==='body')return `objetivo ${g.r} ${unit(ex)}`;if(g.w)return `${fmtKg(g.w)} kg × ${g.r}`;const sw=pr&&startW(ex,pr);return sw?`${fmtKg(sw)} kg × ${g.r} (sugerido)`:'elige peso inicial'}
const WARM=480,WORK=45;
/* Tiempo estimado: 8 min calentamiento + series×45 s + series×descanso */
function estimate(u,day){let sets=0,rest=0;day.items.forEach(it=>{const p=presc(X(it.ex),u.profile);sets+=p.sets;rest+=p.sets*p.rest});return {sets,warm:WARM,work:sets*WORK,rest,total:WARM+sets*WORK+rest}}
// Minutos de la parte de fuerza de una plantilla (sin movilidad, cardio ni estiramientos).
const estMin=(u,day)=>{const e=estimate(u,day);return Math.round((e.work+e.rest)/60)};

/* ============ Semana: reparto de sesiones ============ */
const DAY_MS=864e5;
const weekday=ts=>(new Date(ts).getDay()+6)%7;
function weekKey(ts){const d=new Date(ts);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
// Días de entreno de una semana: la edición de esa semana (u.weeks) o, si no hay, los habituales.
function weekDaysFor(u,ws){const w=u.weeks&&u.weeks[weekKey(ws)];
 return [...new Set(Array.isArray(w)?w:availOf(u.profile))].filter(x=>x>=0&&x<=6).sort((a,b)=>a-b)}
// f posiciones de n, lo más separadas posible.
function spread(n,f){const out=new Set();for(let j=0;j<f;j++)out.add(Math.min(n-1,Math.max(0,Math.round((j+.5)*n/f-.5))));
 for(let i=0;out.size<f&&i<n;i++)out.add(i);return out}
// Reparto de la semana: [{wd, type:'strength'|'cardio'|'rest', done, name, tpl?, dayIdx?}].
// La rotación de fuerza continúa desde u.next; las sesiones ya hechas esa semana se marcan por orden.
function weekSchedule(u,ws=weekStart()){
 const pr=u.profile,days=weekDaysFor(u,ws),rest7=days.length>MAX_SESSIONS,act=rest7?days.filter(d=>d!==6):days;
 const n=act.length,F=strengthDays(pr,n),pos=spread(n,F);
 const fallback=u.plan.split==='ppl'&&F<3;
 const tpls=fallback?genPlan(pr,{swaps:u.swaps||{},cyc:u.cycle?wk(u).cyc:0,split:'fb',nd:Math.max(1,F)}).days:u.plan.days;
 const end=ws+7*DAY_MS,hist=(u.history||[]).filter(h=>h.date>=ws&&h.date<end).sort((a,b)=>a.date-b.date);
 const doneS=hist.filter(h=>h.kind!=='cardio'),doneC=hist.filter(h=>h.kind==='cardio');
 const cardioMax=pr.goal==='hyp'?1:Infinity;
 let si=0,ci=0;const out=[];
 act.forEach((wd,i)=>{
  if(pos.has(i)){const j=si++;
   if(j<doneS.length){out.push({wd,type:'strength',done:true,name:doneS[j].day});return}
   const k=j-doneS.length,idx=fallback?k%tpls.length:(u.next+k)%tpls.length,tpl=tpls[idx];
   out.push({wd,type:'strength',done:false,name:tpl.name,tpl,dayIdx:fallback?null:idx})}
  else if(ci<cardioMax){const j=ci++;out.push({wd,type:'cardio',done:j<doneC.length,name:'Cardio'})}
  else out.push({wd,type:'rest',done:false,name:'Descanso'})});
 if(rest7)out.push({wd:6,type:'rest',done:false,name:'Descanso'});
 assignConditioning(u,out,ws);
 return out}

/* ============ Migración de datos v1 → v2 ============ */
// Primer ejercicio añadido en la v2: los anteriores forman el catálogo con el que se eligió el plan v1.
const V2_FIRST_NEW='smith_bench';
function oldPick(slot,equip,off){const cut=EX.findIndex(e=>e.id===V2_FIRST_NEW);
 const list=EX.slice(0,cut<0?EX.length:cut).filter(e=>e.slot===slot&&ALLOW[equip].includes(e.eq));return list.length?list[off%list.length].id:null}
// Idempotente. Conserva prog, history, cycle, checkins y next. Devuelve true si ha migrado.
function migrateUser(u){if(u.v>=2)return false;const pr=u.profile;
 if(pr.goal==='str')pr.goal='hyp';if(pr.goal==='end')pr.goal='maint';if(!pr.sex)pr.sex='m';
 pr.avail=availOf(pr);pr.sessionMin=pr.sessionMin||60;delete pr.days;
 u.weeks=u.weeks||{};u.cprog=u.cprog||{};u.swaps=u.swaps||{};u.injuries=u.injuries||[];u.history=u.history||[];u.prog=u.prog||{};
 u.cycle=u.cycle||{start:weekStart(),len:4,seen:-1,applied:0,nextBoost:1};u.checkins=u.checkins||[];u.checkinEvery=u.checkinEvery||14;
 // Los ejercicios del plan v1 que no coinciden con la elección automática antigua son cambios del usuario.
 const old=u.plan,fresh=genPlan(pr);
 if(old&&Array.isArray(old.days))old.days.forEach((d,i)=>{const nd=fresh.days[i];if(!nd)return;const round=Math.floor(i/3),used={};
  (d.items||[]).forEach(it=>{const off=(used[it.slot]||0)+(old.split==='ppl'?round:0);used[it.slot]=(used[it.slot]||0)+1;
   if(!X(it.ex)||it.ex===oldPick(it.slot,pr.equip||'gym',off))return;
   const t=nd.items.find(x=>x.slot===it.slot&&!u.swaps[x.key]);if(t)u.swaps[t.key]=it.ex})});
 u.v=2;regenPlan(u);
 u.notice='Tu plan se ha actualizado con cardio, movilidad y tu límite de tiempo. Revísalo en Perfil.';
 u.updatedAt=Date.now();return true}
// Solo se guardan las 8 semanas editadas más recientes.
function pruneWeeks(u){const ks=Object.keys(u.weeks||{}).sort().reverse();ks.slice(8).forEach(k=>delete u.weeks[k])}

/* ============ Acondicionamiento: LISS y HIIT (spec §3 y §5) ============ */
const FINISH_MIN={fat:[10,20],hyp:[10,15],maint:[15,20]};
const CARDIO_DAY_MIN={fat:[30,45],hyp:[25,30],maint:[30,40]};
const HIIT_CAP={fat:2,maint:1,hyp:0};
const CARDIO_TARGET={fat:150,maint:150,hyp:60};
// Pulso orientativo para LISS: 60–70 % de la FC máxima (Tanaka: 208 − 0,7 × edad).
function hrZone(pr){const a=+pr.age;if(!(a>0))return null;const max=Math.round(208-.7*a);return {lo:Math.round(max*.6),hi:Math.round(max*.7),max}}
const LEG_MAIN=new Set(['squat','hinge']);
const isLegTpl=tpl=>!!tpl&&tpl.items.some(it=>LEG_MAIN.has(it.slot));
const lvlIdx=pr=>({beg:0,int:1,adv:2}[pr.level]??0);
// Máquinas posibles: en gimnasio, las de cardio; en casa, cardio sin material. Bajo impacto si el perfil lo pide.
function cardioPool(pr,{hiit=false}={}){let l=CARDIO.filter(c=>(pr.equip||'gym')==='gym'?c.eq==='machine':c.eq==='body');
 if(lowImpact(pr))l=l.filter(c=>c.impact==='low');if(hiit)l=l.filter(c=>c.hiit);return l}
function lissMin(u,[lo,hi]){const add=(u.cprog&&u.cprog.liss&&u.cprog.liss.add)||0;return Math.max(lo,Math.min(hi,lo+Math.round((hi-lo)*lvlIdx(u.profile)/2)+add))}
function hiitProto(u){if(lowImpact(u.profile))return HIIT_MOD;const l=u.cprog&&u.cprog.hiit&&u.cprog.hiit.lvl;
 return HIIT[Math.max(0,Math.min(HIIT.length-1,l??lvlIdx(u.profile)))]}
const protoMin=(rounds,work,rest)=>Math.round((HIIT_WARM+HIIT_COOL+rounds*(work+rest))/60);
// Rellena e.cond = {kind:'liss'|'hiit'|'mod', min, machine, proto?, rounds?, work?, rest?} en las entradas de la semana.
function assignConditioning(u,sched,ws){const pr=u.profile,g=FINISH_MIN[pr.goal]?pr.goal:'maint',wi=u.cycle?wk(u,ws):{deload:false};
 const weeksIn=Math.floor((ws-weekStartOf(u.created||ws))/WMS);
 const cap=wi.deload||(pr.level==='beg'&&weeksIn<2)?0:HIIT_CAP[g];
 const at=wd=>sched.find(x=>x.wd===wd);
 const legNext=e=>{const n=at(e.wd+1);return !!n&&n.type==='strength'&&!n.done&&isLegTpl(n.tpl)};
 const str=sched.filter(e=>e.type==='strength');
 // Ganar músculo: 2 bloques tras sesiones sin pierna principal o, si no hay, las más cortas.
 const fin=g==='hyp'?[...str].sort((a,b)=>(isLegTpl(a.tpl)-isLegTpl(b.tpl))||((a.tpl?a.tpl.items.length:0)-(b.tpl?b.tpl.items.length:0))).slice(0,2):str;
 fin.forEach(e=>e.cond={slot:'finish'});
 sched.filter(e=>e.type==='cardio').forEach(e=>e.cond={slot:'day'});
 const all=sched.filter(e=>e.cond);
 // Perder grasa: alterna LISS y HIIT. Mantenimiento: el HIIT va primero a un día de cardio.
 const order=g==='maint'?[...all.filter(e=>e.cond.slot==='day'),...all.filter(e=>e.cond.slot!=='day')]:all;
 let hiits=0;
 order.forEach((e,i)=>{const want=g==='fat'?i%2===1:g==='maint';
  if(want&&hiits<cap&&!legNext(e)){e.cond.kind='hiit';hiits++}else e.cond.kind='liss'});
 // Perder grasa: si la alternancia no colocó ningún HIIT, se prueba en otro bloque que lo permita.
 if(g==='fat'&&hiits<cap){const alt=order.find(e=>e.cond.kind==='liss'&&!legNext(e));if(alt&&!order.some(e=>e.cond.kind==='hiit')){alt.cond.kind='hiit';hiits++}}
 const weekN=Math.floor(ws/WMS);let mi=0;
 all.sort((a,b)=>a.wd-b.wd).forEach(e=>{const c=e.cond,isH=c.kind==='hiit',pool=cardioPool(pr,{hiit:isH});
  if(!pool.length){delete e.cond;return}
  c.machine=pool[(weekN+mi++)%pool.length].id;
  if(isH){const p=hiitProto(u);if(p===HIIT_MOD)c.kind='mod';Object.assign(c,{proto:p.id,rounds:p.rounds,work:p.work,rest:p.rest,min:protoMin(p.rounds,p.work,p.rest)})}
  else c.min=lissMin(u,c.slot==='day'?CARDIO_DAY_MIN[g]:FINISH_MIN[g]);
  if(wi.deload)c.min=Math.max(8,Math.round(c.min*.6))})}
// Progresión del acondicionamiento según la valoración. Devuelve la nota para el resumen.
function condProgress(u,c,rt){u.cprog=u.cprog||{};
 if(c.kind==='liss'){const g=u.cprog.liss=u.cprog.liss||{add:0};
  if(rt==='easy'){if(g.add<10){g.add+=2;return '+2 min la próxima vez'}return 'Sube un poco la intensidad la próxima vez'}
  if(rt==='hard'){g.add=Math.max(-6,g.add-2);return '−2 min la próxima vez'}return 'Se mantiene'}
 if(c.kind==='hiit'){const g=u.cprog.hiit=u.cprog.hiit||{lvl:lvlIdx(u.profile)};
  if(rt==='easy'&&g.lvl<HIIT.length-1){g.lvl++;return `Siguiente protocolo: ${HIIT[g.lvl].rounds} × ${HIIT[g.lvl].work} s / ${HIIT[g.lvl].rest} s`}
  if(rt==='hard'&&g.lvl>0){g.lvl--;return `Protocolo más suave: ${HIIT[g.lvl].rounds} × ${HIIT[g.lvl].work} s / ${HIIT[g.lvl].rest} s`}return 'Se mantiene'}
 return 'Se mantiene'}

/* ============ Movilidad y estiramientos (spec §6) ============ */
const LOWER_SLOTS=new Set([...LOWER,'quad_iso','glute_iso']);
function mobFor(slots,kind,short=false){const low=slots.some(s=>LOWER_SLOTS.has(s)),up=slots.some(s=>!LOWER_SLOTS.has(s)&&s!=='core');
 const zones=kind==='cardio'?['general','cadera','tobillo']:[...(low?['cadera','tobillo']:[]),...(up?['hombro','toracica']:[]),'general'];
 const n=kind==='cardio'||short?4:6,lists=zones.map(z=>MOB.filter(m=>m.zone===z)),out=[];
 for(let k=0;out.length<n&&lists.some(l=>l.length);k++){const l=lists[k%lists.length];if(l.length)out.push(l.shift())}
 return out}
const expandMus=m=>m==='Core'?['Abdomen','Oblicuos']:[m];
function stretchFor(mus,short=false){const set=new Set(mus.flatMap(expandMus)),cap=short?4:6,maxSec=short?210:330;
 const ranked=STRETCH.map((s,i)=>({s,sc:s.mus.filter(m=>set.has(m)).length,i})).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc||a.i-b.i);
 const out=[];let t=0;for(const {s} of ranked){if(out.length>=cap)break;if(t+s.sec>maxSec)continue;out.push(s);t+=s.sec}
 for(const id of ['s_child','s_hipflex','s_pec','s_ham']){if(out.length>=3)break;const s=STRETCH.find(x=>x.id===id);if(!out.includes(s))out.push(s)}
 return out}

/* ============ Sesión completa y límite de tiempo (spec §4) ============ */
// Construye la sesión de una entrada de la semana: bloques, estimación y recorte al tiempo máximo.
function buildSession(u,e,{ws=weekStart()}={}){const pr=u.profile,wi=u.cycle?wk(u,ws):null,kind=e.type==='cardio'?'cardio':'strength',short=(pr.sessionMin||60)<=45;
 // Lesiones activas (js/injuries.js): se sustituyen u omiten ejercicios, máquina de cardio, movilidad y estiramientos.
 const map=typeof injuryMap==='function'?injuryMap(u):{},inj=Object.keys(map).length>0;
 let raw=kind==='strength'?e.tpl.items:[],omitted=[],notes=[],cond=e.cond?{...e.cond}:null;
 if(inj){const r=safeItems(u,raw,map);raw=r.items;omitted=r.omitted;notes=r.notes;
  if(cond){const c=safeCond(u,cond,map);cond=c.cond;if(c.note)notes.push(c.note)}}
 const s={kind,name:kind==='cardio'?'Cardio':e.tpl.name,focus:kind==='cardio'?'':e.tpl.focus,dayIdx:e.dayIdx??null,deload:!!(wi&&wi.deload),
  items:raw.map(it=>({slot:it.slot,ex:it.ex,key:it.key,sub:it.sub,warn:it.warn,p:presc(X(it.ex),pr,wi)})),cond,omitted,notes};
 if(s.cond)s.focus=condLabel(s.cond);
 s.mob=mobFor(s.items.map(it=>it.slot),kind,short);
 const mus=new Set();s.items.forEach(it=>X(it.ex).m.forEach(m=>mus.add(m)));if(s.cond&&CARDIO_M[s.cond.machine])CARDIO_M[s.cond.machine].mus.forEach(m=>mus.add(m));
 s.stretch=stretchFor([...mus],short);
 if(inj){const fill=(list,pool,n)=>{for(const x of pool){if(list.length>=n)break;if(!list.includes(x))list.push(x)}return list};
  s.mob=fill(safeMobility(s.mob,map),safeMobility(MOB.filter(m=>m.zone==='general'),map),3);
  s.stretch=fill(safeStretch(s.stretch,map),safeStretch(STRETCH,map),3)}
 return fitSession(s,(pr.sessionMin||60)*60-(kind==='cardio'?600:0))}
function condLabel(c){const m=CARDIO_M[c.machine];return `${c.kind==='liss'?'Cardio suave':c.kind==='mod'?'Intervalos moderados':'HIIT'}: ${m?m.n.toLowerCase():''}, ${c.min} min`}
function estSession(s){const mob=s.mob.reduce((t,m)=>t+m.sec+10,0),str=s.items.reduce((t,it)=>t+it.p.sets*(WORK+it.p.rest),0),
 cond=s.cond?s.cond.min*60:0,stretch=s.stretch.reduce((t,x)=>t+x.sec,0);return {mob,str,cond,stretch,total:mob+str+cond+stretch}}
function fitSession(s,limit){const over=()=>(s.est=estSession(s)).total>limit,note=t=>s.notes.push(t);
 // 1) Acorta el acondicionamiento hasta un mínimo de 8 min.
 if(over()&&s.cond){const c=s.cond,before=c.min;
  while(over()&&c.min>8){if(c.rounds){if(c.rounds<=2)break;c.rounds--;c.min=Math.max(8,protoMin(c.rounds,c.work,c.rest))}else c.min--}
  if(c.min<before)note(`Cardio acortado a ${c.min} min para caber en tu tiempo.`)}
 const iso=it=>!MAIN_SLOTS.has(it.slot);
 // Quita el último accesorio; el core, al final.
 const removeOne=()=>{let i=-1;for(let k=s.items.length-1;k>=0;k--)if(iso(s.items[k])&&s.items[k].slot!=='core'){i=k;break}
  if(i<0)i=s.items.findIndex(it=>it.slot==='core');if(i<0)return false;
  const [r]=s.items.splice(i,1);note(`Sin ${X(r.ex).n} para caber en tu tiempo.`);return true};
 // 2) Un aislamiento menos · 3) una serie menos en aislamientos · 4) descansos de 45 s · y vuelta a 2).
 if(over())removeOne();
 if(over()){let ch=0;s.items.forEach(it=>{if(iso(it)&&it.p.sets>2){it.p={...it.p,sets:it.p.sets-1};ch=1}});if(ch)note('Una serie menos en los aislamientos.')}
 if(over()){let ch=0;s.items.forEach(it=>{if(iso(it)&&it.p.rest>45){it.p={...it.p,rest:45};ch=1}});if(ch)note('Descansos de 45 s en los aislamientos.')}
 while(over()&&removeOne());
 s.overTime=over();return s}

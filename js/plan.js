/* Forja: generador de planes, biometría y periodización (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ---- Utilidades puras ---- */
const rnd=x=>Math.round(x*4)/4;
// Decimal con coma en español y con punto en inglés.
const dec=x=>typeof LANG!=='undefined'&&LANG==='en'?String(x):String(x).replace('.',',');
const fmtKg=w=>dec(Math.round(w*100)/100);
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
const nf=n=>Number(n).toLocaleString(LOC(),{maximumFractionDigits:1});
function adjNotes(pr){const n=[],b=bmi(pr),a=pr.age||0;
 n.push({fat:'Perder grasa: básicos en 8 a 12 reps a RPE 7,5 para conservar el músculo; el gasto extra lo pone el cardio.',hyp:'Masa muscular: básicos en 8 a 12 reps a RPE 8 con 2 min de descanso y aislamientos en 10 a 15.',maint:'Mantenimiento: volumen moderado a RPE 7,5 para salud y constancia.'}[pr.goal]||'');
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
// Semanas por bloque (la última es de descarga): 6 para principiantes e intermedios, 5 para avanzados.
const cycleLen=pr=>pr&&pr.level==='adv'?5:6;
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
 push:{name:'Empuje',focus:'Pecho, hombro y tríceps',slots:['chest_press','incline_press','lateral','triceps','chest_fly']},
 pull:{name:'Tirón',focus:'Espalda y bíceps',slots:['vertical_pull','horizontal_row','rear_delt','biceps','horizontal_row']},
 legs:{name:'Pierna',focus:'Cuádriceps, glúteos e isquios',slots:['squat','hinge','lunge','hamstring_curl','calves']},
 fbA:{name:'Cuerpo completo A',focus:'Sentadilla, empuje y remo',slots:['squat','chest_press','horizontal_row','shoulder_press','biceps']},
 fbB:{name:'Cuerpo completo B',focus:'Bisagra, tirón y zancada',slots:['hinge','incline_press','vertical_pull','lunge','triceps']},
 fbC:{name:'Cuerpo completo C',focus:'Pierna, hombro y espalda',slots:['squat','shoulder_press','horizontal_row','hamstring_curl','lateral']},
 // Torso/pierna (4 días) y torso/pierna + empuje/tirón/pierna (5 días): cada músculo 2 veces por semana.
 upA:{name:'Torso A',focus:'Pecho, espalda y hombro',slots:['chest_press','horizontal_row','shoulder_press','vertical_pull','biceps']},
 upB:{name:'Torso B',focus:'Pecho superior, espalda y brazos',slots:['incline_press','vertical_pull','horizontal_row','chest_fly','lateral']},
 loA:{name:'Pierna A',focus:'Cuádriceps, isquios y gemelos',slots:['squat','hamstring_curl','lunge','calves','quad_iso']},
 loB:{name:'Pierna B',focus:'Glúteos, isquios y cuádriceps',slots:['hinge','squat','hamstring_curl','calves','glute_iso']}
};
// Días de cada reparto y nombres propios dentro de él.
const SPLITS={fb:['fbA','fbB','fbC'],ul:['upA','loA','upB','loB'],ulppl:['upA','loA','push','pull','legs'],ppl:['push','pull','legs']};
const SPLIT_NAMES={ulppl:{upA:'Torso',legs:'Pierna B'}};
// Principiantes y 3 días o menos: cuerpo completo. 4 días: torso/pierna. 5: torso/pierna + empuje/tirón/pierna. 6: empuje/tirón/pierna ×2.
const splitFor=(pr,nd)=>pr.level==='beg'||nd<=3?'fb':nd===4?'ul':nd===5?'ulppl':'ppl';
// Accesorios extra al final de cada plantilla cuando el objetivo es ganar músculo (los primeros que quita el recorte por tiempo).
const TPL_HYP={push:['triceps'],legs:['quad_iso','glute_iso'],fbA:['quad_iso'],fbB:['glute_iso'],fbC:['chest_fly'],upA:['triceps','lateral'],upB:['triceps','biceps'],loA:['glute_iso'],loB:['quad_iso']};
// Ejercicios principales: se mantienen entre bloques para medir el progreso.
const MAIN_SLOTS=new Set(['squat','hinge','chest_press','incline_press','shoulder_press','horizontal_row','vertical_pull']);
// Preferencia de material por nivel (más alto = preferido). El avanzado distingue principales y accesorios.
const LEVEL_PREF={beg:{machine:3,cable:3,db:2,bar:1,body:1},int:{machine:2,cable:2,db:3,bar:3,body:1},advMain:{machine:1,cable:1,db:2,bar:3,body:1},advAcc:{machine:3,cable:3,db:2,bar:1,body:1}};
// Accesorios de pierna: máquina primero en todos los niveles (carga estable y fácil de subir).
const LEG_ACC=new Set(['hamstring_curl','quad_iso','glute_iso','calves']);
// 60 años o más, o IMC de 35 o más: sin carga axial alta ni impacto.
const lowImpact=pr=>(pr.age||0)>=60||(bmi(pr)||0)>=35;
function pickEx(slot,pr,{off=0,cyc=0,exclude=[]}={}){
 let list=EX.filter(e=>e.slot===slot&&ALLOW[pr.equip||'gym'].includes(e.eq)&&!exclude.includes(e.id));
 if(lowImpact(pr)){const safe=list.filter(e=>!e.spine&&!e.impact);if(safe.length)list=safe}
 // Los isométricos (sentadilla en pared) solo entran fuera del core si no hay otra opción.
 if(slot!=='core'){const dyn=list.filter(e=>!e.time);if(dyn.length)list=dyn}
 if(!list.length)return null;
 const main=MAIN_SLOTS.has(slot),pref=pr.level==='adv'?LEVEL_PREF[main?'advMain':'advAcc']:LEG_ACC.has(slot)?LEVEL_PREF.advAcc:LEVEL_PREF[pr.level]||LEVEL_PREF.beg;
 // Intermedios y avanzados con material para cargar más: los básicos de carga limitada (sentadilla goblet) quedan al final.
 const heavy=main&&pr.level!=='beg'&&list.some(e=>!e.light&&e.eq!=='body');
 const scored=list.map((e,i)=>({e,sc:heavy&&e.light?0:pref[e.eq]||0,i})).sort((a,b)=>b.sc-a.sc||a.i-b.i);
 const shift=off+(main?0:cyc),top=scored[0].sc;
 let tier=scored.filter(x=>x.sc===top);
 // Variante de otro día o de otro bloque: entran las siguientes opciones con carga, nunca peso corporal ni carga limitada si hay material.
 if(tier.length<2&&shift>0)tier=[...tier,...scored.filter(x=>x.sc<top&&x.e.eq!=='body'&&!(heavy&&x.e.light))];
 return tier[shift%tier.length].e}
function genPlan(pr,{swaps={},cyc=0,split=null,nd=strengthDays(pr,daysOf(pr))}={}){
 const sp=split||splitFor(pr,nd),ppl=sp==='ppl',keys=SPLITS[sp]||SPLITS.fb;
 const count={beg:4,int:5,adv:5}[pr.level]||4;
 // Un hueco que se repite en la semana usa otra variante cada día (remo con barra en Torso A, con mancuerna en Torso B).
 // En empuje/tirón/pierna lo hace la segunda vuelta; los principiantes repiten los básicos para aprender la técnica.
 const days=[],vary=!ppl&&pr.level!=='beg',seen={};
 for(let i=0;i<Math.max(1,nd);i++){
  const k=keys[i%keys.length],tpl=TPL[k],round=Math.floor(i/keys.length),tag=k+(ppl&&round?'B':''),used={},items=[];
  const slots=[...tpl.slots.slice(0,count),...(pr.goal==='hyp'&&TPL_HYP[k]||[]),'core'];
  slots.forEach((sl,pos)=>{const key=`${tag}:${sl}:${pos}`,off=(used[sl]||0)+(ppl?round:0)+(vary?seen[sl]||0:0);used[sl]=(used[sl]||0)+1;
   const exclude=items.map(x=>x.ex),sw=swaps[key]&&X(swaps[key]);
   const ex=sw&&!exclude.includes(sw.id)?sw:pickEx(sl,pr,{off,cyc,exclude});
   if(ex)items.push({slot:sl,ex:ex.id,key})});
  Object.entries(used).forEach(([sl,n])=>{seen[sl]=(seen[sl]||0)+n});
  days.push({key:k,name:ppl?`${tpl.name} ${round?'B':'A'}`:(SPLIT_NAMES[sp]||{})[k]||tpl.name,focus:tpl.focus,items});
 }
 return {split:sp,days,weekdays:WEEK[Math.max(2,Math.min(6,nd))]};
}
function presc(ex,pr,wi=curWeek()){
 // Perder grasa usa los mismos rangos que masa muscular: en déficit, lo que conserva el músculo es seguir entrenando con carga.
 const B={str:{c:[4,4,6,8,150],i:[3,8,10,8,90]},hyp:{c:[3,8,12,8,120],i:[3,10,15,8.5,60]},fat:{c:[3,8,12,7.5,90],i:[3,10,15,7.5,60]},maint:{c:[3,8,12,7.5,90],i:[2,10,15,7.5,60]},end:{c:[3,15,20,7,45],i:[2,15,20,7,30]}}[pr.goal];
 let [sets,min,max,rpe,rest]=ex.iso?B.i:B.c;
 if(pr.level==='beg'){sets=Math.max(2,sets-1);rpe-=1}
 if(pr.level==='adv'&&!ex.iso){sets+=1;rpe=Math.min(9,rpe+.5)}
 const age=pr.age||0,b=bmi(pr);
 if(age>=50){rpe-=.5;rest+=15}
 // Sesiones de 45 min o menos: descansos de básicos de 90 s como máximo para que quepa el trabajo.
 if((pr.sessionMin||60)<=45&&!ex.iso)rest=Math.min(rest,90);
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
const rirTxt=rpe=>{const r=10-rpe;return r<=0?'al fallo':`deja unas ${dec(r)} reps en reserva`};
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
// Edición de una semana: {days?, matches, skips, extras, log}. Las semanas antiguas eran una lista de días.
function weekObj(u,ws){const w=u.weeks&&u.weeks[weekKey(ws)];if(!w)return {matches:{},skips:[],extras:[],log:[]};
 if(Array.isArray(w))return {days:[...w],matches:{},skips:[],extras:[],log:[]};return {matches:{},skips:[],extras:[],log:[],...w}}
// Igual que weekObj, pero guardado en u.weeks para poder modificarlo.
function weekEdit(u,ws){u.weeks=u.weeks||{};const k=weekKey(ws);u.weeks[k]=weekObj(u,ws);pruneWeeks(u);return u.weeks[k]}
// Días de gimnasio habituales de esa semana (sin extras, partidos ni "no voy").
function weekDaysFor(u,ws){const w=weekObj(u,ws);return [...new Set(w.days||availOf(u.profile))].filter(x=>x>=0&&x<=6).sort((a,b)=>a-b)}
// Partidos de la semana: los habituales del perfil más los cambios de esa semana (null = quitado).
function weekMatches(u,ws){const m={};(u.profile.sports||[]).forEach(s=>{m[s.wd]=s.sport});
 Object.entries(weekObj(u,ws).matches).forEach(([wd,sp])=>{if(sp)m[wd]=sp;else delete m[wd]});return m}
// f posiciones de n, lo más separadas posible.
function spread(n,f){const out=new Set();for(let j=0;j<f;j++)out.add(Math.min(n-1,Math.max(0,Math.round((j+.5)*n/f-.5))));
 for(let i=0;out.size<f&&i<n;i++)out.add(i);return out}
const sportLbl=sp=>typeof sportName==='function'?sportName({sport:sp}):sp;
// Versión de tren superior de una plantilla (víspera de partido sin intercambio posible).
function upperTpl(u,tpl){let items=tpl.items.filter(it=>!LOWER_SLOTS.has(it.slot));
 if(!items.some(it=>it.slot!=='core'))items=genPlan(u.profile,{swaps:u.swaps||{},split:'fb',nd:1}).days[0].items.filter(it=>!LOWER_SLOTS.has(it.slot));
 return {...tpl,name:`${tpl.name} (tren superior)`,focus:'Solo tren superior: mañana hay partido',items,upper:true}}
// Reparto de la semana: [{wd, type:'strength'|'cardio'|'rest'|'match'|'skip', done, name, tpl?, dayIdx?, sport?, extra?}].
// La rotación de fuerza continúa desde u.next; las sesiones ya hechas esa semana se marcan por orden.
function weekSchedule(u,ws=weekStart()){
 const pr=u.profile,w=weekObj(u,ws),matches=weekMatches(u,ws),skips=new Set(w.skips),extras=new Set(w.extras);
 const all=[...new Set([...weekDaysFor(u,ws),...extras])].sort((a,b)=>a-b);
 let act=all.filter(d=>matches[d]==null&&!skips.has(d));
 const rest7=act.length>MAX_SESSIONS;if(rest7)act=act.filter(d=>d!==6);
 const n=act.length,F=strengthDays(pr,n),pos=spread(n,F);
 // Con pocos días de fuerza esa semana, el reparto dividido no cubre todo el cuerpo: se usa cuerpo completo.
 const sp=u.plan.split,fallback=((sp==='ppl'||sp==='ulppl')&&F<3)||(sp==='ul'&&F<2);
 const tpls=fallback?genPlan(pr,{swaps:u.swaps||{},cyc:u.cycle?wk(u).cyc:0,split:'fb',nd:Math.max(1,F)}).days:u.plan.days;
 const end=ws+7*DAY_MS,hist=(u.history||[]).filter(h=>h.date>=ws&&h.date<end).sort((a,b)=>a.date-b.date);
 const doneS=hist.filter(h=>h.kind!=='cardio'),doneC=hist.filter(h=>h.kind==='cardio');
 // Cada partido cuenta como un día de cardio.
 const nMatch=Object.keys(matches).length,cardioMax=Math.max(0,(pr.goal==='hyp'?1:n-F)-nMatch);
 let ci=0;const out=[];
 act.forEach((wd,i)=>{const x=extras.has(wd)?{extra:true}:{};
  if(pos.has(i))out.push({wd,type:'strength',done:false,...x});
  else if(ci++<cardioMax)out.push({wd,type:'cardio',done:false,name:'Cardio',...x});
  else out.push({wd,type:'rest',done:false,name:'Descanso',...x})});
 Object.entries(matches).forEach(([wd,sp])=>{wd=+wd;const d0=ws+wd*DAY_MS;
  out.push({wd,type:'match',sport:sp,name:sportLbl(sp),done:(u.activities||[]).some(a=>a.date>=d0&&a.date<d0+DAY_MS)})});
 all.filter(d=>skips.has(d)&&matches[d]==null).forEach(wd=>out.push({wd,type:'skip',done:false,name:'No voy'}));
 if(rest7)out.push({wd:6,type:'rest',done:false,name:'Descanso'});
 markDone(out,doneS,'strength');markDone(out,doneC,'cardio');
 out.sort((a,b)=>a.wd-b.wd);
 // Rotación en las sesiones de fuerza que quedan pendientes.
 let k=0;out.forEach(e=>{if(e.type!=='strength'||e.done)return;const idx=fallback?k%tpls.length:(u.next+k)%tpls.length,tpl=tpls[idx];k++;
  Object.assign(e,{name:tpl.name,tpl,dayIdx:fallback?null:idx})});
 preMatch(u,out,matches);
 assignPrehab(u,out,matches);
 assignConditioning(u,out,ws);
 return out}
// Sesiones hechas (fuerza o cardio): cuentan el día en que se hicieron. Una hecha fuera de su día previsto ocupa la sesión
// que te saltaste antes o, si no, la siguiente pendiente, que pasa a ser descanso (o al tipo del día en que entrenaste).
// Así entrenar el miércoles en vez del jueves deja el jueves libre, en lugar de marcarlo como hecho.
function markDone(out,hist,type){const left=[],at=wd=>out.find(e=>e.wd===wd);
 hist.forEach(h=>{const wd=weekday(h.date),e=out.find(x=>x.wd===wd&&x.type===type&&!x.done);if(!e){left.push(h);return}
  e.done=true;if(type==='strength')e.name=h.day});
 left.forEach(h=>{const wd=weekday(h.date),open=out.filter(x=>x.type===type&&!x.done),take=open.find(x=>x.wd<wd)||open.find(x=>x.wd>wd),cur=at(wd);
  const swap=cur&&!cur.done&&(cur.type==='strength'||cur.type==='cardio');
  if(take)Object.assign(take,swap?{type:cur.type,name:cur.type==='cardio'?'Cardio':take.name}:{type:'rest',name:'Descanso'});
  const done={type,done:true,name:type==='strength'?h.day:'Cardio'};
  if(!cur)out.push({wd,...done});else if(cur.type!=='match'&&!cur.done)Object.assign(cur,done)})}
// Orden de las sesiones pendientes de la semana. Nunca pierna la víspera de un partido; además se evita pierna el día después
// del partido y dos días seguidos del mismo tipo, respetando en lo posible la rotación. Se prueban todas las ordenaciones (≤ 5 sesiones).
function weekCost(seq,matches){let c=0;seq.forEach((x,i)=>{const leg=isLegTpl(x.tpl),p=seq[i-1];
 if(leg&&matches[x.wd+1]!=null)c+=100;if(leg&&matches[x.wd-1]!=null)c+=3;
 if(p&&p.wd===x.wd-1){const pl=isLegTpl(p.tpl);if(pl&&leg)c+=4;else if(!pl&&!leg)c+=1}
 c+=.01*Math.abs(x.k-i)});return c}
function perms(a){if(a.length<=1)return [a];return a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]))}
// Víspera de partido: sin pierna principal. Si no hay otra sesión con la que cambiarla, queda en tren superior.
function preMatch(u,out,matches){const open=out.filter(e=>e.type==='strength'&&!e.done&&e.tpl);
 if(open.length>=2&&open.length<=5&&open.some(e=>!isLegTpl(e.tpl))){
  const slots=open.map((e,k)=>({tpl:e.tpl,dayIdx:e.dayIdx,k}));let best=null,bc=Infinity;
  for(const p of perms(slots)){const cost=weekCost(p.map((s,i)=>({wd:open[i].wd,tpl:s.tpl,k:s.k})),matches);if(cost<bc-1e-9){bc=cost;best=p}}
  best.forEach((s,i)=>{const e=open[i];e.tpl=s.tpl;e.dayIdx=s.dayIdx;e.name=s.tpl.name})}
 open.forEach(e=>{if(matches[e.wd+1]!=null&&isLegTpl(e.tpl)){e.tpl=upperTpl(u,e.tpl);e.name=e.tpl.name;e.dayIdx=null}})}
/* ---- Prevención de lesiones para deportistas ----
   Con un deporte habitual (o partidos esa semana): curl nórdico (isquios), plancha Copenhague (ingle) y gemelo a una pierna
   en 2 sesiones de fuerza separadas, nunca la víspera ni el día de un partido. */
const PREHAB=[{ex:'nordic',min:3,max:6},{ex:'copenhagen',min:20,max:30},{ex:'calf_body',min:12,max:15}];
function assignPrehab(u,out,matches){if(!(u.profile.sports||[]).length&&!Object.keys(matches).length)return;
 const at=wd=>out.find(x=>x.wd===wd),legNext=e=>{const n=at(e.wd+1);return !!n&&n.type==='strength'&&!!n.tpl&&isLegTpl(n.tpl)};
 const cand=out.filter(e=>e.type==='strength'&&!e.done&&e.tpl&&matches[e.wd+1]==null).sort((a,b)=>legNext(a)-legNext(b)||a.wd-b.wd),pick=[];
 for(const e of cand){if(pick.length>=2)break;if(pick.every(p=>Math.abs(p.wd-e.wd)>=2))pick.push(e)}
 pick.forEach(e=>{e.prehab=true})}
// Días libres de la semana después de "desde": sin gimnasio, partido ni "no voy".
function freeDays(u,ws,from){const w=weekObj(u,ws),m=weekMatches(u,ws),used=new Set([...weekDaysFor(u,ws),...w.extras,...w.skips]);
 return [0,1,2,3,4,5,6].filter(d=>d>from&&!used.has(d)&&m[d]==null)}
// Sesiones (fuerza o cardio) que la semana pierde por los "no voy" frente a no haber marcado ninguno.
function lostSessions(u,ws){const w=weekObj(u,ws);if(!w.skips.length)return 0;const k=weekKey(ws),cnt=s=>s.filter(e=>e.type==='strength'||e.type==='cardio').length;
 return Math.max(0,cnt(weekSchedule({...u,weeks:{...(u.weeks||{}),[k]:{...w,skips:[]}}},ws))-cnt(weekSchedule(u,ws)))}
/* ---- Cambios de la semana (con deshacer) ---- */
const wlog=(w,e)=>{w.log.push({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),...e})};
// En un día extra, 'no voy' simplemente quita el extra.
function skipDay(u,ws,wd){const w=weekEdit(u,ws);if(w.skips.includes(wd))return;
 if(w.extras.includes(wd)){w.extras=w.extras.filter(d=>d!==wd);w.log=w.log.filter(l=>!(l.type==='extra'&&l.wd===wd));return}
 w.skips.push(wd);wlog(w,{type:'skip',wd})}
function addExtra(u,ws,wd){const w=weekEdit(u,ws);if(w.skips.includes(wd)){w.skips=w.skips.filter(d=>d!==wd);w.log=w.log.filter(l=>!(l.type==='skip'&&l.wd===wd));return}
 if(w.extras.includes(wd)||weekDaysFor(u,ws).includes(wd))return;w.extras.push(wd);wlog(w,{type:'extra',wd})}
function setMatch(u,ws,wd,sport){const w=weekEdit(u,ws),prev=Object.prototype.hasOwnProperty.call(w.matches,wd)?w.matches[wd]:undefined;
 w.matches[wd]=sport;wlog(w,{type:'match',wd,sport,prev})}
function removeMatch(u,ws,wd){const w=weekEdit(u,ws),prev=Object.prototype.hasOwnProperty.call(w.matches,wd)?w.matches[wd]:undefined;
 const habitual=(u.profile.sports||[]).some(s=>s.wd===wd);if(habitual)w.matches[wd]=null;else delete w.matches[wd];wlog(w,{type:'unmatch',wd,prev})}
function undoChange(u,ws,id){const w=weekEdit(u,ws),i=w.log.findIndex(l=>l.id===id);if(i<0)return;const l=w.log[i];w.log.splice(i,1);
 if(l.type==='skip')w.skips=w.skips.filter(d=>d!==l.wd);
 else if(l.type==='extra')w.extras=w.extras.filter(d=>d!==l.wd);
 else if(l.prev===undefined)delete w.matches[l.wd];else w.matches[l.wd]=l.prev}
// Texto de un cambio para la lista "Cambios de esta semana".
function changeLabel(l){const d=DAY_LONG[l.wd];return {skip:`No voy el ${d}`,extra:`Día extra el ${d}`,match:`Partido de ${sportLbl(l.sport)} el ${d}`,unmatch:`Sin partido el ${d}`}[l.type]}

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
// Plan v3: torso/pierna con 4–5 días, empuje con un press menos y bloques de 5–6 semanas.
// Los ejercicios que el usuario había cambiado se conservan en los huecos equivalentes del plan nuevo.
// Plan v4: otra variante en el segundo día de cada hueco y máquinas en los accesorios de pierna. Desde v3 no reinicia el bloque.
const PLAN_V=4;
function upgradePlan(u){if(!u||!u.profile||!u.plan||(u.planV||0)>=PLAN_V)return false;const pr=u.profile;
 if(u.planV===3){regenPlan(u);u.planV=PLAN_V;
  u.notice='Plan mejorado: los días A y B usan variantes distintas de remo, jalón, sentadilla y accesorios, y el curl femoral y los gemelos van en máquina. Tus cambios de ejercicio se mantienen.';
  u.updatedAt=Date.now();return true}
 const bySlot={};Object.entries(u.swaps||{}).forEach(([k,id])=>{const sl=k.split(':')[1];if(sl&&X(id))bySlot[sl]=id});
 const before=u.plan.split;
 if(u.cycle){Object.assign(u.cycle,{len:cycleLen(pr),start:weekStart(),applied:0,seen:-1,boostMsg:''})}
 u.swaps=u.swaps||{};const fresh=genPlan(pr,{swaps:u.swaps,cyc:0});
 fresh.days.forEach(d=>d.items.forEach(it=>{const id=bySlot[it.slot];if(id&&!u.swaps[it.key]&&!d.items.some(x=>x.ex===id))u.swaps[it.key]=id}));
 regenPlan(u);u.next=0;u.planV=PLAN_V;
 u.notice=u.plan.split!==before&&u.plan.split!=='fb'?'Plan mejorado: ahora entrenas cada músculo 2 veces por semana (torso y pierna), con bloques más largos y calentamiento en los básicos. Tus cambios de ejercicio se mantienen.':'Plan mejorado: bloques más largos, calentamiento en los básicos y descansos ajustados a tu objetivo.';
 u.updatedAt=Date.now();return true}
// Solo se guardan las 8 semanas editadas más recientes.
function pruneWeeks(u){const ks=Object.keys(u.weeks||{}).sort().reverse();ks.slice(8).forEach(k=>delete u.weeks[k])}

/* ============ Acondicionamiento: LISS y HIIT (spec §3 y §5) ============ */
const FINISH_MIN={fat:[10,20],hyp:[10,15],maint:[15,20]};
const CARDIO_DAY_MIN={fat:[30,45],hyp:[25,30],maint:[30,40]};
const HIIT_CAP={fat:2,maint:1,hyp:0};
const CARDIO_TARGET={fat:150,maint:150,hyp:60};
// FC máxima: 220 − edad, o el pico sostenido que haya medido la banda si es mayor (notePeak en js/hr.js).
// Más de 25 ppm por encima de la fórmula se considera un error de lectura.
const HR_PEAK_CAP=25;
function hrMax(pr){const a=+pr.age;if(!(a>0))return null;const f=220-a;return pr.hrPeak>f?Math.min(pr.hrPeak,f+HR_PEAK_CAP):f}
// Pulso orientativo para LISS: 60–70 % de la FC máxima (la misma que usan las zonas del pulsómetro).
function hrZone(pr){const max=hrMax(pr);if(!max)return null;return {lo:Math.round(max*.6),hi:Math.round(max*.7),max}}
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
 const weeksIn=Math.floor((ws-weekStartOf(u.created||ws))/WMS),noHiit=wi.deload||(pr.level==='beg'&&weeksIn<2);
 const cap=noHiit?0:HIIT_CAP[g];
 // Con un deporte habitual, la semana sin partido (ni otra actividad dura registrada) pierde su sesión intensa: un HIIT la sustituye.
 const end=ws+7*DAY_MS,repl=!noHiit&&(pr.sports||[]).length>0&&!sched.some(e=>e.type==='match')&&!(u.activities||[]).some(a=>a.date>=ws&&a.date<end&&a.rpe>=7);
 const at=wd=>sched.find(x=>x.wd===wd);
 // Sin HIIT la víspera de una sesión con pierna principal ni la víspera de un partido.
 const legNext=e=>{const n=at(e.wd+1);return !!n&&((n.type==='strength'&&!n.done&&isLegTpl(n.tpl))||n.type==='match')};
 const str=sched.filter(e=>e.type==='strength');
 // Ganar músculo: 2 bloques tras sesiones sin pierna principal o, si no hay, las más cortas.
 const fin=g==='hyp'?[...str].sort((a,b)=>(isLegTpl(a.tpl)-isLegTpl(b.tpl))||((a.tpl?a.tpl.items.length:0)-(b.tpl?b.tpl.items.length:0))).slice(0,2):str;
 fin.forEach(e=>e.cond={slot:'finish'});
 sched.filter(e=>e.type==='cardio').forEach(e=>e.cond={slot:'day'});
 let all=sched.filter(e=>e.cond);
 // Perder grasa: alterna LISS y HIIT. Mantenimiento: el HIIT va primero a un día de cardio.
 const order=g==='maint'?[...all.filter(e=>e.cond.slot==='day'),...all.filter(e=>e.cond.slot!=='day')]:all;
 let hiits=0;
 order.forEach((e,i)=>{const want=g==='fat'?i%2===1:g==='maint';
  if(want&&hiits<cap&&!legNext(e)){e.cond.kind='hiit';hiits++}else e.cond.kind='liss'});
 // Perder grasa: si la alternancia no colocó ningún HIIT, se prueba en otro bloque que lo permita.
 if(g==='fat'&&hiits<cap){const alt=order.find(e=>e.cond.kind==='liss'&&!legNext(e));if(alt&&!order.some(e=>e.cond.kind==='hiit')){alt.cond.kind='hiit';hiits++}}
 // Reemplazo: primero un día de cardio, luego un bloque suave tras pesas y, si no, se añade tras una sesión sin pierna al día siguiente.
 if(repl){const now=Date.now(),td=now>=ws&&now<end?weekday(now):0,free=e=>!e.done&&e.wd>=td&&!legNext(e);
  const alt=[...all.filter(e=>e.cond.slot==='day'),...all.filter(e=>e.cond.slot!=='day')].find(e=>e.cond.kind==='liss'&&free(e))
   ||str.find(e=>!e.cond&&free(e));
  if(alt){alt.cond={slot:(alt.cond&&alt.cond.slot)||'finish',kind:'hiit',repl:true};all=sched.filter(e=>e.cond)}}
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
const LOWER_SLOTS=new Set([...LOWER,'quad_iso','glute_iso','prehab']);
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
function buildSession(u,e,{ws=weekStart(),now=Date.now()}={}){const pr=u.profile,wi=u.cycle?wk(u,ws):null,kind=e.type==='cardio'?'cardio':'strength',short=(pr.sessionMin||60)<=45;
 // Lesiones activas (js/injuries.js): se sustituyen u omiten ejercicios, máquina de cardio, movilidad y estiramientos.
 const map=typeof injuryMap==='function'?injuryMap(u):{},inj=Object.keys(map).length>0;
 let raw=kind==='strength'?e.tpl.items:[],omitted=[],notes=[],cond=e.cond?{...e.cond}:null;
 if(inj){const r=safeItems(u,raw,map);raw=r.items;omitted=r.omitted;notes=r.notes;
  if(cond){const c=safeCond(u,cond,map);cond=c.cond;if(c.note)notes.push(c.note)}}
 // Músculos cargados en las últimas 40 h (por ejemplo, tras cambiar un ejercicio): alternativa o una serie menos.
 if(kind==='strength'){const f=fatigueItems(u,raw,fatiguedMuscles(u,now),map);raw=f.items;notes.push(...f.notes)}
 // Fatiga de piernas por deporte reciente (js/activities.js): con fatiga alta, el HIIT pasa a cardio suave.
 const legAdj=typeof legAdjust==='function'?legAdjust(u,now):{pct:0};
 if(legAdj.pct>=15&&cond&&cond.kind!=='liss'){const g=FINISH_MIN[pr.goal]?pr.goal:'maint';
  cond={kind:'liss',slot:cond.slot,machine:cond.machine,min:lissMin(u,cond.slot==='day'?CARDIO_DAY_MIN[g]:FINISH_MIN[g])};
  notes.push(`HIIT cambiado a cardio suave por fatiga de piernas (${legAdj.sport}).`)}
 if(e.prehab&&kind==='strength'&&!(legAdj.pct>=15)){const have=new Set(raw.map(it=>it.ex)),hasCalf=raw.some(it=>it.slot==='calves');
  const pre=PREHAB.filter(p=>!have.has(p.ex)&&!(p.ex==='calf_body'&&hasCalf)&&!(inj&&exBlocked(X(p.ex),map))).map(p=>({slot:'prehab',ex:p.ex,key:'prehab:'+p.ex,pre:p}));
  const ci=raw.findIndex(it=>it.slot==='core');raw=ci<0?[...raw,...pre]:[...raw.slice(0,ci),...pre,...raw.slice(ci)]}
 const s={kind,name:kind==='cardio'?'Cardio':e.tpl.name,focus:kind==='cardio'?'':e.tpl.focus,dayIdx:e.dayIdx??null,deload:!!(wi&&wi.deload),
  items:raw.map(it=>{const p=it.pre?{sets:2,min:it.pre.min,max:it.pre.max,rpe:7,rest:60}:presc(X(it.ex),pr,wi);return {slot:it.slot,ex:it.ex,key:it.key,sub:it.sub,warn:it.warn,fat:it.fat,pre:!!it.pre,p:it.fat&&it.fat.less?{...p,sets:Math.max(2,p.sets-1)}:p}}),cond,omitted,notes,legAdj};
 if(s.cond)s.focus=condLabel(s.cond);
 s.mob=mobFor(s.items.map(it=>it.slot),kind,short);
 const mus=new Set();s.items.forEach(it=>X(it.ex).m.forEach(m=>mus.add(m)));if(s.cond&&CARDIO_M[s.cond.machine])CARDIO_M[s.cond.machine].mus.forEach(m=>mus.add(m));
 s.stretch=stretchFor([...mus],short);
 if(inj){const fill=(list,pool,n)=>{for(const x of pool){if(list.length>=n)break;if(!list.includes(x))list.push(x)}return list};
  s.mob=fill(safeMobility(s.mob,map),safeMobility(MOB.filter(m=>m.zone==='general'),map),3);
  s.stretch=fill(safeStretch(s.stretch,map),safeStretch(STRETCH,map),3)}
 fitSession(s,(pr.sessionMin||60)*60-(kind==='cardio'?600:0));
 // Tras el recorte por tiempo, para que el resumen diga los minutos reales del cardio.
 if(s.cond)s.focus=condLabel(s.cond);
 return s}
/* ---- Fatiga muscular reciente ----
   Series hechas como músculo principal en las últimas 40 h. Si un músculo acumula 3 o más (por ejemplo, porque cambiaste
   un ejercicio y ahora lo entrenas un día antes), la siguiente sesión busca una alternativa que no lo cargue o quita una serie. */
const FAT_H=40,FAT_SETS=3,FAT_SKIP=new Set(['Abdomen','Oblicuos']);
function recentLoad(u,now=Date.now()){const m={};
 (u.history||[]).forEach(h=>{const dh=(now-h.date)/36e5;if(dh<0||dh>=FAT_H)return;
  (h.items||[]).forEach(it=>{const ex=X(it.ex);if(!ex)return;ex.m.flatMap(expandMus).forEach(x=>{if(!FAT_SKIP.has(x))m[x]=(m[x]||0)+((it.sets||[]).length)})})});return m}
function fatiguedMuscles(u,now=Date.now()){const L=recentLoad(u,now),out={};for(const k in L)if(L[k]>=FAT_SETS)out[k]=L[k];return out}
// Cambia cada ejercicio cuyo músculo principal está cansado por uno del mismo hueco que no lo cargue; si no hay, marca una serie menos.
function fatigueItems(u,items,fat,inj={}){const notes=[];if(!Object.keys(fat).length)return {items,notes};
 const hit=ex=>ex.m.flatMap(expandMus).find(m=>fat[m]),blocked=ex=>typeof exBlocked==='function'&&exBlocked(ex,inj);
 const out=items.map(it=>{const ex=X(it.ex),mus=hit(ex);if(!mus)return it;
  const exclude=items.map(x=>x.ex);let alt=null;
  for(let n=0;n<EX.length;n++){const c=pickEx(it.slot,u.profile,{exclude});if(!c)break;if(!hit(c)&&!blocked(c)){alt=c;break}exclude.push(c.id)}
  if(alt){notes.push(`${alt.n} en lugar de ${ex.n}: entrenaste ${mus} hace menos de 2 días.`);return {...it,ex:alt.id,fat:{mus,from:it.ex}}}
  notes.push(`${ex.n}: una serie menos porque entrenaste ${mus} hace menos de 2 días.`);return {...it,fat:{mus,less:1}}});
 return {items:out,notes}}
function condLabel(c){const m=CARDIO_M[c.machine];return `${c.kind==='liss'?'Cardio suave':c.kind==='mod'?'Intervalos moderados':'HIIT'}: ${m?m.n.toLowerCase():''}, ${c.min} min`}
function estSession(s){const mob=s.mob.reduce((t,m)=>t+m.sec+10,0),str=s.items.reduce((t,it)=>t+it.p.sets*(WORK+it.p.rest),0),
 cond=s.cond?s.cond.min*60:0,stretch=s.stretch.reduce((t,x)=>t+x.sec,0);return {mob,str,cond,stretch,total:mob+str+cond+stretch}}
function fitSession(s,limit){const over=()=>(s.est=estSession(s)).total>limit,note=t=>s.notes.push(t);
 // 1) Acorta el acondicionamiento hasta un mínimo de 8 min. El HIIT de reemplazo es la sesión intensa de la semana:
 // conserva al menos 6 rondas y, si aún no cabe, antes salen los accesorios (paso 6).
 if(over()&&s.cond){const c=s.cond,before=c.min,floor=c.repl?Math.min(c.rounds||0,6):2;
  while(over()&&c.min>8){if(c.rounds){if(c.rounds<=floor)break;c.rounds--;c.min=Math.max(8,protoMin(c.rounds,c.work,c.rest))}else c.min--}
  if(c.min<before)note(`Cardio acortado a ${c.min} min para caber en tu tiempo.`)}
 // La prevención de lesiones no se recorta: antes salen los accesorios.
 const iso=it=>!MAIN_SLOTS.has(it.slot)&&it.slot!=='prehab';
 // Quita el último accesorio; el core, al final.
 const removeOne=()=>{let i=-1;for(let k=s.items.length-1;k>=0;k--)if(iso(s.items[k])&&s.items[k].slot!=='core'){i=k;break}
  if(i<0)i=s.items.findIndex(it=>it.slot==='core');if(i<0)return false;
  const [r]=s.items.splice(i,1);note(`Sin ${X(r.ex).n} para caber en tu tiempo.`);return true};
 // 2) Descansos de los básicos a 90 s: antes que quitar ejercicios, se acorta el descanso extra de 2 min.
 if(over()){let ch=0;s.items.forEach(it=>{if(!iso(it)&&it.p.rest>90){it.p={...it.p,rest:90};ch=1}});if(ch)note('Descansos de 90 s en los básicos para que quepa todo.')}
 // 3) Un aislamiento menos · 4) una serie menos en aislamientos · 5) descansos de 45 s · y vuelta a 3).
 if(over())removeOne();
 if(over()){let ch=0;s.items.forEach(it=>{if(iso(it)&&it.p.sets>2){it.p={...it.p,sets:it.p.sets-1};ch=1}});if(ch)note('Una serie menos en los aislamientos.')}
 if(over()){let ch=0;s.items.forEach(it=>{if(iso(it)&&it.p.rest>45){it.p={...it.p,rest:45};ch=1}});if(ch)note('Descansos de 45 s en los aislamientos.')}
 while(over()&&removeOne());
 // 6) Si aún no cabe, el HIIT de reemplazo también baja de 6 rondas.
 if(over()&&s.cond&&s.cond.rounds>2){const c=s.cond;while(over()&&c.rounds>2){c.rounds--;c.min=Math.max(8,protoMin(c.rounds,c.work,c.rest))}}
 s.overTime=over();return s}

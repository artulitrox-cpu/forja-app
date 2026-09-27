/* Forja: generador de planes, biometría y periodización (sin DOM). Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ---- Utilidades puras ---- */
const rnd=x=>Math.round(x*4)/4;
const fmtKg=w=>(Math.round(w*100)/100).toString().replace('.',',');
function fmtDur(ms){const s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(x).padStart(2,'0')}`:`${m}:${String(x).padStart(2,'0')}`}
function weekStart(){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
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
const daysOf=pr=>(!pr.days||pr.days==='auto')?suggestDays(pr):+pr.days;
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
function wk(u){const c=u.cycle;let abs=Math.round((weekStart()-c.start)/WMS);if(abs<0){c.start=weekStart();abs=0}
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
function genPlan(pr,{swaps={},cyc=0,split=null,nd=daysOf(pr)}={}){
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
const estMin=(u,day)=>Math.round(estimate(u,day).total/60);

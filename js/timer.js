/* Forja: temporizadores (descanso, secuencias guiadas) y pantalla encendida. Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ============ Temporizador de descanso ============ */
let T=null,tInt=null,actx=null;const C=2*Math.PI*19;
function ensureAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
function beep(){try{ensureAudio();[0,.25,.5].forEach((d,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=i===2?1320:880;o.connect(g);g.connect(actx.destination);const t=actx.currentTime+d;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.start(t);o.stop(t+.22)})}catch(e){}}
// Barra fija abajo: no tapa el ejercicio ni impide hacer scroll o anotar las series mientras corre.
function startTimer(sec,next){T={end:Date.now()+sec*1000,dur:sec*1000,next,start:Date.now()};
 $('#timer').innerHTML=`<div class="rdock" role="status" aria-label="Descanso">
  <svg viewBox="0 0 44 44" class="rd-ring" aria-hidden="true"><circle cx="22" cy="22" r="19" class="rd-track"/><circle id="tprog" cx="22" cy="22" r="19" class="rd-prog" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 22 22)"/></svg>
  <span class="flex-1 min-w-0"><span class="block text-xs text-dim font-semibold">Descanso</span><span id="tt" class="rd-time tabular-nums">${fmtDur(sec*1000)}</span><span class="block text-xs truncate">${esc(next)}</span><span id="trh" class="block text-xs truncate" style="color:var(--hard)"></span></span>
  <button class="rd-btn" data-a="tadd" data-n="-15" aria-label="Quitar 15 segundos">−15</button><button class="rd-btn" data-a="tadd" data-n="15" aria-label="Añadir 15 segundos">+15</button><button class="rd-btn rd-skip" data-a="tskip" aria-label="Saltar descanso">${typeof ic==='function'?ic('close',18):'×'}</button></div>`;
 document.body.classList.add('has-dock');clearInterval(tInt);tInt=setInterval(tickTimer,200);tickTimer()}
// Descanso inteligente: con pulsómetro, la siguiente serie empieza cuando el pulso baja de 115 ppm (mínimo 30 s).
function smartRestOn(){const u=typeof U==='function'?U():null;return typeof HR!=='undefined'&&HR.state==='on'&&!(u&&u.settings&&u.settings.smartRest===false)}
function tickTimer(){if(!T)return;const rem=T.end-Date.now();if(rem<=0){endTimer(true);return}
 const sm=smartRestOn(),rh=$('#trh');if(rh)rh.textContent=sm?`♥ ${HR.bpm||'--'} ppm · sigue al bajar de ${SMART_REST_BPM}`:'';
 if(sm&&restReady(HR.bpm,(Date.now()-T.start)/1000)){endTimer(true,'Pulso recuperado: siguiente serie.');return}
 const tt=$('#tt'),tp=$('#tprog');if(tt)tt.textContent=fmtDur(rem+999);if(tp)tp.setAttribute('stroke-dashoffset',C*(1-rem/T.dur))}
function endTimer(done,msg){clearInterval(tInt);if(done&&T){beep();try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}toast(msg||'Descanso terminado. A por la siguiente serie.')}T=null;$('#timer').innerHTML='';document.body.classList.remove('has-dock')}
// Avisos de zona: como mucho uno por minuto. Subir = tres vibraciones cortas; bajar = dos largas.
let lastZoneAlert=0;const ZW={k:'',since:0};
function zoneCue(msg,up){if(Date.now()-lastZoneAlert<60000/FAST)return;lastZoneAlert=Date.now();beep();try{navigator.vibrate&&navigator.vibrate(up?[120,80,120,80,120]:[300,150,300])}catch(e){}toast(msg)}
// Avisa si llevas 1 min seguido por encima (baja) o por debajo (sube) de la zona objetivo lo–hi.
// grace: segundos del tramo en los que no se pide subir, porque el pulso tarda en llegar.
function zoneWatch(z,lo,hi,elapsed=Infinity,grace=0){const k=!z?'':z.z>hi?'hi':z.z<lo&&elapsed>=grace?'lo':'';
 if(k!==ZW.k){ZW.k=k;ZW.since=Date.now();return}
 if(!k||Date.now()-ZW.since<60000/FAST)return;ZW.since=Date.now();
 zoneCue(k==='hi'?`Llevas 1 min en Z${z.z}: baja el ritmo hasta Z${hi}.`:`Vas en Z${z.z}: sube el ritmo hasta Z${lo}.`,k==='lo')}
const zoneTxt=(lo,hi,pr)=>{const a=zoneBpm(lo,pr),b=zoneBpm(hi,pr);return `Z${lo}${hi>lo?'–Z'+hi:''}${a&&b?` (${a[0]}–${b[1]} ppm)`:''}`};

/* ============ Temporizador de secuencia (movilidad, estiramientos, LISS y HIIT) ============ */
// ?fast=1 en la URL divide los tiempos entre 20 para probar la app.
const FAST=/[?&]fast=1/.test(location.search)?20:1;
const SEQ={phases:null,i:0,end:0,paused:null,onDone:null,title:''};
let seqInt=null,wakeLock=null;
// Mantiene la pantalla encendida mientras hay un temporizador (si el navegador lo permite).
async function keepAwake(on){try{
 if(on){if(!wakeLock&&navigator.wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null})}}
 else if(wakeLock){const w=wakeLock;wakeLock=null;await w.release()}}catch(e){wakeLock=null}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&(SEQ.phases||T))keepAwake(true)});
const phaseMs=i=>SEQ.phases[i].sec*1000/FAST;
// Cada tramo puede llevar zona objetivo: zt=[lo, hi] (con grace en segundos) se vigila durante el tramo;
// peak=zona mínima a alcanzar en un intervalo fuerte, que se comprueba al terminarlo.
function seqStart(phases,{title,onDone}){if(!phases.length)return;
 Object.assign(SEQ,{phases,i:0,title,onDone,paused:null,from:Date.now()});SEQ.end=Date.now()+phaseMs(0);ZW.k='';
 ensureAudio();keepAwake(true);seqRender();clearInterval(seqInt);seqInt=setInterval(seqTick,200)}
function seqTick(){if(!SEQ.phases)return;const rem=SEQ.paused??(SEQ.end-Date.now());if(rem<=0){seqNext();return}
 const t=$('#sq-t');if(t)t.textContent=fmtDur(rem+999);
 const hr=$('#sq-hr'),ph=SEQ.phases[SEQ.i];if(hr&&typeof HR!=='undefined'){const u=U(),on=HR.state==='on'&&!!u,z=on?hrZoneOf(HR.bpm,u.profile):null;
  hr.textContent=on?`♥ ${HR.bpm||'--'} ppm${z?` · Z${z.z} ${z.name}`:''}${ph.zt?` · objetivo ${zoneTxt(ph.zt[0],ph.zt[1],u.profile)}`:''}`:'';
  if(ph.zt&&SEQ.paused==null)zoneWatch(z,ph.zt[0],ph.zt[1],(phaseMs(SEQ.i)-rem)*FAST/1000,ph.grace||0)}
 const b=$('#sq-bar');if(b)b.style.width=Math.min(100,100-rem/phaseMs(SEQ.i)*100)+'%'}
// Al terminar un intervalo fuerte (desde la 2.ª ronda, cuando el pulso ya ha subido): si no llegaste a la zona, pide más.
function peakCheck(i){const ph=SEQ.phases[i];if(!ph.peak||typeof HR==='undefined'||!U()||Date.now()-SEQ.from<phaseMs(i)*.8)return;
 const st=hrStats(SEQ.from),z=st&&hrZoneOf(st.max,U().profile);
 if(z&&z.z<ph.peak)zoneCue(`Más fuerte en el siguiente intervalo: llegaste a Z${z.z} y el objetivo es Z${ph.peak}.`,true)}
function seqNext(){if(!SEQ.phases)return;peakCheck(SEQ.i);SEQ.i++;if(SEQ.i>=SEQ.phases.length){seqStop(true);return}
 beep();try{navigator.vibrate&&navigator.vibrate(180)}catch(e){}
 SEQ.end=Date.now()+phaseMs(SEQ.i);SEQ.from=Date.now();SEQ.paused=null;ZW.k='';seqRender()}
function seqStop(done){if(!SEQ.phases)return;clearInterval(seqInt);const cb=SEQ.onDone;SEQ.phases=null;SEQ.onDone=null;$('#seq').innerHTML='';
 if(!T)keepAwake(false);if(done){beep();cb&&cb()}}
function seqPause(){if(!SEQ.phases)return;if(SEQ.paused==null)SEQ.paused=SEQ.end-Date.now();else{SEQ.end=Date.now()+SEQ.paused;SEQ.paused=null}seqRender()}
function seqAdd(sec){if(!SEQ.phases)return;if(SEQ.paused!=null)SEQ.paused+=sec*1000;else SEQ.end+=sec*1000;seqTick()}
function seqRender(){const ph=SEQ.phases[SEQ.i],n=SEQ.phases.length,nx=SEQ.phases[SEQ.i+1];
 const bg=ph.kind==='work'?'var(--hard)':ph.kind==='rest'?'var(--easy)':'var(--bg)',ink=ph.kind==='neutral'?'var(--fg)':'#0b0f16';
 $('#seq').innerHTML=`<div class="seq" style="background:${bg};color:${ink}" role="dialog" aria-modal="true" aria-label="${esc(SEQ.title)}">
  <p class="font-semibold" style="opacity:.8">${esc(SEQ.title)} · ${SEQ.i+1} de ${n}</p>
  <p class="seq-lbl" aria-live="assertive">${esc(ph.label)}</p>${ph.sub?`<p class="text-lg font-semibold mt-1">${esc(ph.sub)}</p>`:''}${ph.img&&typeof guidePhoto==='function'&&GUIDE_PHOTO[ph.img]?guidePhoto(ph.img,'seq-ph',ph.label):''}
  <p id="sq-t" class="seq-time tabular-nums">${fmtDur((SEQ.paused??(SEQ.end-Date.now()))+999)}</p>
  <p id="sq-hr" class="font-semibold mt-1"></p>
  <div class="seq-track"><div id="sq-bar" class="seq-bar"></div></div>
  <p class="mt-3" style="opacity:.8">${nx?`Después: ${esc(nx.label)}`:'Último tramo'}</p>
  <div class="grid grid-cols-3 gap-2 mt-6 w-full" style="max-width:24rem"><button class="seq-btn" data-a="sqpause">${SEQ.paused!=null?'Seguir':'Pausa'}</button><button class="seq-btn" data-a="sqadd">+15 s</button><button class="seq-btn" data-a="sqskip">Saltar</button></div>
  <button class="seq-btn mt-2 w-full" style="max-width:24rem" data-a="sqexit">Salir del temporizador</button>
  <p class="text-xs mt-4" style="opacity:.75;max-width:20rem">La pantalla se mantiene encendida. Si bloqueas el teléfono, los pitidos pueden no sonar.</p></div>`;
 seqTick()}

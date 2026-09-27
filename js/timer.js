/* Forja: temporizadores (descanso, secuencias guiadas) y pantalla encendida. Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ============ Temporizador de descanso ============ */
let T=null,tInt=null,actx=null;const C=2*Math.PI*90;
function ensureAudio(){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}catch(e){}}
function beep(){try{ensureAudio();[0,.25,.5].forEach((d,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.frequency.value=i===2?1320:880;o.connect(g);g.connect(actx.destination);const t=actx.currentTime+d;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.3,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.2);o.start(t);o.stop(t+.22)})}catch(e){}}
function startTimer(sec,next){T={end:Date.now()+sec*1000,dur:sec*1000,next};
 const bolts=Array.from({length:8},(_,i)=>{const an=i*Math.PI/4;return `<circle cx="${110+100*Math.cos(an)}" cy="${110+100*Math.sin(an)}" r="2.5" class="pl-bolt"/>`}).join('');
 $('#timer').innerHTML=`<div class="tlayer"><div class="tsheet" role="dialog" aria-modal="true" aria-label="Descanso"><p class="text-dim font-semibold">Descanso</p>
  <svg viewBox="0 0 220 220" class="plate" aria-hidden="true"><circle cx="110" cy="110" r="108" class="pl-body"/>${bolts}<circle cx="110" cy="110" r="90" class="pl-track"/><circle id="tprog" cx="110" cy="110" r="90" class="pl-prog" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/><circle cx="110" cy="110" r="76" class="pl-face"/><text id="tt" x="110" y="130" text-anchor="middle" class="pl-time">${fmtDur(sec*1000)}</text></svg>
  <p class="mt-3 font-semibold" aria-live="polite">${esc(next)}</p>
  <div class="flex gap-2 mt-5"><button class="btn-ghost flex-1" data-a="tadd" data-n="-15">−15 s</button><button class="btn-ghost flex-1" data-a="tadd" data-n="15">+15 s</button></div>
  <button class="btn-primary w-full mt-3" data-a="tskip">Saltar descanso</button></div></div>`;
 clearInterval(tInt);tInt=setInterval(tickTimer,200);tickTimer()}
function tickTimer(){if(!T)return;const rem=T.end-Date.now();if(rem<=0){endTimer(true);return}
 const tt=$('#tt'),tp=$('#tprog');if(tt)tt.textContent=fmtDur(rem+999);if(tp)tp.setAttribute('stroke-dashoffset',C*(1-rem/T.dur))}
function endTimer(done){clearInterval(tInt);if(done&&T){beep();try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}toast('Descanso terminado. A por la siguiente serie.')}T=null;$('#timer').innerHTML=''}

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
function seqStart(phases,{title,onDone}){if(!phases.length)return;
 Object.assign(SEQ,{phases,i:0,title,onDone,paused:null});SEQ.end=Date.now()+phaseMs(0);
 ensureAudio();keepAwake(true);seqRender();clearInterval(seqInt);seqInt=setInterval(seqTick,200)}
function seqTick(){if(!SEQ.phases)return;const rem=SEQ.paused??(SEQ.end-Date.now());if(rem<=0){seqNext();return}
 const t=$('#sq-t');if(t)t.textContent=fmtDur(rem+999);const b=$('#sq-bar');if(b)b.style.width=Math.min(100,100-rem/phaseMs(SEQ.i)*100)+'%'}
function seqNext(){if(!SEQ.phases)return;SEQ.i++;if(SEQ.i>=SEQ.phases.length){seqStop(true);return}
 beep();try{navigator.vibrate&&navigator.vibrate(180)}catch(e){}
 SEQ.end=Date.now()+phaseMs(SEQ.i);SEQ.paused=null;seqRender()}
function seqStop(done){if(!SEQ.phases)return;clearInterval(seqInt);const cb=SEQ.onDone;SEQ.phases=null;SEQ.onDone=null;$('#seq').innerHTML='';
 if(!T)keepAwake(false);if(done){beep();cb&&cb()}}
function seqPause(){if(!SEQ.phases)return;if(SEQ.paused==null)SEQ.paused=SEQ.end-Date.now();else{SEQ.end=Date.now()+SEQ.paused;SEQ.paused=null}seqRender()}
function seqAdd(sec){if(!SEQ.phases)return;if(SEQ.paused!=null)SEQ.paused+=sec*1000;else SEQ.end+=sec*1000;seqTick()}
function seqRender(){const ph=SEQ.phases[SEQ.i],n=SEQ.phases.length,nx=SEQ.phases[SEQ.i+1];
 const bg=ph.kind==='work'?'var(--hard)':ph.kind==='rest'?'var(--easy)':'var(--bg)',ink=ph.kind==='neutral'?'var(--fg)':'#0b0f16';
 $('#seq').innerHTML=`<div class="seq" style="background:${bg};color:${ink}" role="dialog" aria-modal="true" aria-label="${esc(SEQ.title)}">
  <p class="font-semibold" style="opacity:.8">${esc(SEQ.title)} · ${SEQ.i+1} de ${n}</p>
  <p class="seq-lbl" aria-live="assertive">${esc(ph.label)}</p>${ph.sub?`<p class="text-lg font-semibold mt-1">${esc(ph.sub)}</p>`:''}
  <p id="sq-t" class="seq-time tabular-nums">${fmtDur((SEQ.paused??(SEQ.end-Date.now()))+999)}</p>
  <div class="seq-track"><div id="sq-bar" class="seq-bar"></div></div>
  <p class="mt-3" style="opacity:.8">${nx?`Después: ${esc(nx.label)}`:'Último tramo'}</p>
  <div class="grid grid-cols-3 gap-2 mt-6 w-full" style="max-width:24rem"><button class="seq-btn" data-a="sqpause">${SEQ.paused!=null?'Seguir':'Pausa'}</button><button class="seq-btn" data-a="sqadd">+15 s</button><button class="seq-btn" data-a="sqskip">Saltar</button></div>
  <button class="seq-btn mt-2 w-full" style="max-width:24rem" data-a="sqexit">Salir del temporizador</button>
  <p class="text-xs mt-4" style="opacity:.75;max-width:20rem">La pantalla se mantiene encendida. Si bloqueas el teléfono, los pitidos pueden no sonar.</p></div>`;
 seqTick()}

/* Forja: ventana flotante (picture-in-picture) en la app de Android. Script clásico: comparte variables globales.
   Con un temporizador guiado (cardio, movilidad, estiramientos), un descanso entre series o una grabación en vivo, al ir
   a inicio Forja queda en una ventana pequeña con el tiempo, el pulso y la zona. Mientras está ahí (o en segundo plano),
   los avisos también llegan como notificación emergente. Plugin nativo: android/.../PipPlugin.java. */
let pipPlugin,pipMode=false,pipAutoOn=null,pipInt=null,pipCan=false,pipAlertN=0,pipChannel=false;
const nativePip=()=>{if(pipPlugin!==undefined)return pipPlugin;
 pipPlugin=typeof isNativeApp==='function'&&isNativeApp()&&window.Capacitor&&Capacitor.registerPlugin?Capacitor.registerPlugin('ForjaPip'):null;
 if(pipPlugin)pipPlugin.isSupported().then(r=>{pipCan=!!(r&&r.supported)}).catch(()=>{pipPlugin=null});return pipPlugin};
const pipWanted=()=>!!(SEQ.phases||T||(typeof U==='function'&&U()&&U().live));
// Cada segundo: le dice a Android si al ir a inicio debe abrir la ventana flotante (solo cuando cambia).
function pipSync(){const P=nativePip();if(!P)return;const w=pipWanted();if(w===pipAutoOn)return;pipAutoOn=w;P.setAuto({enabled:w}).catch(()=>{pipAutoOn=null})}
async function pipEnter(){const P=nativePip();if(!P)return;try{await P.setAuto({enabled:true});pipAutoOn=true;await P.enter()}catch(e){}}
window.addEventListener('forjapip',e=>{pipMode=!!e.pip;document.body.classList.toggle('pip',pipMode);clearInterval(pipInt);pipRender();if(pipMode)pipInt=setInterval(pipRender,500)});
setInterval(pipSync,1000);
// Botón para minimizar a mano (solo en la app de Android con ventana flotante disponible).
const pipBtn=(cls='',style='')=>nativePip()&&pipCan?`<button class="${cls}" ${style?`style="${style}"`:''} data-a="pipenter">${typeof ic==='function'?ic('pip',18):''}Ventana flotante</button>`:'';

// Contenido de la ventana: tiempo grande, pulso y zona, y la zona objetivo del tramo.
function pipRender(){const el=$('#pip');if(!el)return;if(!pipMode){el.innerHTML='';return}
 const u=U(),on=typeof HR!=='undefined'&&HR.state==='on',z=on&&u?hrZoneOf(HR.bpm,u.profile):null,hr=on?`♥ ${HR.bpm||'--'}${z?` · Z${z.z}`:''}`:'';
 let title='Forja',time='',sub='',bg='var(--bg)',ink='var(--fg)';
 if(SEQ.phases){const ph=SEQ.phases[SEQ.i],rem=SEQ.paused??(SEQ.end-Date.now());title=ph.label;time=fmtDur(Math.max(0,rem)+999);
  sub=ph.zt&&u?`Objetivo ${zoneTxt(ph.zt[0],ph.zt[1],u.profile)}`:ph.sub||'';if(SEQ.paused!=null)sub='En pausa';
  if(ph.kind!=='neutral'){bg=ph.kind==='work'?'var(--hard)':'var(--easy)';ink='#0b0f16'}}
 else if(T){title='Descanso';time=fmtDur(Math.max(0,T.end-Date.now())+999);sub=T.next||''}
 else if(u&&u.live){title=sportName(u.live);time=fmtDur(Date.now()-u.live.start);sub=on||!hrSaved()?'':'Buscando pulsómetro…'}
 el.innerHTML=`<div class="pipbox" style="background:${bg};color:${ink}"><b class="pip-t">${esc(title)}</b>${time?`<span class="pip-time tabular-nums">${time}</span>`:''}${hr?`<span class="pip-hr" style="color:${z&&ph0()?ZONE_COL[z.z]:'inherit'}">${esc(hr)}</span>`:''}${sub?`<span class="pip-sub">${esc(sub)}</span>`:''}</div>`}
// El color de zona solo sobre fondo neutro (en los intervalos el fondo ya es de color).
const ph0=()=>!SEQ.phases||SEQ.phases[SEQ.i].kind==='neutral';

// Aviso fuera de la pantalla de Forja: notificación emergente (canal de prioridad alta, con vibración).
async function pipAlert(msg){if(!(pipMode||document.visibilityState==='hidden'))return;const L=typeof nativeLN==='function'?nativeLN():null;if(!L)return;
 const txt=typeof tr==='function'?tr(msg):msg;
 try{if(!pipChannel){await L.createChannel({id:'forja-alerts',name:tr('Avisos del entrenamiento'),description:tr('Zona de pulso, descansos y cambios de tramo'),importance:4,vibration:true});pipChannel=true}
  await L.schedule({notifications:[{id:2000+(pipAlertN++%3),title:'Forja',body:txt,channelId:'forja-alerts',smallIcon:'ic_stat_forja'}]})}catch(e){}}
// Al empezar un temporizador o una grabación en la app: pide el permiso de notificaciones si aún no se ha pedido.
async function pipPrepare(){const L=isNativeApp()&&typeof nativeLN==='function'?nativeLN():null;if(!L)return;
 try{const p=await L.checkPermissions();if(p.display==='prompt'||p.display==='prompt-with-rationale')await L.requestPermissions()}catch(e){}}

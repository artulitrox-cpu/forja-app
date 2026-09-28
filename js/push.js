/* Forja: notificaciones push (Web Push + Supabase). Script clásico.
   La app calcula los avisos de los próximos 7 días (upcomingReminders, sin DOM) y los guarda en la tabla
   push_reminders; la función send-reminders de Supabase los envía cada 15 minutos a las suscripciones del usuario. */

// Clave pública VAPID (la privada está solo en los secretos de la función de Supabase).
const VAPID_PUBLIC='BNzvfMssZKEhR9hWQHkp2WiNvb_qkM_spQtg5uTFKnYh-_UtO_OhutZGiRtyw19FMZUBL2f3eC2WW4mnnpe1fSk';
const pushSupported=()=>typeof navigator!=='undefined'&&'serviceWorker' in navigator&&typeof window!=='undefined'&&'PushManager' in window&&'Notification' in window;
const pushCfg=u=>({on:false,hour:8,...((u.settings&&u.settings.push)||{})});
// Avisos de los próximos días: [{at, title, body, tag}] (at en ms).
function upcomingReminders(u,now=Date.now(),days=7){const cfg=pushCfg(u);if(!cfg.on)return [];const out=[];
 const at=(d,h)=>{const x=new Date(d);x.setHours(h,0,0,0);return x.getTime()};
 for(let i=0;i<days;i++){const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()+i);const t=d.getTime(),ws=weekStartOf(t),wd=weekday(t),key=weekKey(t);
  const e=weekSchedule(u,ws).find(x=>x.wd===wd),when=at(t,cfg.hour);if(!e||e.done||when<=now)continue;
  if(e.type==='strength'||e.type==='cardio')out.push({at:when,title:`Hoy toca: ${entryTitleTxt(e)}`,body:'Tu sesión de hoy te espera en Forja.',tag:`train-${key}`});
  if(e.type==='match')out.push({at:when,title:`Hoy juegas ${e.name}`,body:'Graba el partido en vivo o regístralo al terminar.',tag:`match-${key}`})}
 const last=(u.checkins||[])[0],end=now+days*864e5;
 // Check-in: el día que toca a las 9:00; si ya pasó, la próxima vez que sean las 9:00.
 if(last){let w=at(last.date+(u.checkinEvery||14)*864e5,9);if(w<=now)w=at(now,9)>now?at(now,9):at(now+864e5,9);if(w<end)out.push({at:w,title:'Toca check-in biométrico',body:'Pésate o hazte un escaneo para ajustar calorías y cargas.',tag:`checkin-${weekKey(w)}`})}
 (typeof activeInjuries==='function'?activeInjuries(u):[]).forEach(i=>{const w=Math.max(at(i.reviewAt,9),i.reviewAt);if(w>now&&w<end)out.push({at:w,title:`¿Cómo va tu molestia en ${i.muscle}?`,body:'Ya ha pasado el tiempo estimado de recuperación. Revisa si estás recuperado.',tag:`injury-${i.id}`})});
 // Se guardan en el idioma de la app (la notificación la envía el servidor tal cual).
 return out.sort((a,b)=>a.at-b.at).map(x=>typeof tr==='function'?{...x,title:tr(x.title),body:tr(x.body)}:x)}
const entryTitleTxt=e=>e.type==='cardio'?'Cardio':e.name;
/* ---- Suscripción (navegador + Supabase) ---- */
function b64uToU8(s){const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function pushSubscription(){if(!pushSupported())return null;const reg=await navigator.serviceWorker.ready;return reg.pushManager.getSubscription()}
// Pide permiso, suscribe este dispositivo y lo guarda en Supabase. Devuelve '' si va bien o el motivo del fallo.
async function pushEnable(){if(!pushSupported())return 'Este navegador no admite notificaciones push. En iPhone, instala Forja en la pantalla de inicio primero.';
 if(!sb||!sbUser)return 'Inicia sesión en Mi perfil > Cuenta y sincronización para activar las notificaciones.';
 const perm=await Notification.requestPermission();if(perm!=='granted')return 'Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para Forja.';
 try{const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64uToU8(VAPID_PUBLIC)});
  const j=sub.toJSON(),{error}=await sb.from('push_subscriptions').upsert({endpoint:j.endpoint,user_id:sbUser.id,p256dh:j.keys.p256dh,auth:j.keys.auth,ua:navigator.userAgent.slice(0,200)},{onConflict:'endpoint'});
  if(error)throw error;return ''}
 catch(e){return /push_subscriptions|42P01|PGRST205/.test(String(e&&e.message||e))?'Falta preparar Supabase: ejecuta supabase/push.sql (ver README).':'No se pudo activar: '+(e&&e.message||e)}}
async function pushDisable(){try{const sub=await pushSubscription();if(sub){if(sb&&sbUser)await sb.from('push_subscriptions').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe()}}catch(e){}
 if(sb&&sbUser)try{await sb.from('push_reminders').delete().eq('user_id',sbUser.id).eq('sent',false)}catch(e){}}
// Reescribe en Supabase los avisos pendientes del usuario activo (solo si han cambiado).
let pushLastSig='';
async function pushSyncReminders(force){const u=typeof U==='function'?U():null;if(!u||!sb||!sbUser||!pushCfg(u).on)return;
 const list=upcomingReminders(u),sig=JSON.stringify(list);if(!force&&sig===pushLastSig)return;
 try{let r=await sb.from('push_reminders').delete().eq('user_id',sbUser.id).eq('sent',false);if(r.error)throw r.error;
  if(list.length){r=await sb.from('push_reminders').insert(list.map(x=>({user_id:sbUser.id,at:new Date(x.at).toISOString(),title:x.title,body:x.body,tag:x.tag})));if(r.error)throw r.error}
  pushLastSig=sig}catch(e){}}

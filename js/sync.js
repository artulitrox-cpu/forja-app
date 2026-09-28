/* Forja: sincronización con Supabase. Script clásico: comparte variables globales con el resto de js/*.js e index.html. */

/* ============ Supabase: configuración ============ */
// Pega aquí la Project URL de Supabase (Project Settings > Data API). Ej: https://abcd1234.supabase.co
const SB_URL_DEFAULT='https://cctbebzsroxjhtlaraws.supabase.co';
// Clave publicable: pensada para el navegador; la seguridad la dan las políticas RLS. NUNCA pongas aquí la secret key.
const SB_KEY='sb_publishable_o_7aXOIdrTJDFirkk86hog_cCV0RbbA';
/* ============ Sincronización con Supabase ============ */
let sb=null,sbUser=null,pushT=null,pulling=false;const sync={state:'off',last:0,err:''};
function sbUrl(){if(SB_URL_DEFAULT)return SB_URL_DEFAULT;try{return localStorage.getItem('forja.sburl')||''}catch(e){return ''}}
function sbErr(e){const m=(e&&(e.message||e.error_description))||String(e||'');
 if(/Invalid login/i.test(m))return 'Correo o contraseña incorrectos.';
 if(/not confirmed/i.test(m))return 'Confirma tu correo antes de entrar (revisa la bandeja de entrada).';
 if(/already registered|already been registered/i.test(m))return 'Ese correo ya tiene cuenta: pulsa Entrar.';
 if(/app_state|42P01|PGRST205|schema cache/i.test(m))return 'Falta la tabla app_state en Supabase: ejecuta supabase/schema.sql.';
 if(/Failed to fetch|NetworkError|Load failed/i.test(m))return 'Sin conexión con Supabase. Tus datos siguen guardados en este dispositivo.';
 if(/at least 6/i.test(m))return 'La contraseña necesita al menos 6 caracteres.';
 return m}
function sbInit(){const url=sbUrl();if(!url){sync.state='off';return}
 if(!window.supabase){sync.state='error';sync.err='No se pudo cargar la librería de Supabase.';return}
 try{sb=window.supabase.createClient(url,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'forja.auth'}})}catch(e){sync.state='error';sync.err=sbErr(e);return}
 sync.state='out';
 sb.auth.onAuthStateChange((ev,session)=>{const nu=session?session.user:null,changed=(nu&&nu.id)!==(sbUser&&sbUser.id);sbUser=nu;
  if(!nu){sync.state='out';updSyncDot();softRender();return}
  if(changed)setTimeout(()=>pull(true),0)})}
function mergeState(r){if(!r||!r.users)return false;let changed=false;const del={...(S.deleted||{})};
 Object.entries(r.deleted||{}).forEach(([id,t])=>{if(!(del[id]>=t))del[id]=t});
 // Cada usuario se combina por partes (js/merge.js): historial, actividades, lesiones y check-ins se unen.
 Object.entries(r.users).forEach(([id,ru])=>{if(del[id]>=(ru.updatedAt||0))return;migrateUser(ru);const lu=S.users[id];
  if(!lu){S.users[id]=ru;changed=true;return}const m=mergeUser(lu,ru);if(JSON.stringify(m)!==JSON.stringify(lu)){S.users[id]=m;changed=true}});
 Object.keys(S.users).forEach(id=>{if(del[id]>=(S.users[id].updatedAt||0)){delete S.users[id];changed=true}});
 S.deleted=del;
 if(!S.users[S.activeUser]){S.activeUser=S.users[r.activeUser]?r.activeUser:(Object.keys(S.users)[0]||null);changed=true}
 Object.values(S.users).forEach(u=>{if(migrateUser(u))changed=true});
 return changed}
function schedulePush(){if(!sb||!sbUser)return;clearTimeout(pushT);sync.state='pending';updSyncDot();pushT=setTimeout(push,1500)}
async function push(){if(!sb||!sbUser)return;clearTimeout(pushT);sync.state='syncing';updSyncDot();
 try{const {error}=await sb.from('app_state').upsert({user_id:sbUser.id,data:S,updated_at:new Date().toISOString()});
  if(error)throw error;sync.state='ok';sync.last=Date.now();sync.err=''}catch(e){sync.state='error';sync.err=sbErr(e)}
 updSyncDot();if(view==='profile')softRender()}
async function pull(first){if(!sb||!sbUser||pulling)return;pulling=true;sync.state='syncing';updSyncDot();
 try{const {data,error}=await sb.from('app_state').select('data').eq('user_id',sbUser.id).maybeSingle();if(error)throw error;
  const changed=data?mergeState(data.data):false;
  if(changed){saveLocal();if(view==='onboard'&&U())view='home';softRender();if(first)toast('Datos sincronizados desde la nube')}
  pulling=false;await push()}
 catch(e){pulling=false;sync.state='error';sync.err=sbErr(e);updSyncDot();if(first)toast(sync.err)}}
function softRender(){const a=document.activeElement;if(a&&a.matches&&a.matches('#app input, #app select, #app textarea'))return;if($('#layer').innerHTML)return;render()}
const SYNC_TXT={off:'Sin cuenta: datos solo en este dispositivo',out:'Sin sesión iniciada',pending:'Cambios pendientes de subir',syncing:'Sincronizando…',ok:'Sincronizado',error:'Error de sincronización'};
const SYNC_COL={off:'var(--line)',out:'var(--dim)',pending:'var(--accent)',syncing:'var(--accent)',ok:'var(--easy)',error:'var(--hard)'};
function updSyncDot(){const d=$('#syncdot');if(d){d.style.background=SYNC_COL[sync.state];d.title=SYNC_TXT[sync.state];d.setAttribute('aria-label',SYNC_TXT[sync.state])}const t=$('#synctxt');if(t)t.textContent=syncStatus()}
function syncStatus(){return sync.state==='ok'&&sync.last?`Sincronizado a las ${hhmm(sync.last)}`:sync.state==='error'?sync.err:SYNC_TXT[sync.state]}
function syncCard(compact){
 if(!sbUrl())return `<form data-sbcfg class="flex flex-col gap-3"><p class="text-sm text-dim">Conecta tu proyecto de Supabase para guardar tus datos en la nube y verlos desde cualquier dispositivo.</p><div><label class="lbl" for="sb-url">Project URL de Supabase</label><input id="sb-url" name="url" type="url" class="field" placeholder="https://xxxx.supabase.co" required></div><button class="btn-ghost" type="submit">Guardar conexión</button></form>`;
 if(!sb)return `<p style="color:var(--hard)">${esc(sync.err||'Supabase no disponible.')}</p>`;
 if(!sbUser)return `<form data-auth class="flex flex-col gap-3">${compact?'':'<p class="text-sm text-dim">Entra con la misma cuenta en el móvil y el ordenador para compartir tus datos.</p>'}
  <div><label class="lbl" for="au-email">Correo</label><input id="au-email" name="email" type="email" autocomplete="email" class="field" required></div>
  <div><label class="lbl" for="au-pass">Contraseña</label><input id="au-pass" name="password" type="password" autocomplete="current-password" minlength="6" class="field" required></div>
  <div class="flex gap-2"><button class="btn-primary flex-1" style="min-height:50px" type="submit" value="in">Entrar</button><button class="btn-ghost flex-1" style="min-height:50px" type="submit" value="up">Crear cuenta</button></div></form>`;
 return `<div class="flex items-center gap-3"><span class="dot" id="syncdot2" style="background:${SYNC_COL[sync.state]}"></span><span class="flex-1 min-w-0"><span class="block font-semibold truncate">${esc(sbUser.email||'')}</span><span class="block text-sm text-dim" id="synctxt">${esc(syncStatus())}</span></span></div>
  <div class="flex gap-2 mt-4"><button class="btn-ghost flex-1" data-a="syncnow">Sincronizar ahora</button><button class="btn-text" data-a="logout">Cerrar sesión</button></div>`}
async function doAuth(f,mode){if(!sb)return;const fd=new FormData(f),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');
 f.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const r=mode==='up'?await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await sb.auth.signInWithPassword({email,password});
  if(r.error)throw r.error;if(mode==='up'&&!r.data.session)toast('Cuenta creada. Confirma el correo que te hemos enviado y luego entra.');else toast('Sesión iniciada')}
 catch(e){toast(sbErr(e))}
 f.querySelectorAll('button').forEach(b=>b.disabled=false)}
async function logout(){if(!sb)return;const wipe=confirm('¿Borrar también los datos guardados en este dispositivo? Pulsa Cancelar para conservarlos.');
 await sb.auth.signOut();sbUser=null;sync.state='out';
 if(wipe){S={version:2,activeUser:null,users:{},deleted:{}};saveLocal();view='onboard'}render();toast('Sesión cerrada')}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull()});
setInterval(()=>{if(sbUser&&document.visibilityState==='visible')pull()},90000);

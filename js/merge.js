/* Forja: combinar datos de un usuario entre dispositivos (y al importar una copia). Script clásico, sin DOM.
   Colecciones (historial, actividades, lesiones, check-ins): se unen por clave; lo borrado se recuerda en u.tomb.
   Resto (perfil, plan, cargas, semana…): del dispositivo con el cambio más reciente. */

const MERGE_COLL={history:h=>'h'+h.date,activities:x=>x.id,injuries:x=>x.id,checkins:x=>'c'+x.date};
const TOMB_DAYS=120;
// Anota un borrado para que no reaparezca al sincronizar.
function tombstone(u,key){u.tomb=u.tomb||{};u.tomb[key]=Date.now()}
function mergeUser(a,b){const newer=(b.updatedAt||0)>(a.updatedAt||0)?b:a,older=newer===a?b:a,out={...newer};
 const tomb={...(older.tomb||{})};Object.entries(newer.tomb||{}).forEach(([k,t])=>{if(!(tomb[k]>=t))tomb[k]=t});
 Object.entries(MERGE_COLL).forEach(([coll,key])=>{const map=new Map();
  [older,newer].forEach(src=>(src[coll]||[]).forEach(x=>{const k=key(x),cur=map.get(k);
   if(!cur||(x.upd||0)>(cur.upd||0)||((x.upd||0)===(cur.upd||0)&&src===newer))map.set(k,x)}));
  out[coll]=[...map.entries()].filter(([k])=>!tomb[k]).map(([,x])=>x).sort((x,y)=>(y.date||0)-(x.date||0))});
 // Borrados de hace más de 120 días ya no hacen falta.
 const lim=Math.max(a.updatedAt||0,b.updatedAt||0)-TOMB_DAYS*864e5;Object.keys(tomb).forEach(k=>{if(tomb[k]<lim)delete tomb[k]});
 out.tomb=tomb;out.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);return out}
// Copia de seguridad exportada por Forja: {app:'forja', version, exported, state:{users,...}}.
function validBackup(d){return !!d&&d.app==='forja'&&!!d.state&&typeof d.state.users==='object'&&d.state.users!==null}

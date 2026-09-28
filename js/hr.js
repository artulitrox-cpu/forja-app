/* Forja: pulsómetro Bluetooth (Web Bluetooth, perfiles GATT Heart Rate 0x180D y Battery 0x180F). Script clásico.
   Empareja una vez, recuerda la banda en este navegador y se reconecta sola cuando está cerca y la app visible.
   Cálculos puros (zonas, Keytel, descanso inteligente, resumen en vivo) al final: se prueban en Node. */

const HR_KEY='forja.hr';
// state: off | searching | connecting | on | error. needsTap: el navegador no permite reconectar sin un toque.
const HR={device:null,char:null,bpm:null,battery:null,state:'off',err:'',needsTap:false,listeners:new Set(),samples:[],reconnects:[],lastOn:0};
const hrSupported=()=>typeof navigator!=='undefined'&&!!navigator.bluetooth;
// Heart Rate Measurement (0x2A37): bit 0 de los flags = valor en uint16 (1) o uint8 (0).
function parseHeartRate(dv){const flags=dv.getUint8(0);return flags&1?dv.getUint16(1,true):dv.getUint8(1)}
// Battery Level (0x2A19): un byte, 0–100 %.
const parseBattery=dv=>dv.getUint8(0);
function onHr(cb){HR.listeners.add(cb);return ()=>HR.listeners.delete(cb)}
function hrEmit(){HR.listeners.forEach(cb=>{try{cb(HR)}catch(e){}})}
/* ---- Dispositivo recordado (solo en este navegador) ---- */
function hrSaved(){try{return JSON.parse(localStorage.getItem(HR_KEY)||'null')}catch(e){return null}}
function hrRemember(dev){try{localStorage.setItem(HR_KEY,JSON.stringify({id:dev.id,name:dev.name||''}))}catch(e){}}
function hrForget(){try{localStorage.removeItem(HR_KEY)}catch(e){}hrDisconnect(true)}
/* ---- Conexión ---- */
function hrOnValue(e){const v=parseHeartRate(e.target.value);if(v>20&&v<250){HR.bpm=v;HR.samples.push({t:Date.now(),v});if(HR.samples.length>20000)HR.samples.splice(0,5000)}hrEmit()}
function hrOnBattery(e){HR.battery=parseBattery(e.target.value);hrEmit()}
let hrTimer=null,hrBattTimer=null,hrManual=false;
function hrOnDisconnect(){HR.char=null;HR.bpm=null;clearInterval(hrBattTimer);
 if(hrManual||!hrSaved()){HR.state='off';hrEmit();return}
 HR.state='searching';hrEmit();hrScheduleRetry()}
async function hrAttach(dev){HR.device=dev;HR.state='connecting';HR.err='';hrEmit();
 if(!dev._forja){dev._forja=1;dev.addEventListener('gattserverdisconnected',hrOnDisconnect)}
 const server=await dev.gatt.connect(),svc=await server.getPrimaryService('heart_rate'),ch=await svc.getCharacteristic('heart_rate_measurement');
 HR.char=ch;ch.addEventListener('characteristicvaluechanged',hrOnValue);await ch.startNotifications();
 // Batería: opcional (bandas emparejadas antes de pedir este permiso no la exponen).
 try{const bs=await server.getPrimaryService('battery_service'),bc=await bs.getCharacteristic('battery_level');
  HR.battery=parseBattery(await bc.readValue());
  try{bc.addEventListener('characteristicvaluechanged',hrOnBattery);await bc.startNotifications()}
  catch(e){clearInterval(hrBattTimer);hrBattTimer=setInterval(async()=>{try{HR.battery=parseBattery(await bc.readValue());hrEmit()}catch(x){}},300000)}}
 catch(e){HR.battery=null}
 const was=HR.lastOn;HR.state='on';HR.lastOn=Date.now();if(was)HR.reconnects.push(HR.lastOn);clearTimeout(hrTimer);hrEmit();return true}
// Emparejar (con el selector del navegador). Debe llamarse desde un toque del usuario.
async function hrConnect(){if(!hrSupported()){HR.state='error';HR.err='Tu navegador no permite Bluetooth. Usa Chrome en Android o en el ordenador.';hrEmit();return false}
 hrManual=false;
 try{const dev=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}],optionalServices:['battery_service']});
  hrRemember(dev);HR.needsTap=false;return await hrAttach(dev)}
 catch(e){const cancel=e&&e.name==='NotFoundError';HR.state=cancel?(hrSaved()?'searching':'off'):'error';
  HR.err=cancel?'':'No se pudo conectar el pulsómetro. Revisa que esté encendido y cerca.';hrEmit();return false}}
async function hrDisconnect(forget){hrManual=true;clearTimeout(hrTimer);clearInterval(hrBattTimer);
 try{if(HR.char)await HR.char.stopNotifications()}catch(e){}try{if(HR.device&&HR.device.gatt.connected)HR.device.gatt.disconnect()}catch(e){}
 HR.char=null;HR.bpm=null;HR.state='off';if(forget)HR.device=null;hrEmit()}
// Reconexión automática: busca la banda guardada sin abrir el selector (si el navegador lo permite).
async function hrAuto(){const saved=hrSaved();if(!saved||!hrSupported()||HR.state==='on'||HR.state==='connecting'||hrManual)return;
 if(typeof navigator.bluetooth.getDevices!=='function'){HR.needsTap=true;HR.state='off';hrEmit();return}
 try{const devs=await navigator.bluetooth.getDevices(),dev=devs.find(d=>d.id===saved.id);
  if(!dev){HR.needsTap=true;HR.state='off';hrEmit();return}
  HR.device=dev;HR.state='searching';hrEmit();
  if(typeof dev.watchAdvertisements==='function'&&!dev._forjaAdv){dev._forjaAdv=1;
   dev.addEventListener('advertisementreceived',()=>{if(HR.state!=='on'&&HR.state!=='connecting')hrAttach(dev).catch(()=>{HR.state='searching';hrEmit()})});
   try{await dev.watchAdvertisements()}catch(e){}}
  await hrAttach(dev)}
 catch(e){if(hrSaved()&&!hrManual){HR.state='searching';hrEmit();hrScheduleRetry()}}}
function hrScheduleRetry(){clearTimeout(hrTimer);hrTimer=setTimeout(()=>{if(typeof document==='undefined'||document.visibilityState==='visible')hrAuto();else hrScheduleRetry()},10000)}
function hrResume(){hrManual=false;hrAuto()}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&HR.state!=='on')hrAuto()});
// Media y máxima de las lecturas desde un instante.
function hrStats(since,until=Infinity,samples=HR.samples){const v=samples.filter(s=>s.t>=since&&s.t<=until).map(s=>s.v);if(!v.length)return null;
 return {avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length),max:Math.max(...v)}}

/* ============ Cálculos (sin Bluetooth) ============ */
const hrMax=pr=>+pr.age>0?220-pr.age:null;
const HR_ZONES=[{z:1,name:'Recuperación',lo:0},{z:2,name:'Aeróbica suave',lo:.6},{z:3,name:'Aeróbica',lo:.7},{z:4,name:'Umbral',lo:.8},{z:5,name:'Máximo',lo:.9}];
const ZONE_COL=['','var(--dim)','var(--easy)','var(--normal)','var(--accent)','var(--hard)'];
function hrZoneOf(bpm,pr){const m=hrMax(pr);if(!m||!bpm)return null;const pct=bpm/m;let z=HR_ZONES[0];HR_ZONES.forEach(x=>{if(pct>=x.lo)z=x});return {...z,pct}}
// Keytel et al. (2005): kcal/min según pulso, peso, edad y sexo. Nunca por debajo del gasto en reposo.
function keytelPerMin(bpm,pr){const w=pr.weight>0?pr.weight:70,a=+pr.age>0?+pr.age:30;
 const k=pr.sex==='f'?(-20.4022+.4472*bpm-.1263*w+.074*a)/4.184:(-55.0969+.6309*bpm+.1988*w+.2017*a)/4.184;
 const rest=(typeof bmr==='function'&&bmr(pr)?bmr(pr):1500)/1440;return Math.max(rest,k)}
// Integra las lecturas; cada tramo cuenta como máximo 10 s para que los huecos no sumen.
function kcalFromSamples(samples,pr){let kcal=0,cov=0;const s=[...samples].sort((a,b)=>a.t-b.t);
 for(let i=1;i<s.length;i++){const dt=Math.min(10000,s[i].t-s[i-1].t);if(dt<=0)continue;kcal+=keytelPerMin((s[i].v+s[i-1].v)/2,pr)*dt/60000;cov+=dt}
 return {kcal,coveredMs:cov}}
// Descanso inteligente: siguiente serie cuando el pulso baja de 115 ppm y han pasado al menos 30 s.
const SMART_REST_BPM=115;
const restReady=(bpm,elapsed,thr=SMART_REST_BPM,min=30)=>!!bpm&&bpm<thr&&elapsed>=min;
// RPE propuesto a partir del pulso medio (Z1–2 → 4, Z3 → 6, Z4 → 8, Z5 → 9).
function suggestRpe(avg,pr){const z=hrZoneOf(avg,pr);return z?[4,4,4,6,8,9][z.z]:6}
// Resumen de una grabación en vivo: minutos, pulso, kcal reales (lecturas) + MET para el tiempo sin pulso.
function liveSummary(live,samples,pr,now,rpe){const min=Math.max(1,Math.round((now-live.start)/60000)),own=samples.filter(s=>s.t>=live.start&&s.t<=now);
 const hr=hrStats(live.start,now,own),r=own.length>1?kcalFromSamples(own,pr):{kcal:0,coveredMs:0};
 const gapMin=Math.max(0,(now-live.start-r.coveredMs)/60000),met=typeof activityCalc==='function'?activityCalc({sport:live.sport,type:live.type,min:gapMin,rpe:rpe||suggestRpe(hr&&hr.avg,pr)},pr).kcal:0;
 const kcalReal=r.coveredMs?Math.round(r.kcal):null;
 return {min,hr,kcalReal,kcal:Math.round(r.kcal)+met,coveredMin:Math.round(r.coveredMs/60000),rpe:rpe||suggestRpe(hr&&hr.avg,pr)}}

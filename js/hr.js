/* Forja: pulsómetro Bluetooth (Web Bluetooth API, perfil GATT Heart Rate). Script clásico.
   Preparado para recibir la frecuencia cardíaca en tiempo real; hoy se usa en Perfil y en la sesión (media y máxima). */

const HR={device:null,char:null,bpm:null,state:'off',err:'',listeners:new Set(),samples:[]};
const hrSupported=()=>typeof navigator!=='undefined'&&!!navigator.bluetooth;
// Heart Rate Measurement (0x2A37): bit 0 de los flags = valor en uint16 (1) o uint8 (0).
function parseHeartRate(dv){const flags=dv.getUint8(0);return flags&1?dv.getUint16(1,true):dv.getUint8(1)}
function onHr(cb){HR.listeners.add(cb);return ()=>HR.listeners.delete(cb)}
function hrEmit(){HR.listeners.forEach(cb=>{try{cb(HR)}catch(e){}})}
function hrOnValue(e){const v=parseHeartRate(e.target.value);if(v>20&&v<250){HR.bpm=v;HR.samples.push({t:Date.now(),v});if(HR.samples.length>7200)HR.samples.shift()}hrEmit()}
function hrOnDisconnect(){HR.state='off';HR.bpm=null;HR.char=null;hrEmit()}
// Debe llamarse desde un gesto del usuario (clic): el navegador muestra el selector de dispositivos.
async function hrConnect(){if(!hrSupported()){HR.state='error';HR.err='Tu navegador no permite Bluetooth. Usa Chrome en Android o en el ordenador.';hrEmit();return false}
 try{HR.state='connecting';HR.err='';hrEmit();
  const dev=await navigator.bluetooth.requestDevice({filters:[{services:['heart_rate']}]});
  HR.device=dev;dev.addEventListener('gattserverdisconnected',hrOnDisconnect);
  const server=await dev.gatt.connect(),svc=await server.getPrimaryService('heart_rate'),ch=await svc.getCharacteristic('heart_rate_measurement');
  HR.char=ch;ch.addEventListener('characteristicvaluechanged',hrOnValue);await ch.startNotifications();
  HR.state='on';hrEmit();return true}
 catch(e){HR.state=e&&e.name==='NotFoundError'?'off':'error';HR.err=e&&e.name==='NotFoundError'?'':'No se pudo conectar el pulsómetro. Revisa que esté encendido y cerca.';hrEmit();return false}}
async function hrDisconnect(){try{if(HR.char)await HR.char.stopNotifications()}catch(e){}try{if(HR.device&&HR.device.gatt.connected)HR.device.gatt.disconnect()}catch(e){}hrOnDisconnect()}
// Media y máxima de las lecturas desde un instante (para guardar en la sesión).
function hrStats(since){const v=HR.samples.filter(s=>s.t>=since).map(s=>s.v);if(!v.length)return null;return {avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length),max:Math.max(...v)}}

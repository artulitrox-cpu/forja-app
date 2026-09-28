// Prueba de humo: abre la app en Chromium (Playwright), recorre todas las pantallas y flujos principales
// y falla si aparece cualquier error en la consola o una excepción. Se ejecuta en GitHub Actions antes de publicar.
// Uso: node tools/smoke.js   (requiere el paquete "playwright" y Chromium instalados)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css' };
// Errores del entorno de prueba que no son fallos de la app.
const IGNORE = [/navigator\.vibrate/i, /Failed to load resource/i, /ERR_INTERNET_DISCONNECTED/i];

function serve() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

// Flujos dentro de la página (usa las funciones globales de la app).
async function flows(page) {
  return page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const done = [];
    localStorage.clear();
    S = { version: 2, activeUser: null, users: {}, deleted: {} };
    createUser({ name: 'Smoke', age: 35, sex: 'm', height: 178, weight: 82, level: 'int', goal: 'fat', avail: [0, 1, 2, 3, 4, 5], sessionMin: 60, equip: 'gym' });
    const u = U();
    for (const v of ['home', 'plan', 'body', 'injuries', 'history', 'profile']) { view = v; render(); }
    done.push('vistas');
    // Semana dinámica
    const ws = weekStart(), td = weekday(Date.now());
    u.profile.sports = [{ sport: 'futsal', wd: (td + 2) % 7 }];
    skipDay(u, ws, td); addExtra(u, ws, 6); setMatch(u, ws, (td + 1) % 7, 'football');
    view = 'home'; render(); view = 'plan'; render(); openDayActions(td); closeModal();
    weekEdit(u, ws).log.slice().forEach((l) => undoChange(u, ws, l.id));
    done.push('semana');
    // Sesión completa por bloques
    const e = weekSchedule(u).find((x) => x.type === 'strength');
    startSession(e);
    const a = u.active;
    for (const st of stagesOf(a)) {
      a.stage = st; render();
      if (st === 'str') a.items.forEach((it, i) => { a.cur = i; render(); it.sets.forEach((_, k) => { rate(k, 'ok'); endTimer(false); }); });
      if (st === 'cond') { a.cond.done = true; a.cond.rt = 'ok'; }
      if (st === 'mob' || st === 'stretch') a[st].done = true;
    }
    finish(); closeModal();
    done.push('sesión');
    // Lesión
    injDraft = { muscle: 'Cuádriceps', pain: 5, mob: 1, infl: 0, rest: 0, flags: [] };
    showTriage(); A.injsave();
    view = 'injuries'; render(); injRegion = 'legs'; render(); injRegion = null;
    view = 'home'; render();
    done.push('lesiones');
    // Actividad y grabación en vivo (pulsómetro simulado)
    const act = addActivity(u, { sport: 'futsal', type: 'field', min: 60, rpe: 8 }); showActivityResult(act); closeModal();
    HR.state = 'on'; HR.bpm = 140; HR.battery = 80; hrEmit();
    u.live = { sport: 'futsal', type: 'field', start: Date.now() - 600000, reconnects: [], hadHr: true };
    for (let i = 0; i < 300; i++) HR.samples.push({ t: u.live.start + i * 2000, v: 140 });
    view = 'live'; render(); updLive();
    HR.state = 'searching'; hrEmit(); HR.state = 'on'; hrEmit();
    openLiveFinish(); finishLive(document.querySelector('form[data-livefin]')); closeModal();
    startTimer(60, 'x'); tickTimer(); endTimer(false);
    done.push('actividad en vivo');
    // Notificaciones activadas: la tarjeta lista los próximos avisos
    U().settings = { ...(U().settings || {}), push: { on: true, hour: 8 } }; view = 'profile'; render();
    if (!upcomingReminders(U()).length) throw new Error('Sin avisos calculados');
    done.push('notificaciones');
    // Copia de seguridad: exportar el estado e importarlo de nuevo (se combina sin duplicar)
    window.confirm = () => true;
    const before = U().activities.length;
    const copy = { app: 'forja', version: 2, exported: new Date().toISOString(), state: JSON.parse(JSON.stringify(S)) };
    await importBackup(new File([JSON.stringify(copy)], 'copia.json', { type: 'application/json' }));
    if (U().activities.length !== before) throw new Error('La importación duplicó actividades');
    done.push('copia de seguridad');
    for (const v of ['home', 'plan', 'body', 'injuries', 'history', 'profile']) { view = v; render(); }
    await wait(300);
    return done;
  });
}

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const errors = [];
  const watch = (page) => {
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e && e.stack || e)));
  };
  try {
    // 1) Usuario nuevo: todos los flujos
    const page = await ctx.newPage(); watch(page);
    await page.goto(`${base}/?fast=1`, { waitUntil: 'load' });
    const done = await flows(page);
    console.log('Flujos:', done.join(', '));
    // 2) Datos de la versión 1: la migración no debe romper nada
    await page.evaluate(() => localStorage.setItem('forja.v1', JSON.stringify({ version: 1, activeUser: 'u1', deleted: {}, users: { u1: {
      id: 'u1', profile: { name: 'V1', age: 30, sex: 'f', height: 165, weight: 60, level: 'int', goal: 'fat', days: 4, equip: 'gym' },
      plan: { split: 'ppl', weekdays: [], days: [{ key: 'push', name: 'Empuje A', focus: 'x', items: [{ slot: 'chest_press', ex: 'bench_db' }] }] },
      prog: {}, history: [], next: 0, active: null, created: Date.now(), cycle: { start: Date.now(), len: 4, seen: -1, applied: 0, nextBoost: 1 }, checkins: [], checkinEvery: 14 } } })));
    await page.reload({ waitUntil: 'load' });
    await page.evaluate(() => { for (const v of ['home', 'plan', 'body', 'injuries', 'history', 'profile']) { view = v; render(); } });
    console.log('Migración v1: ok');
    // 3) App de Android (Capacitor) simulada: todas las vistas y el pulsómetro/grabación con plugins falsos
    const nat = await ctx.newPage(); watch(nat);
    // Como en el WebView de Android: sin Web Bluetooth (navigator.bluetooth no existe).
    await nat.addInitScript(() => { window.Capacitor = { isNativePlatform: () => true, Plugins: {}, getPlatform: () => 'android' }; Object.defineProperty(Navigator.prototype, 'bluetooth', { get: () => undefined, configurable: true }); });
    await nat.goto(`${base}/?fast=1`, { waitUntil: 'load' });
    const natDone = await nat.evaluate(async () => {
      // El núcleo de Capacitor sustituye window.Capacitor al cargar; fuera de Android se declara web. Se fuerza el modo nativo.
      window.Capacitor.isNativePlatform = () => true;
      let hrCb = null, onDisc = null;
      window.capacitorCommunityBluetoothLe = { BleClient: {
        initialize: async () => {}, requestDevice: async () => ({ deviceId: 'AA:BB', name: 'Banda' }),
        connect: async (id, d) => { onDisc = d; }, startNotifications: async (id, s, c, cb) => { if (c.includes('2a37')) hrCb = cb; },
        read: async () => new DataView(new Uint8Array([80]).buffer), stopNotifications: async () => {}, disconnect: async () => {} } };
      const fgs = []; window.capacitorForegroundService = { ForegroundService: {
        requestPermissions: async () => {}, createNotificationChannel: async () => {}, startForegroundService: async () => fgs.push('start'),
        updateForegroundService: async () => {}, stopForegroundService: async () => fgs.push('stop') } };
      localStorage.clear(); S = { version: 2, activeUser: null, users: {}, deleted: {} };
      createUser({ name: 'Nativa', age: 30, sex: 'm', height: 175, weight: 75, level: 'beg', goal: 'hyp', avail: [0, 2, 4], sessionMin: 60, equip: 'gym' });
      for (const v of ['home', 'plan', 'body', 'injuries', 'history', 'profile']) { view = v; render(); }
      if (!(await hrConnect())) throw new Error('No conecta el pulsómetro nativo');
      hrCb(new DataView(new Uint8Array([0, 120]).buffer));
      view = 'profile'; render();
      const u = U(); view = 'home'; render();
      document.querySelector('[data-a=livepick]').click(); document.querySelector('form[data-live]').requestSubmit();
      await new Promise((r) => setTimeout(r, 100));
      onDisc('AA:BB'); clearTimeout(hrTimer); await hrAuto();
      openLiveFinish(); finishLive(document.querySelector('form[data-livefin]')); closeModal();
      await new Promise((r) => setTimeout(r, 100));
      if (fgs.join() !== 'start,stop') throw new Error('Servicio en primer plano: ' + fgs.join());
      return 'ok';
    });
    console.log('App nativa (simulada):', natDone);
  } catch (e) {
    errors.push(String(e && e.stack || e));
  } finally {
    await browser.close();
    srv.close();
  }
  if (errors.length) { console.error(`\n✖ ${errors.length} error(es):\n` + errors.map((e) => ' - ' + e.split('\n').slice(0, 3).join('\n   ')).join('\n')); process.exit(1); }
  console.log('✔ Prueba de humo sin errores');
})();

// Prueba de humo: abre la app en Chromium (Playwright), recorre todas las pantallas y flujos principales
// y falla si aparece cualquier error en la consola o una excepción. Se ejecuta en GitHub Actions antes de publicar.
// Uso: node tools/smoke.js   (requiere el paquete "playwright" y Chromium instalados)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { serve, flows } = require('./pwlib');
// Errores del entorno de prueba que no son fallos de la app.
const IGNORE = [/navigator\.vibrate/i, /Failed to load resource/i, /ERR_INTERNET_DISCONNECTED/i];

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

// Utilidades compartidas por las pruebas en Chromium (tools/smoke.js y tools/i18n-check.js):
// servidor estático del repositorio y flujos principales de la app ejecutados dentro de la página.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.webp': 'image/webp' };

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

module.exports = { serve, flows, ROOT };

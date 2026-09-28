// Comprueba la traducción al inglés: recorre la app en inglés (flujos de la prueba de humo + fichas de todos los
// ejercicios y ventanas) y lista los textos que se han quedado sin traducir.
// Uso: node tools/i18n-check.js [salida.json]   (requiere "playwright"). Sale con código 1 si falta algo.
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { serve, flows } = require('./pwlib');

// Textos que se dejan igual en inglés (siglas, marcas, unidades, nombres propios).
const KEEP = /^(RPE|HIIT|LISS|IMC|TMB|SMM|TBW|BWA|Evolt.*|Forja|For|ja|kg|km|min|ppm|kcal|reps|g|s|%|Z[1-5]|ES|EN|Polar.*|Smoke|Nativa|V1|Arturo|A|B|Futsal|Pádel)$/;

(async () => {
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('forja.lang', 'en'); } catch (e) {}
    window.__i18nMissing = new Set();
    // Traducción inmediata tras cada cambio de innerHTML/textContent, para revisar también las pantallas intermedias.
    for (const prop of ['innerHTML', 'textContent']) {
      const d = Object.getOwnPropertyDescriptor(prop === 'innerHTML' ? Element.prototype : Node.prototype, prop);
      Object.defineProperty(prop === 'innerHTML' ? Element.prototype : Node.prototype, prop, { ...d, set(v) { d.set.call(this, v); if (window.translateTree && this.nodeType === 1) window.translateTree(this); } });
    }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?fast=1`, { waitUntil: 'load' });
  await page.evaluate(() => { view = 'onboard'; render(); });
  await flows(page);
  // Cobertura extra: fichas de ejercicios, ventanas y estados que los flujos no abren.
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const u = U();
    for (const e of EX) { openInfo(e.id, null); closeModal(); }
    Object.keys(SPORTS).forEach((s) => { openActivity({ sport: s }); closeModal(); openLivePick(s); closeModal(); });
    openCheckin(); closeModal(); openMatchToday(); closeModal();
    MUSCLES.forEach((m) => { openTriage(m); closeModal(); });
    for (const lvl of [{ pain: 2 }, { pain: 5, mob: 1 }, { pain: 7, mob: 1, infl: 1 }, { pain: 9 }]) { injDraft = { muscle: 'Bíceps', mob: 0, infl: 0, rest: 0, flags: [], ...lvl }; showTriage(); closeModal(); }
    for (let wd = 0; wd < 7; wd++) { openDayActions(wd); closeModal(); }
    for (const r of REGIONS) { injRegion = r.id; view = 'injuries'; render(); }
    injRegion = null; injView = 'back'; render(); injView = 'front';
    // Estados del pulsómetro y la grabación
    for (const st of ['off', 'searching', 'connecting', 'on', 'error']) { HR.state = st; HR.err = st === 'error' ? 'x' : ''; view = 'profile'; render(); }
    // Pasos de la sesión y temporizadores
    const e = weekSchedule(u).find((x) => x.type === 'strength' && x.tpl) || { type: 'strength', tpl: u.plan.days[0], dayIdx: 0 };
    u.active = null;
    { startSession(e); for (const st of stagesOf(u.active)) { u.active.stage = st; render(); } openCondRate && u.active.cond && openCondRate(); closeModal();
      seqStart(listPhases('mob', u.active), { title: 'Movilidad', onDone: () => {} }); seqStop(false);
      if (u.active.cond) { seqStart(condPhases(u.active.cond), { title: condKindLbl(u.active.cond), onDone: () => {} }); seqNext(); seqNext(); seqStop(false); }
      finish(); closeModal(); }
    // Swap y check-in de guardado
    view = 'plan'; render(); openSwap({ d: 0, i: 0 }); closeModal();
    // Lista de toasts y avisos: se fuerzan mensajes frecuentes
    u.notice = 'Tu plan se ha actualizado con cardio, movilidad y tu límite de tiempo. Revísalo en Perfil.'; view = 'home'; render();
    for (const v of ['home', 'plan', 'body', 'injuries', 'history', 'profile']) { view = v; render(); }
    await wait(300);
  });
  // Se descartan los textos que ya son una traducción (pantallas revisadas dos veces) y los que no parecen español.
  const missing = await page.evaluate(() => { const en = new Set(Object.values(I18N_EN.dict));
    const es = /[áéíóúñ¿¡]|(de|del|el|la|los|las|con|en|por|para|sin|tu|tus|hoy|y|o|un|una|al|que|se|es|más|días?|semana|serie|sesión|ejercicios?|minutos?)/i;
    return [...window.__i18nMissing].filter((s) => !en.has(s) && (es.test(s) || /^[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(s))); });
  await browser.close(); srv.close();
  const list = missing.filter((s) => !KEEP.test(s) && !/^[\d\s.,:·+\-−–%/()×~♥🔋]+$/.test(s)).sort();
  const out = process.argv[2];
  if (out) fs.writeFileSync(out, JSON.stringify(list, null, 1));
  if (errors.length) console.error('Errores:', errors.slice(0, 5));
  console.log(`Sin traducir: ${list.length}`);
  if (!out) list.slice(0, 80).forEach((s) => console.log(' - ' + s));
  process.exit(list.length || errors.length ? 1 : 0);
})();

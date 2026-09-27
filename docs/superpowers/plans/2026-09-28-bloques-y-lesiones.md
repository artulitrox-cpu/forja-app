# Sesiones por bloques + Lesiones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forja programa fuerza, cardio suave (LISS), HIIT, movilidad y estiramientos según el objetivo, dentro de un límite de tiempo y con una semana editable; y añade la pestaña Lesiones, que bloquea o sustituye los ejercicios afectados.

**Architecture:** Se divide el `<script>` de `index.html` en scripts clásicos (`js/*.js`) que comparten variables globales, sin herramientas de compilación, igual que ahora. La lógica pura (catálogo, generador, lesiones) no toca el DOM y se prueba con `node --test` en un contexto `vm`. Las vistas siguen en `index.html`.

**Tech Stack:** HTML + JS sin compilación, Tailwind por CDN, supabase-js 2 (UMD), Node ≥ 20 para las pruebas (`node:test`, `node:vm`).

**Spec:** `docs/superpowers/specs/2026-09-28-sesiones-por-bloques-design.md` y `docs/superpowers/specs/2026-09-28-lesiones-design.md`

## Global Constraints

- Sin dependencias nuevas en tiempo de ejecución; las pruebas usan solo módulos de Node.
- Toda la interfaz en español, con el tono actual (frases cortas, "tú").
- Modo oscuro con los tokens actuales (`--bg`, `--surface`, `--accent`, `--easy`, `--normal`, `--hard`).
- `sessionMin` ∈ {30, 45, 60, 75, 90}, 60 por defecto.
- Máximo 6 sesiones por semana.
- FC máx. = 208 − 0,7 × edad; LISS al 60–70 %.
- `S.version` = 2. Se conservan `prog`, `history`, `cycle`, `checkins` y `next`.
- `sw.js`: `CACHE = 'forja-v2'`, con los archivos `js/*.js` en `CORE`.
- Lesiones: "estimación orientativa", nunca "diagnóstico".

## Review Focus

1. **Datos v1 sincronizados desde otro dispositivo después de migrar:** `mergeState` debe migrar también los usuarios remotos v1; si no, la app falla al leer `avail`.
2. **Sesión a medias de la v1** (`u.active` sin `stage`): debe poder continuarse y terminarse sin errores.
3. **Semana con 0 días marcados:** Hoy muestra "Sin sesiones esta semana" y ofrece "Entrenar igualmente"; no puede fallar.
4. **Lesión que bloquea todos los ejercicios de un hueco:** se omite con aviso; la sesión nunca queda vacía sin explicación.
5. **Perfil sin datos biométricos** (sin edad o peso): el LISS no muestra el pulso y el generador no falla.

---

### Task 1: Dividir el código en archivos y preparar las pruebas

**Files:**
- Create: `js/catalog.js` (constantes base, `EX`, `E()`, `EXM`, `X`), `js/figures.js` (`POSES`, `figMarkup`, animación), `js/plan.js` (biometría, ciclo, `TPL`, `pickEx`, `genPlan`, `presc`, `prog`, textos), `js/sync.js` (Supabase y configuración), `tests/helpers.js`, `tests/split.test.js`, `package.json` (solo `"scripts": {"test": "node --test tests/"}` y `"private": true`)
- Modify: `index.html` (el `<script>` inline se queda con el estado, las vistas y los eventos; se añaden `<script src>` en orden), `sw.js` (`CORE` + `forja-v2`)

**Interfaces:**
- Produces: `tests/helpers.js` exporta `load(files: string[], globals?: object) → vm.Context` y `sampleProfile(over?) → profile`.
- `presc(ex, pr, wi?)`: el nuevo tercer parámetro `wi` (semana del ciclo) evita depender de `U()` en las pruebas. Si falta, usa `curWeek()`.

- [ ] Mover el código tal cual, sin cambiar la lógica, respetando el orden: catalog → figures → plan → sync → inline.
- [ ] Prueba: `load(['js/catalog.js','js/plan.js'])` → `genPlan(sampleProfile())` devuelve 3 días de cuerpo completo para un principiante con 3 días.
- [ ] `node --test tests/` pasa; la app carga en el navegador sin errores en la consola.
- [ ] Commit.

### Task 2: Catálogo ampliado y elección por nivel

**Files:** Modify `js/catalog.js`, `js/plan.js`; Test `tests/catalog.test.js`, `tests/pick.test.js`

**Interfaces:**
- Produces: nuevos huecos `chest_fly`, `quad_iso`, `glute_iso` en `SLOT_LABEL`; campos `spine`, `impact` en cada ejercicio (`E(..., {iso, time, spine, impact})`); `MAIN_SLOTS = Set(['squat','hinge','chest_press','incline_press','shoulder_press','horizontal_row','vertical_pull'])`; `LEVEL_PREF`; `lowImpact(pr) → bool` (edad ≥ 60 o IMC ≥ 35); `pickEx(slot, pr, {off=0, cyc=0, exclude=[]}) → ex|null`; `genPlan(pr, {swaps={}, cyc=0, split?}) → {split, days:[{key,name,focus,items:[{slot,ex,pos}]}]}`.
- Consumes: `ALLOW`, `EX`.

- [ ] Pruebas: todo ejercicio tiene un hueco válido y los ids son únicos; principiante + gimnasio → press de pecho en máquina o polea; intermedio → mancuernas o barra; perfil de bajo impacto → nunca `spine`; los principales iguales entre `cyc=0` y `cyc=1`, y algún accesorio distinto; con `swaps['fbA:squat:0']='goblet'` → goblet.
- [ ] Añadir unos 20 ejercicios de máquina y polea (lista del spec, §8) y los accesorios `chest_fly`, `quad_iso` y `glute_iso` al final de las plantillas cuando el objetivo es ganar músculo.
- [ ] Implementar la puntuación de `pickEx` y la rotación de accesorios por `cyc`.
- [ ] `openSwap`/`pick` guardan `u.swaps[key]`; `checkCycle` regenera el plan con `cyc` al empezar un bloque.
- [ ] Commit.

### Task 3: Perfil (disponibilidad y tiempo), migración v2 y semana editable

**Files:** Modify `js/plan.js`, `index.html`; Test `tests/migrate.test.js`, `tests/schedule.test.js`

**Interfaces:**
- Produces:
  - `migrateUser(u) → bool` (idempotente; v1 → v2);
  - `strengthDays(pr, n) → número`;
  - `weekKey(ts) → 'AAAA-MM-DD'`;
  - `weekDaysFor(u, ws) → número[]`;
  - `weekSchedule(u, ws, today?) → [{wd, type:'strength'|'cardio'|'rest', tpl?:{key,name,focus,items}, cond?, done:boolean}]`;
  - `daysOf(pr)` = número de sesiones (tamaño de `avail`, con tope de 6).
- `profileForm`: 7 casillas `avail` + `seg('sessionMin')`. `readProfile` los lee.
- Plan: tarjeta "Esta semana" (`data-a="wkday"` alterna un día; `data-a="wkreset"`).

- [ ] Pruebas: migración de un estado v1 fijo (se conservan `prog`, `history` y los cambios del plan pasan a `swaps`); tabla de días de fuerza por objetivo (§3 del spec); la rotación continúa desde `u.next`; Empuje/Tirón/Pierna con F < 3 esa semana → cuerpo completo; 7 días → 6 sesiones; 0 días → lista vacía.
- [ ] Implementar; `mergeState` y la carga inicial llaman a `migrateUser`; `u.weeks` guarda como máximo 8 semanas.
- [ ] Hoy usa `weekSchedule` para elegir la sesión de hoy o la siguiente pendiente; muestra "Hoy no tenías sesión" y "Sin sesiones esta semana".
- [ ] Commit.

### Task 4: Acondicionamiento, movilidad, estiramientos y límite de tiempo

**Files:** Modify `js/catalog.js` (`CARDIO`, `HIIT`, `MOB`, `STRETCH`), `js/plan.js`; Test `tests/conditioning.test.js`, `tests/fit.test.js`

**Interfaces:**
- Produces:
  - `assignConditioning(u, schedule, ws)` rellena `cond = {kind:'liss'|'hiit'|'mod', min, machine, proto?}`;
  - `hrZone(pr) → {lo, hi}|null`;
  - `mobFor(slots, kind) → [{id,n,sec|reps,zone}]`;
  - `stretchFor(muscles) → [...]`;
  - `buildSession(u, entry, opts) → {kind, name, focus, items:[{slot,ex,p,pos}], cond, mob, stretch, est:{mob,str,cond,stretch,total}, overTime, notes:[]}`;
  - `fitSession(sess, limitSec) → sess`;
  - `condProgress(u, cond, rt) → note`.

- [ ] Pruebas de las reglas: sin HIIT antes de pierna; principiante sin HIIT en sus 2 primeras semanas; bajo impacto → `mod` y máquinas de bajo impacto; descarga → sin HIIT y al 60 %; tope de HIIT semanal por objetivo; ganar músculo → solo LISS y como mucho 2 bloques.
- [ ] Prueba del límite: para todas las combinaciones de objetivo × nivel × días × tiempo, `total ≤ límite` o `overTime` con todos los principales presentes; nunca se pierden la movilidad ni los estiramientos.
- [ ] Implementar la estimación con los 4 bloques y el recorte en el orden del spec (§4).
- [ ] Commit.

### Task 5: Sesión por bloques en la interfaz, temporizador de secuencia e historial

**Files:** Create `js/timer.js` (temporizador de descanso movido, `seqTimer`, bloqueo de pantalla); Modify `index.html` (`vSession`, `startSession`, `finish`, `clock`, `estCard`, `vHistory`, `vPlan`, `A`)

**Interfaces:**
- `u.active = {kind, dayIdx?, tplKey?, start, stage:'mob'|'str'|'cond'|'stretch', cur, items, cond:{...,done,rt}, mob:{list,done}, stretch:{list,done}, deload, est}`.
- `seqTimer.start(phases:[{label, sec, kind:'work'|'rest'|'neutral', sub?}], {title, onDone})`, `seqTimer.stop()`.
- Historial: `h.kind`, `h.blocks`, `h.cardioMin`.

- [ ] Barra de pasos de los bloques; cada bloque con *Empezar* y *Saltar*; la fuerza, igual que ahora.
- [ ] Vistas de LISS y HIIT (pantalla completa, color por fase, rondas); valoración al terminar → `condProgress`.
- [ ] Bloqueo de pantalla con `navigator.wakeLock` (se vuelve a pedir en `visibilitychange`); aviso sobre los pitidos con la pantalla bloqueada.
- [ ] Compatibilidad con `u.active` de la v1: si no tiene `stage`, se trata como `stage:'str'` sin otros bloques.
- [ ] Progreso: minutos de cardio de la semana frente al objetivo.
- [ ] Comprobación manual en el navegador con temporizadores acelerados (`?fast=1` divide los segundos entre 20).
- [ ] Commit.

### Task 6: Lógica de lesiones

**Files:** Create `js/injuries.js`; Modify `js/catalog.js` (`MUSCLES`, `REGIONS`, `CARDIO[].mus`); Test `tests/injuries.test.js`

**Interfaces:**
- Produces:
  - `triage({pain, mob, infl, rest, flags}) → {level, label, range, days, score}`;
  - `injuryMap(u) → {músculo: nivel}`;
  - `exBlocked(ex, map) → músculo|null`;
  - `safeItems(u, items) → items` con `sub` u `omit`;
  - `safeCond(u, cond) → cond|null`;
  - `addInjury(u, data)`, `resolveInjury(u, id)`, `deleteInjury(u, id)`.
- `buildSession` aplica `safeItems`, `safeCond` y el filtro de movilidad y estiramientos cuando hay lesiones activas.

- [ ] Pruebas del spec de lesiones (§8, casos 1–6).
- [ ] Implementar; commit.

### Task 7: Pestaña Lesiones (SVG con zoom, triaje e integración en Hoy y Plan)

**Files:** Create `js/bodymap.js` (SVG de frente y espalda, `bodySvg(view, region, injured)`, animación del `viewBox`); Modify `index.html` (`vInjuries`, `nav`, modal de triaje, avisos en Hoy, marcas "sustituido"/"omitido" en `exRow` y en la sesión)

- [ ] SVG con una forma por músculo (`data-muscle`, `data-region`); zoom por región con `requestAnimationFrame` (350 ms, instantáneo con reducir movimiento); lista accesible de botones.
- [ ] Triaje en `modal()`; resultado con ejercicios afectados; guardar.
- [ ] Tarjetas de lesiones activas (alta, reevaluar, eliminar); historial plegable.
- [ ] 6.ª pestaña; fuente de la barra de pestañas a 11 px.
- [ ] Prueba: todo músculo de `MUSCLES` tiene al menos una forma en el SVG.
- [ ] Comprobación manual en el navegador: registrar una lesión de isquiotibiales → el peso muerto rumano se sustituye o se omite en Hoy → al darla de alta vuelve a aparecer.
- [ ] Commit.

### Task 8: Cierre

- [ ] `sw.js` → `forja-v2` con todos los `js/*.js`; README (sección de lesiones y de bloques); revisar la consola en móvil (375 px).
- [ ] Revisión completa de la rama; ejecutar todas las pruebas; commit y push.

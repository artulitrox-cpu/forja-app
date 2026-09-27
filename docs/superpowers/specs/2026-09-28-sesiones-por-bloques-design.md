# Sesiones por bloques: fuerza, cardio, HIIT, movilidad y límite de tiempo

Fecha: 2026-09-28 · Estado: pendiente de revisión por el usuario

## 1. Objetivo

Hoy Forja genera solo entrenamiento de fuerza y elige el primer ejercicio del catálogo que encaja con el material. Queremos que:

1. Según el objetivo, la app programe también **cardio suave (LISS)** y **HIIT**, además de **movilidad** al empezar y **estiramientos** al terminar.
2. Aproveche un **gimnasio completo** (el usuario entrena en Thrive Fitness Club; su web no publica la lista de máquinas, así que se asume el equipamiento típico de un gimnasio premium).
3. Respete un **tiempo máximo por sesión** (por ejemplo, 60 min).
4. Permita indicar la **disponibilidad habitual** y **editar los días de cada semana concreta**.
5. Elija los ejercicios según el nivel y el perfil, no por orden de lista.

**Criterio de éxito:** al elegir objetivo, disponibilidad y tiempo, la semana muestra fuerza y cardio/HIIT en la proporción correcta, cada sesión cabe en el límite, se cumplen las reglas de seguridad y los datos actuales del usuario (historial y cargas) se conservan.

**Fuera de alcance:** clases grupales del gimnasio, animaciones realistas (proyecto aparte), centro de bienestar (sauna, baños de hielo), límite de tiempo distinto por día y lista de máquinas marcable por el usuario.

## 2. Perfil y disponibilidad

### Campos del perfil

| Campo | Antes | Ahora |
|---|---|---|
| `days` | número o `'auto'` | se elimina y se sustituye por `avail` |
| `avail` | — | días habituales, índices 0 (lunes) a 6 (domingo). Al crear el perfil se rellena con la sugerencia de `suggestDays()` y los días de `WEEK` |
| `sessionMin` | — | 30, 45, 60, 75 o 90. Por defecto, 60 |

El formulario de perfil sustituye el selector de días por **7 casillas (L–D)** y añade el selector de **tiempo máximo por sesión**. Debajo de las casillas se muestra la sugerencia: *"Para tu objetivo recomendamos N días"*.

### Semana editable

- `u.weeks`: mapa `{ 'AAAA-MM-DD' (lunes de la semana): [índices de días] }`. Si una semana no tiene entrada, se usa `avail`.
- La pestaña **Plan** muestra la tarjeta **"Esta semana"** con 7 casillas. Al cambiarlas se guarda solo en `u.weeks` para esa semana y se recalcula su reparto. Un botón *"Volver a mi semana habitual"* borra la entrada.
- Se guardan como máximo las 8 semanas más recientes para no hacer crecer los datos.
- **Entrenar un día no previsto:** en Hoy aparece *"Hoy no tenías sesión. ¿Entrenar igualmente?"* y se ofrece la siguiente sesión pendiente de la semana.

## 3. Reparto semanal por objetivo

`weekSchedule(u, lunes)` devuelve para cada día disponible `{dia, tipo: 'fuerza' | 'cardio', sesionFuerza?, acondicionamiento?}`. Se programan como máximo 6 sesiones; si se marcan 7 días, el domingo queda como descanso.

### Días de fuerza (F) y de cardio (C) según los N días disponibles

| Objetivo | Regla de días de fuerza | Resto de días |
|---|---|---|
| Perder grasa (`fat`) | F = min(N, 4) | cardio (LISS/HIIT alternos) |
| Ganar músculo (`hyp`) | F = min(N, 5) | como mucho 1 día de cardio LISS; el resto, descanso |
| Mantenimiento (`maint`) | F = min(N, 3) | cardio |

Principiante: F máximo 3. Los días sobrantes siguen la columna "Resto de días" de su objetivo, pero siempre con LISS (sin HIIT).

### Acondicionamiento al final de las sesiones de fuerza

| Objetivo | Frecuencia | Duración | Tipo |
|---|---|---|---|
| Perder grasa | todas las sesiones de fuerza | 10–20 min | alterna LISS y HIIT; máximo 2 HIIT por semana entre bloques y días de cardio |
| Ganar músculo | 1–2 por semana, tras sesiones sin pierna principal (Empuje, Tirón) o las dos más cortas de cuerpo completo | 10–15 min | solo LISS |
| Mantenimiento | todas las sesiones de fuerza | 15–20 min | LISS; 1 HIIT por semana |

Días de solo cardio: perder grasa 30–45 min, mantenimiento 30–40 min, ganar músculo 25–30 min (LISS).

**Objetivo semanal de minutos de cardio:** perder grasa 150, mantenimiento 150, ganar músculo 60. Se muestra en Progreso.

### Colocación y rotación

- Los días de fuerza se reparten lo más separados posible dentro de los días disponibles; el cardio ocupa los huecos.
- La rotación de fuerza continúa desde `u.next`: cambiar la semana no reinicia A/B/C ni Empuje/Tirón/Pierna.
- División: Empuje/Tirón/Pierna si el nivel no es principiante y F ≥ 4 (regla actual). **Si una semana concreta tiene F < 3 y la división es Empuje/Tirón/Pierna, esa semana usa cuerpo completo.**

### Reglas de seguridad

- **HIIT antes de pierna:** si el día siguiente es de fuerza e incluye sentadilla o bisagra como ejercicio principal, el HIIT de ese día pasa a LISS.
- **Principiante:** sin HIIT durante sus 2 primeras semanas (desde `u.created`).
- **60 años o más, o IMC de 35 o más:** solo máquinas de cardio de bajo impacto (bici, bici reclinada, elíptica, remo, cinta caminando). El HIIT se sustituye por intervalos moderados (protocolo M, ver §5).
- **Semana de descarga:** sin HIIT; los bloques de cardio al 60 % de su duración.

## 4. Límite de tiempo por sesión

Estimación de una sesión:

- Movilidad: la suma de sus ejercicios (5–8 min).
- Fuerza: fórmula actual (`series × 45 s + series × descanso`).
- Acondicionamiento: su duración total (en el HIIT incluye 3 min de calentamiento y 2 min de vuelta a la calma).
- Estiramientos: 5 min.

Si el total supera `sessionMin`, `fitSession()` recorta en este orden hasta que quepa:

1. Acorta el acondicionamiento hasta un mínimo de 8 min.
2. Quita el último ejercicio de aislamiento (los accesorios del final de la plantilla y el core, en ese orden).
3. Quita una serie a cada aislamiento restante (mínimo 2).
4. Reduce el descanso de los aislamientos a 45 s.

**Nunca se quitan** los ejercicios principales, la movilidad ni los estiramientos. Si ni así cabe, la sesión se marca con `overTime` y Hoy muestra: *"Esta sesión dura unos X min, más que tu límite de Y. Sube el tiempo o añade un día."*

Los días de solo cardio se limitan a `sessionMin − 10` min (movilidad y estiramientos incluidos).

## 5. Acondicionamiento: LISS y HIIT

### Máquinas de cardio (catálogo `CARDIO`)

| id | Máquina | Impacto | HIIT | Carga de piernas |
|---|---|---|---|---|
| `treadmill_walk` | Cinta, caminar inclinado | bajo | no | media |
| `treadmill_run` | Cinta, correr | alto | sí | alta |
| `bike` | Bici estática | bajo | sí | alta |
| `recumbent` | Bici reclinada | bajo | no | media |
| `airbike` | Assault bike | bajo | sí | media |
| `rower` | Remo | bajo | sí | media |
| `elliptical` | Elíptica | bajo | sí | media |
| `stair` | Escaladora | bajo | no | alta |
| `skierg` | Ski erg | bajo | sí | baja |

Cada máquina incluye descripción, claves de ajuste (sillín, resistencia…) y cómo medir la intensidad.

### LISS

- Intensidad: *"ritmo al que puedes hablar pero no cantar"* y pulso orientativo del **60–70 % de la FC máxima**, con FC máx. = 208 − 0,7 × edad (Tanaka). Sin edad, solo la descripción.
- Máquina: se rota por la lista permitida para no repetir la misma dos veces seguidas.

### HIIT

Protocolos (trabajo/descanso × rondas), más 3 min de calentamiento y 2 de vuelta a la calma:

| Nivel | Protocolo |
|---|---|
| H1 | 6 × 30 s / 90 s |
| H2 | 8 × 30 s / 60 s |
| H3 | 10 × 30 s / 60 s |
| H4 | 8 × 40 s / 40 s |
| H5 | 10 × 40 s / 20 s |
| M (moderado, perfil de bajo impacto) | 6 × 60 s / 60 s a intensidad moderada |

Inicio: principiante H1, intermedio H2, avanzado H3. Solo se usan las máquinas con HIIT = sí. Si el día siguiente es de pierna, la regla de §3 lo convierte en LISS.

### Progresión (`u.cprog`)

- LISS: valoración *Fácil* → +2 min (hasta el máximo del bloque) o, si ya está en el máximo, sugerencia de subir la intensidad. *Difícil* → −2 min.
- HIIT: *Fácil* → siguiente protocolo; *Difícil* → el anterior; *Normal* → se mantiene.

## 6. Movilidad y estiramientos

- Catálogo `MOB` (~15 ejercicios) y `STRETCH` (~15), con la zona que trabajan (cadera, tobillo, columna torácica, hombro, isquios, cuádriceps, pecho, dorsal, gemelo) y el tiempo o las repeticiones.
- **Movilidad:** 5–7 ejercicios elegidos según los patrones del día: si hay pierna, cadera y tobillo; si hay tren superior, hombro y columna torácica; los de cuerpo completo mezclan. En los días de cardio, 3–4 ejercicios generales.
- **Estiramientos:** 4–6 de 30 s de los músculos principales trabajados (se deducen de los músculos de los ejercicios `m`, o de la máquina de cardio).

## 7. Pantalla de sesión

- Arriba, una barra de pasos: **Movilidad → Fuerza → Cardio/HIIT → Estiramientos**. Solo aparecen los bloques de esa sesión. Cada bloque tiene *Saltar*.
- **Temporizador de secuencia** (`seqTimer`), común a movilidad, estiramientos, LISS y HIIT: recibe fases `[{etiqueta, segundos, tipo: 'trabajo' | 'descanso' | 'neutro'}]`, pita en cada cambio (`beep()` actual), permite pausar, +15 s y saltar fase.
- **HIIT:** vista a pantalla completa con la máquina, *"Ronda 3 de 8"*, la fase en grande (*¡FUERTE!* / *Suave*) y el color de fondo según la fase (`--hard` / `--easy`).
- **LISS:** un único contador grande, con la intensidad, el pulso objetivo y la máquina.
- **Pantalla encendida:** se usa la Screen Wake Lock API mientras hay un temporizador activo, y se vuelve a pedir al volver a la pestaña. Si no está disponible, no pasa nada. Aviso fijo: *"Si bloqueas el teléfono, los pitidos pueden no sonar."*
- La fuerza funciona como ahora. El reloj de la sesión (`clock()`) suma todos los bloques.
- Al terminar, el resumen incluye los minutos de cardio y la valoración del bloque.

## 8. Catálogo de fuerza y elección de ejercicios

### Ejercicios y huecos nuevos

- Huecos nuevos: `chest_fly` (aperturas), `quad_iso` (extensión de cuádriceps) y `glute_iso` (abductor o patada de glúteo).
- Ejercicios nuevos (material `machine` o `cable`, salvo que se indique lo contrario): multipower (sentadilla, press banca, press inclinado), sentadilla hack, extensión de cuádriceps, abductor, aductor, patada de glúteo en máquina, hip thrust en máquina, contractor de pecho, cruce de poleas, remo con apoyo en el pecho, remo T (`bar`), jalón unilateral, dominadas asistidas en máquina, curl predicador en máquina, fondos en máquina, extensiones lumbares (`body`), pull-through en polea, crunch en máquina y leñador en polea.
- Campos nuevos en cada ejercicio:
  - `main`: ejercicio principal, que se mantiene entre bloques.
  - `spine`: carga axial alta (sentadilla y peso muerto con barra, remo con barra).
  - `impact`.
- Plantillas: añaden al final `chest_fly`, `quad_iso` o `glute_iso` como accesorios cuando el objetivo es ganar músculo. El recorte por tiempo (§4) los quita primero.

### Elección (`pickEx`)

Se puntúa cada candidato del hueco permitido por el material:

- Preferencia por nivel:

  | Nivel | machine | cable | db | bar | body |
  |---|---|---|---|---|---|
  | Principiante | 3 | 3 | 2 | 1 | 1 |
  | Intermedio | 2 | 2 | 3 | 3 | 1 |
  | Avanzado (principales) | 1 | 1 | 2 | 3 | 1 |
  | Avanzado (accesorios) | 3 | 3 | 2 | 1 | 1 |

- Perfil de 60 años o más, o IMC de 35 o más: se excluyen los ejercicios `spine` e `impact`, salvo que el hueco se quede sin opciones.
- Empate: orden del catálogo, desplazado por el índice de la variante del día (A/B), como ahora.
- **Principales** (`main`): el mismo ejercicio en todos los bloques, para medir el progreso.
- **Accesorios:** rotan al empezar cada bloque de 4 semanas (se desplaza el orden por el número de bloque).
- **Cambios del usuario:** `u.swaps['plantilla:hueco:posición'] = idEjercicio`. Tiene prioridad sobre la elección automática y sobrevive a la regeneración del plan. Hoy los cambios se guardan dentro de `u.plan` y se pierden al regenerarlo; se corrige.

## 9. Datos y migración

- `S.version` pasa de 1 a 2. Al cargar, para cada usuario con versión anterior:
  - `profile.avail`: se deriva de los días actuales (`daysOf(pr)` → `WEEK[n]` → índices).
  - `profile.sessionMin` = 60.
  - `u.weeks` = `{}`, `u.cprog` = `{}` y `u.swaps` se rellena con los cambios que haya en el plan actual.
  - Se regenera `u.plan`. **Se conservan** `u.prog` (cargas), `u.history`, `u.cycle`, `u.checkins` y `u.next`.
  - Se muestra una vez el aviso: *"Tu plan se ha actualizado con cardio, movilidad y tu límite de tiempo. Revísalo en Perfil."*
- Si hay una sesión a medias (`u.active`) de la versión anterior, se deja terminar con el formato antiguo antes de migrar ese usuario.
- La sincronización con Supabase no cambia (JSON completo en `app_state.data`). Un dispositivo con la versión antigua en caché recibe la nueva al abrir, porque `sw.js` pide primero a la red.
- El historial añade `h.blocks = {mob: bool, cond: {tipo, maquina, min, rt} | null, stretch: bool}`.

## 10. Estructura del código

El archivo `index.html` (unos 108 KB) se divide en scripts clásicos que comparten variables globales, igual que ahora, sin herramientas de compilación:

| Archivo | Contenido |
|---|---|
| `index.html` | estilos, maquetación y vistas (render, pantallas) |
| `js/catalog.js` | `EX`, `CARDIO`, `MOB`, `STRETCH`, poses de las figuras |
| `js/plan.js` | `genPlan`, `weekSchedule`, `presc`, `pickEx`, `fitSession`, protocolos y progresión de cardio |
| `js/timer.js` | `seqTimer`, temporizador de descanso y bloqueo de pantalla |
| `js/sync.js` | Supabase (movido sin cambios) |

`sw.js` añade los archivos nuevos a `CORE` y pasa a `CACHE = 'forja-v2'`.

## 11. Pruebas

Pruebas con `node --test` en `tests/`, sin dependencias. Cargan `js/catalog.js` y `js/plan.js` en un contexto `vm`. Casos mínimos:

1. Para cada combinación de objetivo × nivel × días disponibles (1–7) × tiempo (30–90), ninguna sesión supera `sessionMin`, o queda marcada `overTime` sin haber perdido ejercicios principales.
2. Ningún HIIT cae el día anterior a una sesión de fuerza con sentadilla o bisagra principal.
3. Principiante: sin HIIT en sus 2 primeras semanas. Con 60 años o más o IMC de 35 o más: sin cardio de alto impacto ni ejercicios `spine`.
4. Número de días de fuerza y de cardio por objetivo, según la tabla de §3.
5. Semana editada: la rotación continúa desde `u.next`, y Empuje/Tirón/Pierna con menos de 3 días de fuerza pasa a cuerpo completo.
6. Migración de un estado v1 real (sin datos personales): se conservan `prog`, `history` y los cambios de ejercicio.
7. `u.swaps` sobrevive a la regeneración del plan.

Además, antes de publicar se hace una comprobación manual en el navegador: crear un perfil, editar la semana, completar una sesión con todos los bloques (temporizadores acelerados en modo prueba) y comprobar la sincronización.

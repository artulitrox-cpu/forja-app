# Lesiones y Recuperación

Fecha: 2026-09-28 · Estado: decisiones tomadas por Claude con autorización del usuario (pendiente de revisión a posteriori)

Se construye sobre el diseño de sesiones por bloques (`2026-09-28-sesiones-por-bloques-design.md`).

## 1. Objetivo

Una pestaña nueva, **Lesiones**, con el título de página "Lesiones y Recuperación", que permita:

1. Elegir el músculo afectado sobre una figura humana (frente y espalda), con zoom por regiones.
2. Hacer un triaje rápido: dolor de 1 a 10, 3 preguntas y señales de alarma. Da una estimación orientativa y un tiempo de recuperación.
3. Guardar las lesiones activas, que se sincronizan con Supabase dentro del estado del usuario.
4. Bloquear o sustituir automáticamente los ejercicios que involucren ese músculo, con aviso.
5. Dar de alta o eliminar la lesión para recuperar los ejercicios normales.

**No es un diagnóstico médico.** Todo el texto dice "estimación orientativa". Si aparece una señal de alarma, la app no estima tiempo: recomienda acudir a un profesional y bloquea la zona.

## 2. Músculos y regiones

Se usan exactamente los nombres del catálogo (`m` y `s` de cada ejercicio). El nombre genérico "Core" del catálogo se trata como alias de *Abdomen* y *Oblicuos*.

| Región | Músculos | Vista |
|---|---|---|
| Hombros | Deltoide anterior, Deltoide lateral, Deltoide posterior, Manguito rotador | frente y espalda |
| Brazos | Bíceps, Braquial, Tríceps, Antebrazo | frente y espalda |
| Pecho | Pectoral, Pectoral superior | frente |
| Espalda | Trapecio, Dorsal ancho, Romboides, Lumbares | espalda |
| Core | Abdomen, Oblicuos, Flexores de cadera | frente |
| Piernas | Cuádriceps, Aductores, Glúteos, Isquiotibiales, Gemelos, Sóleo | frente y espalda |

## 3. Selector anatómico

- Una figura SVG esquemática del mismo estilo que la app (trazos limpios y `--surface2` como relleno), con un interruptor **Frente / Espalda**.
- Cada músculo es una forma SVG con `data-muscle` y `data-region`. Los músculos con lesión activa se pintan con `--hard`, o con `--accent` si la lesión es leve.
- **Nivel 1:** se ve la figura entera y las regiones se resaltan al tocarlas.
- **Nivel 2:** al tocar una región, el `viewBox` se anima unos 350 ms, con curva *ease*, hasta encuadrar esa región. Sus músculos pasan a ser seleccionables y aparece el botón *Volver*. Con "reducir movimiento" activado, el cambio es instantáneo.
- **Accesibilidad:** debajo de la figura hay siempre una lista de botones con los músculos de la región actual (o las regiones en el nivel 1), para que el lector de pantalla y las pantallas pequeñas no dependan de acertar en el SVG.

## 4. Triaje

Al elegir un músculo se abre una hoja inferior (el `modal()` actual) con:

1. **Dolor (1–10):** 10 botones segmentados.
2. **Movilidad:** *Normal* (0) · *Algo limitada* (1) · *Muy limitada* (2).
3. **Inflamación:** *No* (0) · *Leve* (1) · *Visible o caliente* (2).
4. **Dolor en reposo:** *No* (0) · *A veces* (1) · *Constante* (2).
5. **Señales de alarma** (casillas):
   - hormigueo, entumecimiento o pérdida de fuerza;
   - no puedo apoyar ni usar la zona;
   - noté un chasquido o fue un golpe fuerte;
   - hinchazón grande o moratón extenso.

**Puntuación** = dolor + 2 × (movilidad + inflamación + reposo), de 1 a 22.

| Condición | Estimación | Tiempo orientativo | Bloqueo |
|---|---|---|---|
| Señal de alarma o dolor ≥ 8 | *Posible lesión importante: consulta a un profesional* | hasta valoración profesional | músculo principal y secundario |
| Puntuación ≥ 11 | *Distensión o sobrecarga importante* | 2 a 4 semanas de descarga local | principal y secundario |
| Puntuación 6–10 | *Distensión moderada* | 1 a 2 semanas de descarga local | principal y secundario |
| Puntuación ≤ 5 | *Sobrecarga leve* | 3 a 7 días de descarga local | solo donde es músculo principal; donde es secundario se muestra un aviso |

El resultado muestra la estimación, el tiempo, qué ejercicios de tu plan quedan bloqueados, 3 consejos genéricos (descanso relativo, movimiento suave sin dolor, volver a cargar poco a poco) y el aviso legal. El botón **Guardar lesión** la activa.

## 5. Datos

```js
u.injuries = [{
  id: 'i' + Date.now().toString(36),
  muscle: 'Isquiotibiales',
  date: 1759000000000,
  pain: 4, mob: 1, infl: 0, rest: 0, flags: [],   // respuestas del triaje
  level: 'mild' | 'moderate' | 'severe' | 'refer',
  reviewAt: fecha + mínimo del rango (3, 7, 14 días; 'refer' = 7),
  active: true,
  resolvedAt: null
}]
```

- Viaja con el resto del usuario a `localStorage` y a Supabase (`app_state.data`). No hace falta cambiar el esquema de la base de datos.
- Si se registra otra lesión del mismo músculo, sustituye a la activa.
- Solo se guardan las 30 lesiones más recientes.

## 6. Integración con el generador

Se hace **al montar la sesión y al mostrar el plan, sin modificar `u.plan`**. Así, dar de alta la lesión recupera los ejercicios al instante, sin regenerar nada.

- `injuryMap(u)` → `{ músculo: nivel }` de las lesiones activas, con "Core" expandido.
- `exBlocked(ex, map)`:
  - Si algún músculo principal `m` del ejercicio está lesionado → bloqueado.
  - Si algún músculo secundario `s` está lesionado con nivel distinto de `mild` → bloqueado.
- `safeItems(u, items)`: para cada ejercicio bloqueado busca, en el mismo hueco, el que mejor puntúa en `pickEx` entre los que permite el material y no están bloqueados.
  - Si encuentra uno, lo sustituye y lo marca con `sub: {de, músculo}`. La interfaz muestra *"Sustituido por molestia en X"*.
  - Si no, lo omite y lo marca con `omit`. La interfaz muestra *"Ejercicio omitido por molestia muscular en X"*.
- **Cardio:** cada máquina tiene los músculos que carga. Si una lesión (de cualquier nivel) afecta a uno de sus músculos principales, se elige otra máquina válida. Si no queda ninguna, se omite el bloque de cardio con aviso.
- **Movilidad y estiramientos:** se omiten los de la zona lesionada.
- **Hoy:** tarjeta *"Tienes N molestias activas: M ejercicios adaptados"*, con enlace a la pestaña Lesiones.
- **Revisión:** cuando pasa `reviewAt`, aparece un aviso en Hoy: *"¿Cómo va tu molestia en X?"* con los botones *Estoy recuperado*, *Volver a evaluar* y *Mañana*.

## 7. Pestaña Lesiones

- Encabezado: "Lesiones y Recuperación" y el aviso legal breve.
- Selector anatómico (§3).
- **Lesiones activas:** tarjetas con músculo, estimación, días transcurridos, barra de progreso hacia `reviewAt`, número de ejercicios afectados y los botones *Estoy recuperado* (alta), *Volver a evaluar* y *Eliminar* (con confirmación).
- **Historial:** lista plegable con las lesiones dadas de alta.
- **Navegación:** 6.ª pestaña, **"Lesiones"**, con un icono de cruz o vendaje. La fuente de la barra pasa de 12 a 11 px para que las seis quepan en 360 px.

## 8. Pruebas

Con `node --test`, cargando `js/catalog.js`, `js/plan.js` y `js/injuries.js`:

1. `triage()`: con alarma o dolor ≥ 8 → `refer`; los umbrales 5/6 y 10/11 de la puntuación.
2. `exBlocked()`: principal siempre; secundario solo si no es `mild`; "Core" como alias.
3. `safeItems()`: el sustituto no está bloqueado y es del mismo hueco; si el hueco no tiene opciones → `omit`.
4. El cardio cambia de máquina y, sin opciones, se omite.
5. Dar de alta la lesión restaura los ejercicios originales (`u.plan` intacto).
6. Cada músculo de `MUSCLES` aparece en al menos una forma del SVG, y cada músculo del catálogo pertenece a una región.

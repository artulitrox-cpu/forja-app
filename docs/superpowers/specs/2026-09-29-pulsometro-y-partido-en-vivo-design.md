# Pulsómetro completo y grabación de partidos en vivo

Fecha: 2026-09-29 · Estado: decisiones tomadas por Claude con la confianza expresada por el usuario (pendiente de revisión a posteriori)

Subproyectos 2 y 3. El usuario usa una **banda de pecho** (servicio Bluetooth estándar Heart Rate).

## 1. Emparejar y reconectar

- **Emparejar:** `requestDevice({filters:[{services:['heart_rate']}], optionalServices:['battery_service']})`. Quien emparejó con la versión anterior tiene que hacerlo una vez más para que la app pueda leer la batería.
- **Recordar el dispositivo:** se guarda `{id, name}` en `localStorage` (`forja.hr`). No se sincroniza con Supabase porque el identificador solo sirve en el navegador donde se emparejó; el resto de lecturas sí se guardan (§4).
- **Reconexión automática:** al abrir la app y al volver a ella, si `navigator.bluetooth.getDevices()` existe, se busca el dispositivo guardado.
  - Si existe `watchAdvertisements()`, la app espera a que la banda anuncie su presencia y se conecta.
  - Si no, intenta `gatt.connect()` cada 10 s mientras la app está visible.
  - Si el navegador no tiene `getDevices()` (en Chrome depende de *chrome://flags/#enable-web-bluetooth-new-permissions-backend*), el indicador muestra **"Toca para reconectar"**: un toque abre el selector con la banda ya conocida.
- **Límite de una app web:** con la pantalla apagada o la app en segundo plano no hay Bluetooth. La reconexión ocurre en cuanto la app vuelve a estar visible.
- **Indicador discreto en la cabecera** (solo si hay una banda guardada): *Buscando pulsómetro…* · *♥ 128 · Z3 · 🔋 85 %* · *Desconectado*. Al tocarlo se va a Perfil.

## 2. Métricas

- **Frecuencia cardíaca:** característica 0x2A37, como hasta ahora.
- **Batería:** servicio 0x180F, característica 0x2A19. Se lee al conectar, se activan notificaciones si la banda las permite y, si no, se vuelve a leer cada 5 minutos.
- **Zonas (FC máx. = 220 − edad):**

  | Zona | % FC máx. | Nombre |
  |---|---|---|
  | Z1 | < 60 % | Recuperación |
  | Z2 | 60–70 % | Aeróbica suave |
  | Z3 | 70–80 % | Aeróbica |
  | Z4 | 80–90 % | Umbral |
  | Z5 | ≥ 90 % | Máximo |

  El pulso orientativo del LISS pasa a calcularse también con 220 − edad.
- **Calorías reales:** fórmula de Keytel et al. (2005), por minuto:
  - hombre: (−55,0969 + 0,6309·FC + 0,1988·peso + 0,2017·edad) / 4,184;
  - mujer: (−20,4022 + 0,4472·FC − 0,1263·peso + 0,074·edad) / 4,184.

  Se integra sobre las lecturas; cada tramo entre dos lecturas cuenta como máximo 10 s, así que los huecos no suman. El resultado nunca baja del gasto en reposo (TMB/1440 por minuto).
- **Balance del día:** las actividades y los partidos suman sus kcal **reales** si tienen pulso y, si no, las estimadas por MET. Las sesiones de gimnasio muestran sus kcal reales en el resumen y el historial, **pero no se suman**: el gasto estimado del perfil ya incluye los días de gimnasio y se contarían dos veces.

## 3. Modulación del esfuerzo

- **Alerta de zona:** en el cardio suave (temporizador de LISS o día de cardio suave) y en las actividades en vivo de un día de descanso, si el pulso supera el 70 % de la FC máxima aparece el aviso *"Vas en Z3: baja el ritmo para quedarte en Z2"*, con vibración. Como mucho una vez por minuto.
- **Descanso inteligente en pesas:** es una opción del perfil (activada por defecto si hay pulsómetro).
  - Durante el descanso se ve el pulso en vivo y la cifra objetivo: *< 115 ppm*.
  - Cuando el pulso baja de 115 y han pasado al menos 30 s, el descanso termina solo con el aviso *"Pulso recuperado: siguiente serie"*.
  - Si no baja, el temporizador normal sigue como siempre.

## 4. Grabar deporte o partido en vivo

- **Dónde está:** el botón **"Iniciar actividad en vivo"** está en la tarjeta de actividad de Hoy; el día de partido aparece además como **"Grabar partido en vivo"**. Se elige deporte y tipo.
- **Pantalla en vivo:** cronómetro grande, pulso, zona, batería, estado de la banda y la lista de reconexiones (*"Reconectado a las 21:14"*). La pantalla se mantiene encendida.
- **Persistencia:** `u.live = {sport, type, start, reconnects:[t]}` se guarda y se sincroniza, así que al recargar o cambiar de pestaña la grabación sigue. Las lecturas de pulso van en `localStorage` (`forja.live.samples`), no en la nube.
- **Si la banda se desconecta:** la grabación sigue activa, el estado pasa a *Buscando pulsómetro…* y la reconexión automática se encarga. Al volver, se anota la hora.
- **Finalizar partido:** se confirman el tipo o la posición y el RPE (propuesto a partir del pulso medio: Z1–2 → 4, Z3 → 6, Z4 → 8, Z5 → 9).
  - Se guarda la actividad con los minutos totales, `hr:{avg,max}`, las kcal reales (el tiempo sin pulso se completa con la estimación MET) y las estimadas.
  - La fatiga se aplica como en cualquier actividad registrada.

## 5. Datos

- `localStorage`: `forja.hr = {id, name}` y `forja.live.samples = [{t, v}]`.
- Estado del usuario (sincronizado): `u.settings.smartRest`, `u.live`, `activity.hr`, `activity.kcalReal`, `activity.reconnects`, `h.hr`, `h.kcalReal`.

## 6. Pruebas

`tests/hr.test.js`:

- zonas;
- Keytel para hombre y mujer, con el mínimo de reposo;
- integración con huecos;
- lectura de la batería;
- `restReady`;
- RPE sugerido a partir del pulso;
- resumen de la grabación (kcal reales y MET para los huecos).

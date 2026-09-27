# Registro de Actividades y Deportes Extra

Fecha: 2026-09-28 · Estado: decisiones tomadas por Claude con autorización del usuario (pendiente de revisión a posteriori)

## 1. Objetivo

Registrar deportes y actividades fuera del gimnasio (fútbol, futsal, running, ciclismo, pádel u otros) y usarlos para:

1. Estimar las calorías quemadas y la fatiga de piernas.
2. Recomendar, y aplicar, menos carga de piernas en el gimnasio tras un partido intenso en las últimas 24–48 h.
3. Sumar esas calorías al objetivo calórico del día.
4. Dejar preparada la conexión de un pulsómetro Bluetooth (Web Bluetooth API).

## 2. Dónde aparece

La barra de navegación ya tiene 6 pestañas, así que no se añade otra.

- **Hoy:** tarjeta **"Actividad reciente"** con las actividades de las últimas 48 h, la recomendación de fatiga y el botón **"Registrar actividad"**.
- **Progreso:** sección **"Registro de Actividades y Deportes Extra"** con el historial completo, borrado de actividades y minutos de la semana. Los minutos de deporte cuentan para el objetivo semanal de cardio.
- **Perfil:** tarjeta **"Pulsómetro Bluetooth"**.

## 3. Cuestionario después de la actividad (hoja inferior)

| Campo | Valores |
|---|---|
| Deporte | Fútbol · Futsal · Running · Ciclismo · Pádel · Otro (con nombre libre) |
| Tipo de juego o posición | depende del deporte (tabla §4) |
| Duración | minutos, de 5 a 600 |
| Esfuerzo (RPE) | 1–10 |
| Distancia | opcional, solo en Running y Ciclismo (km) |
| Cuándo | fecha y hora; por defecto, ahora (no se admiten fechas futuras) |

Al terminar se muestra el resultado: kcal estimadas, fatiga de piernas (baja, moderada o alta) y qué cambia en el gimnasio.

## 4. Cálculos

**Calorías** = MET × factor de RPE × peso (kg) × horas, con factor de RPE = 0,7 + 0,06 × RPE (RPE 5 → 1,0; RPE 10 → 1,3). Si no hay peso en el perfil se usan 70 kg y se indica. Los MET son orientativos, basados en el *Compendium of Physical Activities*.

**Fatiga de piernas (0–100)** = mín(100, carga de piernas × RPE × minutos / 6). Niveles: < 30 baja · 30–59 moderada · ≥ 60 alta.

| Deporte | Tipo | MET | Carga de piernas |
|---|---|---|---|
| Fútbol | Portero | 5 | 0,5 |
| | Defensa | 9 | 0,9 |
| | Centrocampista | 10 | 1,0 |
| | Delantero | 9,5 | 1,0 |
| | Partido recreativo | 7 | 0,8 |
| Futsal | Jugador de campo (alta intensidad discontinua) | 10 | 1,1 |
| | Portero | 5 | 0,5 |
| | Recreativo | 7,5 | 0,9 |
| Running | Rodaje suave | 8 | 0,7 |
| | Tempo | 10,5 | 0,9 |
| | Series o intervalos | 11,5 | 1,0 |
| | Tirada larga | 9 | 0,9 |
| | Trail | 9,5 | 1,0 |
| Ciclismo | Paseo | 5 | 0,5 |
| | Ruta moderada | 8 | 0,8 |
| | Intervalos | 10 | 0,9 |
| | Montaña (MTB) | 8,5 | 0,9 |
| Pádel | Recreativo | 6 | 0,6 |
| | Competitivo | 8 | 0,7 |
| Otro | Continuo moderado | 6 | 0,6 |
| | Intermitente intenso | 8 | 0,8 |
| | Técnico o de baja intensidad | 4 | 0,3 |

## 5. Integración con el gimnasio

**Fatiga acumulada** = suma de la fatiga de las actividades × decaimiento, con un tope de 100. El decaimiento es 1 en las primeras 24 h, 0,6 entre 24 y 48 h y 0 a partir de 48 h. El deporte que más aporta es el que da nombre a la recomendación.

| Fatiga acumulada | Recomendación | Qué se aplica automáticamente |
|---|---|---|
| ≥ 60 | *"Recomendación: reduce la carga de piernas un 15 % hoy por fatiga acumulada de Futsal"* | Pesos sugeridos de los ejercicios de pierna al 85 %; el HIIT de ese día pasa a cardio suave |
| 35–59 | Reducir la carga de piernas un 10 % | Pesos de pierna al 90 % |
| < 35 | — | Nada |

- Se aplica al empezar la sesión: afecta al peso propuesto, no a las cargas guardadas, así que la progresión no se pierde.
- El botón **"No aplicar hoy"** lo desactiva solo para ese día.
- Si la sesión de hoy no tiene pierna, se muestra *"Hoy no hay pierna: buen día para recuperar"*.

**Balance calórico:** objetivo del día = (gasto estimado + kcal de deporte de hoy) × factor del objetivo (−20 %, +10 % o 0 % + ajustes de los check-ins). Así, perder grasa mantiene el mismo déficit porcentual. Se muestra en Hoy y en el resumen del perfil como *"hoy: X kcal (+Y por deporte)"*.

## 6. Pulsómetro Bluetooth (preparado para el futuro)

- `js/hr.js`: `hrSupported()`, `hrConnect()`, que solicita un dispositivo con el servicio `heart_rate` y se suscribe a `heart_rate_measurement`; `hrDisconnect()`; `parseHeartRate(DataView)`, que sigue el formato GATT (el bit 0 de los *flags* indica si el valor es uint8 o uint16), y `onHr(cb)`.
- **Perfil:** botón **"Conectar pulsómetro Bluetooth"** que muestra el estado y las pulsaciones en vivo, y botón para desconectar. En navegadores sin Web Bluetooth (Safari/iPhone) se explica que no está disponible. Samsung Internet puede no soportarlo; en Chrome para Android sí funciona.
- **Durante la sesión:** si hay pulsómetro conectado, en la cabecera aparece *"♥ 132 ppm"* y se guardan la media y el máximo de la sesión (`h.hr = {avg, max}`).
- No se guarda nada del dispositivo, solo las pulsaciones de cada sesión.

## 7. Datos

```js
u.activities = [{ id, date, sport, type, name?, min, rpe, km?, kcal, fatigue, level: 'low'|'moderate'|'high' }] // máximo 200
u.fatigueSkip = 'AAAA-MM-DD'   // día en que el usuario dijo "No aplicar hoy"
```

Se guardan en `localStorage` y en Supabase dentro del estado del usuario, sin cambiar el esquema de la base de datos.

## 8. Pruebas

`tests/activities.test.js` y `tests/hr.test.js`:

- kcal y fatiga de casos conocidos, y los umbrales de nivel;
- decaimiento a las 12 h, 30 h y 50 h;
- 15 % / 10 % / 0 según la fatiga acumulada;
- el HIIT pasa a LISS con fatiga alta;
- suma al balance calórico;
- lectura del pulso en uint8 y uint16.

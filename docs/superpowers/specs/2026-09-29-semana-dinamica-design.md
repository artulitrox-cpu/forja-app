# Planificación dinámica de la semana

Fecha: 2026-09-29 · Estado: aprobado en conversación (el usuario prescindió de revisar el documento)

Subproyecto 1 de 3. Los siguientes son el pulsómetro completo y la grabación de partidos en vivo.

## Reglas

- **Deportes habituales:** `profile.sports=[{sport,wd}]`, configurados en Perfil. **Partidos de una semana:** se añaden o quitan en *Plan > Esta semana*.
- **Día de partido:** sin gimnasio (`type:'match'`). En Hoy aparecen "Hoy: \<deporte\>", el botón *Registrar partido* con el deporte ya elegido y el recordatorio del ajuste de fatiga de mañana. El partido cuenta como hecho cuando hay una actividad registrada ese día.
- **Víspera de partido:** nada de pierna principal (sentadilla o bisagra) ni HIIT.
  - Si esa sesión llevaba pierna principal, se intercambia con una sesión posterior de la semana que no la lleve.
  - Si no hay ninguna, queda solo el tren superior (`dayIdx:null`, que no avanza la rotación, así que la sesión de pierna sigue pendiente).
  - Si en la víspera tocaba HIIT, pasa a cardio suave.
- **Día siguiente:** se mantiene el ajuste de fatiga que ya existe al registrar el partido.
- **Reparto:** los días de gimnasio son los habituales (o los de esa semana) más los extra, menos los días de partido y los de "no voy". Los días de fuerza y cardio se reparten igual que ahora, pero **cada partido resta un día de cardio**.
- **"Hoy no puedo ir":** el día se marca como `skips`. La sesión pendiente se corre al siguiente día de gimnasio, porque la rotación va en orden. Si esa semana queda algún día libre posterior, Hoy ofrece añadirlo. El ciclo no se toca.
- **Día extra:** se añade a `extras`. Toca lo que siga en la rotación; si es víspera de partido, se aplica la regla anterior. Si ya se llega al máximo de días de fuerza del objetivo, ese día pasa a cardio.
- **Partido de último minuto:** marca el partido en ese día; el efecto es el mismo que "no voy" más el partido.
- **Deshacer:** cada cambio queda en `log` y se puede deshacer de forma individual con la operación inversa. *Volver a mi semana habitual* borra la semana.

## Datos

```js
u.weeks['AAAA-MM-DD'] = { days?:[wd], matches:{ [wd]: sport | null }, skips:[wd], extras:[wd], noOffer?:bool,
                          log:[{ id, type:'skip'|'extra'|'match'|'unmatch', wd, sport?, prev? }] }
```

En `matches`, `null` indica que se quita un deporte habitual esa semana. Las semanas que eran una lista de días (`[wd]`) se leen como `{days:[wd]}`.

## Pruebas

`tests/week.test.js`:

- el partido habitual bloquea el gimnasio y cuenta como cardio;
- la víspera: intercambio, versión de tren superior y HIIT que pasa a LISS;
- "no voy" corre la rotación y detecta días libres;
- día extra: rotación y tope de fuerza;
- partido de último minuto;
- deshacer cada cambio;
- migración del formato antiguo de semana.

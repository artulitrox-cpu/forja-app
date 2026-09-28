# Forja: app de entrenamiento

App web sin compilación (`index.html` + `js/*.js`). Guarda los datos en el navegador y, si inicias sesión, los sincroniza con Supabase para verlos en varios dispositivos.

## Qué hace

- **Plan semanal por objetivo:** reparte fuerza, cardio suave (LISS) y HIIT entre los días que puedes ir al gimnasio, dentro de tu tiempo máximo por sesión. Cada semana se puede editar en *Plan > Esta semana*.
- **Semana dinámica:** deportes habituales en *Mi perfil* y partidos de cada semana en *Plan > Esta semana*. El día de partido no hay gimnasio y la víspera se evita la pierna pesada y el HIIT. En Hoy: *Hoy no puedo ir* (la sesión se corre y, si se pierde, te ofrece un día libre), *Tengo partido hoy* y *Agregar día de entrenamiento extra*. Cada cambio se puede deshacer.
- **Sesión por bloques:** movilidad → fuerza → cardio/HIIT → estiramientos, con temporizador guiado a pantalla completa.
- **Actividades y deportes extra:** registra fútbol, futsal, running, ciclismo, pádel u otros (Hoy > *Registrar actividad*). Calcula calorías y fatiga de piernas, ajusta el objetivo calórico del día y, tras un partido intenso, baja la carga de piernas del gimnasio (15 % o 10 %) durante 24–48 h.
- **Pulsómetro Bluetooth (banda de pecho):** se empareja una vez en *Mi perfil* y se reconecta solo cuando el navegador lo permite (Chrome con `getDevices()`; si no, un toque en el indicador de la cabecera). Muestra pulso, zona (FC máx. = 220 − edad) y batería. Calcula calorías reales (Keytel), avisa si pasas de Z2 en cardio suave o en días de descanso y tiene *descanso inteligente*: la siguiente serie empieza cuando el pulso baja de 115 ppm.
- **Grabar deporte o partido en vivo:** *Iniciar actividad en vivo* en Hoy (o *Grabar partido en vivo* el día de partido). Cronómetro con pulso; si la banda se desconecta, la grabación sigue y anota la reconexión. Al finalizar guarda tiempo, pulso medio y máximo, kcal reales y aplica la fatiga al gimnasio. Mantén Forja abierta en pantalla: una app web no recibe Bluetooth en segundo plano.
- **Lesiones y Recuperación:** eliges el músculo sobre la figura, respondes un triaje rápido y la app sustituye u omite los ejercicios afectados hasta que te das de alta. Es una estimación orientativa, no un diagnóstico.

## Código

| Archivo | Contenido |
|---|---|
| `index.html` | estilos, vistas y eventos |
| `js/catalog.js` | ejercicios, máquinas de cardio, HIIT, movilidad y estiramientos |
| `js/plan.js` | generador del plan, reparto semanal, acondicionamiento, límite de tiempo, migración de datos |
| `js/injuries.js` | triaje y bloqueo/sustitución por lesiones |
| `js/activities.js` | deportes extra: calorías, fatiga de piernas, balance calórico |
| `js/hr.js` | pulsómetro Bluetooth (Web Bluetooth, perfil Heart Rate) |
| `js/bodymap.js` | figura anatómica SVG |
| `js/timer.js` | temporizadores y pantalla encendida |
| `js/sync.js` | Supabase |
| `js/figures.js` | figuras animadas de la técnica |

**Publicación protegida:** cada push a `main` ejecuta en GitHub Actions las pruebas (`npm test`) y una prueba de humo en Chromium (`tools/smoke.js`). Solo si pasan se publica en GitHub Pages (requiere *Settings > Pages > Source: GitHub Actions*).

Pruebas: `npm test` (Node 20 o superior, sin dependencias). Para probar los temporizadores rápido, abre la app con `?fast=1`.

## 1. Supabase

1. **Seguridad:** si la *secret key* se ha compartido en algún sitio, rótala en *Project Settings > API Keys*. Nunca debe ir en este repositorio ni en el navegador. La app solo usa la *publishable key*.
2. **SQL Editor:** pega el contenido de `supabase/schema.sql` y pulsa *Run*.
3. **Authentication > Sign In / Providers:** deja activado *Email*. Para pruebas rápidas puedes desactivar *Confirm email*.
4. **Authentication > URL Configuration:** pon como *Site URL* y en *Redirect URLs* la dirección de GitHub Pages, por ejemplo `https://artulitrox-cpu.github.io/forja-app/`.
5. **Project URL:** ya está configurada en `index.html` (`SB_URL_DEFAULT`).

## Notificaciones push (opcional)

1. **SQL Editor:** pega `supabase/push.sql` y pulsa *Run*.
2. **Edge Functions > Deploy a new function > Via Editor:** nombre `send-reminders`, pega `supabase/functions/send-reminders/index.ts` y despliega. En sus ajustes, desactiva *Verify JWT* (el cron la llama sin clave; solo envía avisos que ya tocaban).
3. **Edge Functions > Secrets** (no en Vault): añade `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` con los valores de `.secrets/vapid.json` (archivo local, no está en GitHub). La pública debe coincidir con `VAPID_PUBLIC` de `js/push.js`.
4. **Cron:** con la extensión `pg_cron` activada, ejecuta `supabase/cron.sql` en el SQL Editor (llama a la función cada 15 minutos).
5. En la app: *Mi perfil > Notificaciones > Activar*.

## 2. GitHub Pages

1. Crea un repositorio, por ejemplo `forja-app`.
2. Sube `index.html`, `.nojekyll`, `README.md` y la carpeta `supabase/`.
3. Ve a *Settings > Pages > Build and deployment*, elige *Deploy from a branch*, la rama `main` y la carpeta `/ (root)`.
4. En uno o dos minutos la app estará en `https://artulitrox-cpu.github.io/forja-app/`.

## 3. Uso en varios dispositivos

1. Abre la URL, ve a *Mi perfil > Cuenta y sincronización* y crea tu cuenta.
2. En otro dispositivo, abre la misma URL y pulsa *Entrar* con la misma cuenta.

La sincronización ocurre así:
- Los cambios se suben 1,5 s después de guardar.
- Los datos se descargan al iniciar sesión, al volver a la pestaña y cada 90 s.
- Si hay conflicto, gana la versión más reciente de cada perfil.
- Sin conexión, la app sigue funcionando en local y sube los cambios al reconectar.

## 4. Instalar en el teléfono

Forja es una app web instalable (PWA): queda un icono en la pantalla de inicio y se abre a pantalla completa, incluso sin conexión.

- **Android (Chrome o Samsung Internet):** abre la URL y pulsa *Instalar* en la tarjeta "Instala Forja". Si no aparece, usa el menú del navegador > *Añadir a pantalla de inicio* / *Instalar app*.
- **iPhone (Safari):** botón *Compartir* > *Añadir a pantalla de inicio*.

Archivos: `manifest.webmanifest` (nombre, colores, iconos), `sw.js` (caché para abrir sin conexión) e `icon-*.png`. Si cambias `sw.js`, sube el número de `CACHE` (`forja-v1` → `forja-v2`) para que los teléfonos descarguen la versión nueva.

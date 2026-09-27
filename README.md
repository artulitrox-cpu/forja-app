# Forja: app de entrenamiento

App web de un solo archivo (`index.html`). Guarda los datos en el navegador y, si inicias sesión, los sincroniza con Supabase para verlos en varios dispositivos.

## 1. Supabase

1. **Seguridad:** si la *secret key* se ha compartido en algún sitio, rótala en *Project Settings > API Keys*. Nunca debe ir en este repositorio ni en el navegador. La app solo usa la *publishable key*.
2. **SQL Editor:** pega el contenido de `supabase/schema.sql` y pulsa *Run*.
3. **Authentication > Sign In / Providers:** deja activado *Email*. Para pruebas rápidas puedes desactivar *Confirm email*.
4. **Authentication > URL Configuration:** pon como *Site URL* y en *Redirect URLs* la dirección de GitHub Pages, por ejemplo `https://artulitrox-cpu.github.io/forja-app/`.
5. **Project URL:** ya está configurada en `index.html` (`SB_URL_DEFAULT`).

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

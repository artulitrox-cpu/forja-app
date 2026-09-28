// Copia a js/vendor/ los scripts de Capacitor y de los plugins nativos (formato IIFE, sin compilación).
// La web solo los carga dentro de la app de Android (ver index.html). Ejecutar tras actualizar esas dependencias:
//   npm run vendor
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'vendor');
const FILES = {
  'capacitor.js': '@capacitor/core/dist/capacitor.js',               // define capacitorExports
  'ble.js': '@capacitor-community/bluetooth-le/dist/plugin.js',       // define capacitorCommunityBluetoothLe
  'fgs.js': '@capawesome-team/capacitor-android-foreground-service/dist/plugin.js', // define capacitorForegroundService
  'localnotif.js': '@capacitor/local-notifications/dist/plugin.js', // define capacitorLocalNotifications
};
fs.mkdirSync(OUT, { recursive: true });
for (const [name, rel] of Object.entries(FILES)) {
  const src = path.join(ROOT, 'node_modules', rel);
  // Sin el comentario de source map (el .map no se copia).
  const code = fs.readFileSync(src, 'utf8').replace(/\/\/# sourceMappingURL=.*$/m, '');
  fs.writeFileSync(path.join(OUT, name), code);
  console.log(`js/vendor/${name} <- ${rel}`);
}

// Compila el APK con el gradlew de cada sistema (Windows o Mac/Linux).
const { spawnSync } = require('child_process');
const win = process.platform === 'win32';
const r = spawnSync(win ? 'gradlew.bat' : './gradlew', ['assembleDebug'], { cwd: 'android', stdio: 'inherit', shell: win });
process.exit(r.status ?? 1);

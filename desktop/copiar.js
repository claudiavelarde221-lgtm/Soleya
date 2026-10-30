// Copia la app web (../app) dentro de esta carpeta para empaquetarla.
const fs = require('fs'), path = require('path');
const from = path.join(__dirname, '..', 'src'), to = path.join(__dirname, 'app');
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log('App copiada');

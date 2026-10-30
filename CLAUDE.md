# Soleya

App de inventario, ventas, cobros y envíos de Soleya Store (ropa y hogar). Hablar con la dueña en español, en lenguaje sencillo.

## Estructura

- `src/` — la app web completa; es la única fuente de verdad. `app.js` (lógica y pantallas), `styles.css`, `sw.js`, `manifest.webmanifest`, `qrcode.js` (librería MIT).
- `android/` — Capacitor. `webDir` es `src`. El plugin `SoleyaPrintPlugin.java` abre la impresión de Android (el WebView no imprime solo).
- `desktop/` — Electron. `copiar.js` copia `src/` a `desktop/app/` antes de empaquetar.
- `releases/` — instaladores finales. Se reemplazan al regenerar.
- `docs/` — instalación y `marca/` (logo y arte originales).

## Reglas

- **El logo original no se modifica** (`src/icons/logo-negro.png`): círculo negro con dorado.
- Diseño aprobado: opción A, fucsia `#D81B80` y blanco, con azul claro como segundo color. Letras: Cormorant Garamond (títulos) y Poppins (texto).
- Todo funciona sin internet; no agregar dependencias externas en tiempo de ejecución.
- Los datos están en `localStorage` (clave `soleya.v1`); cualquier cambio de formato debe migrar los datos existentes.
- Cada cambio en `src/` exige regenerar APK y EXE (`npm run apk`, `npm run exe`) y copiarlos a `releases/`.
- Al EXE se le desactivó la firma (`signAndEditExecutable: false`) porque Windows bloquea los enlaces simbólicos sin permisos.

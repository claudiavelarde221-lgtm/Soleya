# Soleya

App de inventario, ventas, cobros y envíos de Soleya Store (ropa y hogar). Hablar con la dueña en español, en lenguaje sencillo.

## Estructura

- `src/` — la app web completa; es la única fuente de verdad. `app.js` (lógica y pantallas), `styles.css`, `sw.js`, `manifest.webmanifest`, `qrcode.js` (librería MIT).
- `android/` — Capacitor. `webDir` es `src`. El plugin `SoleyaPrintPlugin.java` abre la impresión de Android (el WebView no imprime solo).
- `desktop/` — Electron. `copiar.js` copia `src/` a `desktop/app/` antes de empaquetar.
- `releases/` — instaladores finales. Se reemplazan al regenerar.
- `docs/` — instalación y `marca/` (logo y arte originales).

## Recordatorio para Claude (leer primero)

La dueña pidió que, **apenas ella escriba en la próxima conversación (lunes, o el domingo en la tarde, cuando use el computador), le recuerdes la llave de firma fija del APK** (ver "Pendiente" más abajo). Recuérdaselo al responder su primer mensaje, antes de seguir con lo demás, y ofrécele hacerlo con un secreto de GitHub. Cuando quede hecho, borra este recordatorio.

## Reglas

- **El logo original no se modifica** (`src/icons/logo-negro.png`): círculo negro con dorado.
- Diseño aprobado: opción A, fucsia `#D81B80` y blanco, con azul claro como segundo color. Letras: Cormorant Garamond (títulos) y Poppins (texto).
- Todo funciona sin internet; no agregar dependencias externas en tiempo de ejecución.
- Los datos están en `localStorage` (clave `soleya.v1`); cualquier cambio de formato debe migrar los datos existentes.
- Cada cambio en `src/` exige regenerar APK y EXE (`npm run apk`, `npm run exe`) y copiarlos a `releases/`.
- Al EXE se le desactivó la firma (`signAndEditExecutable: false`) porque Windows bloquea los enlaces simbólicos sin permisos.

## Estado actual (versión 1.6)

- Los instaladores se compilan solos en GitHub Actions (`.github/workflows/compilar.yml`): pestaña Actions → última ejecución → Artifacts (`Soleya-apk`, `Soleya-exe`). El `releases/Soleya.apk` guardado es una versión vieja.
- Ícono y pantalla de inicio de Android con el logo de Soleya sobre fucsia (`android/app/src/main/res`).
- Ventas: filtros Todas / Con saldo / Pago total / Envíos. Los abonos se registran solo en Cobros.
- Nueva venta: sugerencias de cliente debajo del campo; categorías en una fila deslizable.
- Inventario: total en dinero y unidades al final de la lista de categorías. No hay botón "+ Producto" arriba (se agrega dentro de cada categoría).
- Ajustes → "Guardar copia" / "Cargar copia" pasan todos los datos a otra versión o aparato.
- **Pendiente:** llave de firma fija para el APK. Hoy cada compilación en GitHub firma distinto, así que instalar una versión nueva obliga a guardar copia, desinstalar, instalar y cargar la copia. No guardar la llave ni su contraseña dentro del repositorio; usar un secreto de GitHub.
- Ideas por hacer: aviso de copia de seguridad, editar ventas, reporte del mes, exportar a Excel, clave de acceso.

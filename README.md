# Soleya

Aplicación para llevar el negocio de Soleya Store: inventario por categorías (con fotos), ventas y pedidos, cobros de fiados y abonos de los sábados, y envíos nacionales con rótulo y nota de gracias para imprimir. Funciona en Android (APK) y en Windows (EXE), sin internet.

## Stack

| Área | Tecnología |
|---|---|
| Interfaz | HTML, CSS y JavaScript puro (sin frameworks) |
| Datos | Guardados en el propio aparato (`localStorage`), con copia de seguridad en JSON |
| Móvil | Capacitor (Android) + plugin propio de impresión |
| Escritorio | Electron (EXE portable) |

## Comandos

Requisitos: Node.js, Java 17 y el SDK de Android (para el APK).

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en el navegador (http://localhost:5190) |
| `npm run apk` | Genera el APK en `android/app/build/outputs/apk/debug/` |
| `npm run exe` | Genera el EXE en `desktop/dist/` |

Después de generar, copiar `Soleya.apk` y `Soleya.exe` a [`releases/`](releases/).

## Estructura

```
src/          la app web (index.html, app.js, styles.css, sw.js, manifest)
  fonts/        tipografías incluidas (funciona sin internet)
  icons/        logo e íconos
android/      proyecto Android (Capacitor) y plugin de impresión
desktop/      envoltorio Electron para el EXE de Windows
docs/         instalación y material de marca (docs/marca/)
releases/     instaladores listos: Soleya.apk y Soleya.exe
```

Reglas y convenciones: [`CLAUDE.md`](CLAUDE.md). Cómo instalar: [`docs/INSTALAR.txt`](docs/INSTALAR.txt).

# ChalaScrape

Extensión para Google Chrome, Microsoft Edge y Mozilla Firefox (Manifest V3) que extrae tablas, listas y tarjetas de cualquier web a Excel (`.xlsx`) o CSV con un clic. La extracción corre 100 % en el navegador; el único servidor es el de licencias.

## Estructura

| Carpeta | Qué es |
|---|---|
| `manifest.json`, `background.js` | Manifest V3 (`v1.0.1`) y service worker. Permisos: `sidePanel`, `activeTab`, `scripting`, `storage`. |
| `content/` | Detector de patrones repetitivos, resaltado y extracción (`detector.js`, `overlay.css`). Se inyecta bajo demanda. |
| `sidepanel/` | Panel lateral: vista previa editable, paginación, exportación y licencias (`index.html`, `styles.css`, `app.js`, `license.js`). |
| `icons/` | Logotipo SVG e iconos PNG (`16`, `32`, `48`, `128`). |
| `lib/` | SheetJS 0.20.3 (`xlsx.full.min.js`), incluido localmente. |
| `_locales/` | Español (`es`, por defecto) e inglés (`en`). |
| `server/` | Backend de licencias con PayPal (Vercel Function, sin base de datos). |
| `scripts/pack.ps1` | Empaquetador que genera `dist/ChalaScrape-<versión>.zip` (Chrome/Edge) y `dist/ChalaScrape-<versión>-firefox.zip` (Firefox AMO con `sidebar_action`). |
| `store/` | Fichas (`LISTING.md`, `CHROME.md`, `GUIA.md`) y capturas (`store/screenshots/`). |
| `dist/` | Paquetes `.zip` listos para subir a Chrome Web Store, Microsoft Edge Add-ons y Mozilla Firefox AMO. |
| `test/` | Pruebas (`e2e.mjs`, `smoke.html`, `demo.html`). No van en el ZIP de la tienda. |

## Cargar la extensión

1. **Chrome / Edge:** abre `chrome://extensions` (o `edge://extensions`), activa **Modo de desarrollador**, pulsa **Cargar descomprimida** y elige la raíz de este repositorio.
2. **Mozilla Firefox (carga temporal):** ejecuta `scripts\pack.ps1`, abre `about:debugging#/runtime/this-firefox`, pulsa **Cargar complemento temporal…** y selecciona `dist/ChalaScrape-1.0.1-firefox.zip`.
3. Abre una página con un listado y haz clic en el icono de ChalaScrape.

Para probar el plan Pro en desarrollo, pulsa la insignia **FREE** e ingresa `CHALA-DEV-2026`. Esa clave solo funciona en instalaciones sin empaquetar.

## Estado y tiendas

- **Microsoft Edge Add-ons:** Publicada — [ChalaScrape en Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/chalascrape-datos-web-a-/onapjfkfnjifcegfkcdnjdobfddmddgi).
- **Mozilla Firefox Add-ons (AMO):** envío registrado en revisión (`chalascrape`, ID `3141737`, `chalascrape@chaladev.site`, `sidebar_action`).
- **Chrome Web Store:** en espera por límite de cupo de publicaciones en la cuenta. Detalle en [store/LISTING.md](store/LISTING.md) y [store/CHROME.md](store/CHROME.md).
- **Sitio oficial (Suite Chala):** [chaladev.site](https://chaladev.site/) · **Contacto:** [info@chaladev.site](mailto:info@chaladev.site)
- **Versión `1.0.1`** preparada (usa `scrape.chaladev.site`), pendiente de lanzamiento: pasos en [store/LISTING.md](store/LISTING.md), sección 10.
- **Backend de licencias:** `chalascrape.vercel.app` y `scrape.chaladev.site` (mismo proyecto de Vercel).

## Planes

- **Free:** detección y vista previa ilimitadas; exporta CSV con un máximo de 50 filas.
- **Pro (pago único de 9.99 USD con PayPal):** filas ilimitadas, paginación automática, scroll infinito y exportación a Excel.

## Licencias con PayPal

La clave de licencia es el ID del cobro en PayPal. El backend la valida consultándole a PayPal, así que un reembolso revoca Pro.

1. Crea una app REST en [developer.paypal.com](https://developer.paypal.com) y copia su Client ID y su Secret.
2. Despliega `server/` en Vercel (Root Directory: `server`) con estas variables de entorno:

   | Variable | Valor |
   |---|---|
   | `PAYPAL_CLIENT_ID` | Client ID de la app |
   | `PAYPAL_CLIENT_SECRET` | Secret de la app |
   | `PAYPAL_ENV` | `sandbox` o `live` |
   | `PRICE` | Precio, p. ej. `9.99` |
   | `CURRENCY` | Moneda, p. ej. `USD` |

3. En `sidepanel/license.js`, pon la URL del despliegue en `SERVER` (hoy: `https://chalascrape.vercel.app`).

## Pruebas

```bash
# Backend con PayPal simulado
node server/test.mjs

# Extensión real en un navegador con perfil temporal
node test/e2e.mjs "C:\Program Files\Google\Chrome\Application\chrome.exe" "<ruta del repo>" "<carpeta temporal>"
```

`test/smoke.html` prueba el detector y el panel con `chrome.*` simulado: sirve la raíz por HTTP (`python -m http.server 8765`) y abre `/test/smoke.html`.

## Publicar

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pack.ps1
```

Genera `dist/ChalaScrape-<versión>.zip` (Chrome/Edge) y `dist/ChalaScrape-<versión>-firefox.zip` (`chalascrape@chaladev.site`, Firefox `>= 115.0` con `sidebar_action` y `data_collection_permissions`) solo con lo que necesita la extensión. El paso a paso para subirla a cada tienda, con todas las opciones, está en [store/GUIA.md](store/GUIA.md). Los textos para copiar están en [store/LISTING.md](store/LISTING.md).

## Suite Chala

**ChalaScrape** forma parte de la **Suite Chala** ([chaladev.site](https://chaladev.site/)) de extensiones para navegador enfocadas en privacidad, rendimiento y productividad:

- **[Chalablock](https://github.com/joelchala/Chalablock)** — Bloqueador de anuncios y rastreadores ligero (Manifest V3)
- **[ChalaCookiesEdit](https://github.com/joelchala/ChalaCookiesEdit)** — Editor de cookies local con soporte CHIPS, incógnito, bloqueo e inspector JWT
- **[ChalaDev](https://github.com/joelchala/ChalaDev)** — Suite de utilidades locales en el Side Panel para desarrolladores y diseñadores UI/UX
- **[ChalaReader](https://github.com/joelchala/ChalaReader)** — Modo lectura limpio con Shadow DOM, temas visuales, Markdown, PDF y guardado offline
- **[ChalaScrape](https://github.com/joelchala/ChalaScrape)** — Extractor visual de tablas, listas y tarjetas web a Excel (`.xlsx`) y CSV
- **[ChalaTabs](https://github.com/joelchala/ChalaTabs)** — Gestor de pestañas en espacios de trabajo, ahorro de RAM y buscador instantáneo
- **[ChalaVPN](https://github.com/joelchala/ChalaVPN)** — Proxy HTTPS/SOCKS5 con protección contra fugas de WebRTC

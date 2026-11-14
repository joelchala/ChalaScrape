# ChalaScrape

Extensión para Chrome y Edge (Manifest V3) que extrae tablas, listas y tarjetas de cualquier web a Excel (`.xlsx`) o CSV con un clic. La extracción corre 100 % en el navegador; el único servidor es el de licencias.

## Estructura

| Carpeta | Qué es |
|---|---|
| `manifest.json`, `background.js` | Manifest V3 y service worker. Permisos: `sidePanel`, `activeTab`, `scripting`, `storage`. |
| `content/` | Detector de patrones repetitivos, resaltado y extracción. Se inyecta bajo demanda. |
| `sidepanel/` | Panel lateral: vista previa editable, paginación, exportación y licencias. |
| `lib/` | SheetJS 0.20.3, incluido localmente. |
| `_locales/` | Español (por defecto) e inglés. |
| `server/` | Backend de licencias con PayPal (Vercel Function, sin base de datos). |
| `test/` | Pruebas. No van en el ZIP de la tienda. |

## Cargar la extensión

1. Abre `chrome://extensions` (o `edge://extensions`) y activa **Modo de desarrollador**.
2. **Cargar descomprimida** y elige la raíz de este repositorio.
3. Abre una página con un listado y haz clic en el icono de ChalaScrape.

Para probar el plan Pro en desarrollo, pulsa la insignia **FREE** e ingresa `CHALA-DEV-2026`. Esa clave solo funciona en instalaciones sin empaquetar.

## Estado (14/11/2026)

- **Edge Add-ons:** 1.0.0 en revisión desde el 14/11/2026. **Chrome Web Store:** en espera (cupo de extensiones). Detalle en [store/LISTING.md](store/LISTING.md) y [store/CHROME.md](store/CHROME.md).
- **1.0.1** preparada (usa `scrape.chaladev.site`), sin lanzar: pasos en [store/LISTING.md](store/LISTING.md), sección 10.
- **Backend:** `chalascrape.vercel.app` y `scrape.chaladev.site` (mismo proyecto de Vercel).

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

Genera `dist/ChalaScrape-<versión>.zip` solo con lo que necesita la extensión. El paso a paso para subirla a cada tienda, con todas las opciones, está en [store/GUIA.md](store/GUIA.md). Los textos para copiar están en [store/LISTING.md](store/LISTING.md).

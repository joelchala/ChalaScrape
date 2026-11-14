# ChalaScrape en Chrome Web Store

Resumen de lo que cambia en Chrome respecto a [LISTING.md](LISTING.md). El paso a paso con todas las opciones está en [GUIA.md](GUIA.md#4-chrome-web-store).
Panel de desarrollador: <https://chrome.google.com/webstore/devconsole>.

## 0. Antes de empezar: el límite de extensiones

El panel muestra **«Límite de extensiones: 2/2»** (Chalablock y ChalaVPN). Con el cupo lleno no se puede crear un elemento nuevo.
Una cuenta nueva admite como máximo dos extensiones publicadas. Hay que pedir el aumento desde ese mismo aviso antes de subir ChalaScrape; según la documentación la decisión suele ser inmediata.

## 1. Subir el paquete

**Nuevo elemento → subir** `dist/ChalaScrape-<versión>.zip` (el mismo zip de Edge).

ChalaScrape no usa inicio de sesión, así que no hay que registrar el ID del elemento en ningún otro servicio.

## 2. Ficha de Play Store (Store listing)

| Campo | Valor |
|---|---|
| Descripción | La de LISTING.md, sección 5 (español) o 6 (inglés) |
| Categoría | *Herramientas* (o *Flujo de trabajo y planificación*) |
| Idioma | Español; añade inglés si el panel lo ofrece |
| Icono de la tienda (128×128, con margen transparente) | `store/screenshots/icono-tienda-128.png` |
| Capturas (1280×800) | `store/screenshots/01-deteccion-tarjetas.png`, `02-tabla-detectada.png`, `03-plan-pro.png` |
| Mosaico promocional pequeño (440×280) | `store/screenshots/promo-440x280.png` |
| Sitio web oficial | `https://chalascrape.vercel.app` |
| URL de asistencia | `https://chalascrape.vercel.app/privacy.html` (contacto: `info@chaladev.site`) |

## 3. Prácticas de privacidad (Privacy practices)

- **Propósito único** y **justificación de cada permiso:** los textos en inglés de LISTING.md, sección 4.
  Chrome los pide por separado para `activeTab`, `scripting`, `sidePanel` y `storage`. No hay permisos de host.
- **¿Usa código remoto?** No.
- **Datos que se recopilan:** información de autenticación (la clave de licencia del plan Pro). Nada más:
  el contenido de las páginas se procesa en el navegador y no se transmite.
- **Las tres certificaciones:** marcarlas (no se venden datos, no se usan fuera del propósito, no se usan para crédito).
- **Política de privacidad:** `https://chalascrape.vercel.app/privacy.html`

## 4. Distribución

- **Pagos:** gratis, **con compras dentro de la aplicación** (el plan Pro se cobra fuera de la tienda, con PayPal).
- **Visibilidad:** pública. **Regiones:** todas.

## 5. Instrucciones de prueba (pestaña Cuenta / Test instructions)

Pegar las notas de certificación de LISTING.md, sección 7.

## 6. Antes de enviar a revisión

- [ ] Hay cupo para un elemento nuevo (paso 0). Negado el 14/11/2026; ver Estado.
- [ ] La cuenta de desarrollador tiene el correo de contacto verificado.
- [ ] `chalascrape.vercel.app` sigue en línea durante la revisión.

## 7. Estado

- **En espera.** Sin enviar: no hay cupo para crear el elemento.
- **14/11/2026:** Joel pidió el aumento del límite de extensiones y Chrome lo negó: «Tu cuenta de editor no cumple actualmente nuestros requisitos de antigüedad y actividad». El panel permite volver a pedirlo más adelante.
- **Plan:** esperar a que se publiquen las extensiones que están en revisión y volver a solicitar el aumento. Chrome no publica cuánta antigüedad o actividad exige, así que no hay fecha.
- El paquete y la ficha están listos; cuando haya cupo se sigue [GUIA.md](GUIA.md#4-chrome-web-store) desde el paso 4.1.

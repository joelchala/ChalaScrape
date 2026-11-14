# Ficha de ChalaScrape para Microsoft Edge Add-ons

Todo lo que hay que copiar en Partner Center, en el orden en que lo pide el formulario.
Para Chrome Web Store, ver [CHROME.md](CHROME.md): usa estos mismos textos.

## 1. Paquete

Genera el zip y sube `dist/ChalaScrape-<versión>.zip`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\pack.ps1
```

## 2. Disponibilidad

- **Visibilidad:** Pública.
- **Mercados:** todos.

## 3. Propiedades

- **Categoría:** Productividad (*Productivity*).
- **Contenido para adultos (Mature):** No.
- **URL del sitio web:** `https://chalascrape.vercel.app`
- **Contacto de soporte:** `info@chaladev.site`

## 4. Privacidad

**URL de la política de privacidad:** `https://chalascrape.vercel.app/privacy.html`

**Descripción de propósito único (Single purpose):**

> ChalaScrape has a single purpose: extracting the repeating data (tables, lists, cards) of the web page the user is viewing and exporting it to a CSV or Excel file. Auto-pagination, the editable preview and the license check exist only to support that purpose.

**Justificación de permisos** (una por permiso):

| Permiso | Justificación (pegar en inglés) |
|---|---|
| `activeTab` | Grants temporary access to the current tab only when the user clicks the toolbar icon, so the extension can read the repeating data on that page. No access to any other tab or site, and no host permissions are requested. |
| `scripting` | Injects the bundled detector script and its highlight stylesheet into the tab the user activated, to find tables, lists and repeated cards, outline them on the page and return their text, links and image URLs. |
| `sidePanel` | The whole interface (data preview, column editing, pagination controls and export buttons) lives in the browser side panel so it stays visible next to the page being extracted. |
| `storage` | Stores locally (chrome.storage.local) the extracted rows so they survive closing the panel, the user's column names and pagination settings, and the Pro license status. Nothing is synced. |

**¿Usa código remoto?** No. Todo el código va dentro del paquete. La única biblioteca de terceros es SheetJS Community Edition 0.20.3 (`lib/xlsx.full.min.js`, Apache-2.0), incluida sin modificar y minificada tal como la distribuye su autor; el resto del código no está minificado ni ofuscado.

**Uso de datos:**

- Marca **Authentication information**: la clave de licencia del plan Pro se envía a `chalascrape.vercel.app` para validarla.
- **No marques** *Website content*: el contenido de las páginas se procesa solo en el navegador y nunca se transmite.
- No marques historial, actividad, ubicación ni información personal.

Certifica las tres declaraciones (no se venden datos, no se usan para fines ajenos al propósito, no se usan para solvencia crediticia).

## 5. Ficha de la tienda — Español

- **Nombre** (viene del manifest): ChalaScrape: datos web a Excel y CSV
- **Descripción corta** (viene del manifest): Extrae tablas, listas y tarjetas de cualquier web a Excel (.xlsx) o CSV con un clic. Tus datos se procesan en tu navegador.
- **Logo (300×300):** `store/screenshots/logo-300x300.png`
- **Capturas (1280×800):** `store/screenshots/01-deteccion-tarjetas.png`, `02-tabla-detectada.png`, `03-plan-pro.png`
- **Mosaico promocional pequeño (440×280):** `store/screenshots/promo-440x280.png`
- **Términos de búsqueda:** `extraer datos web`, `web scraper`, `exportar a excel`, `tabla a csv`, `extraer tabla`

**Descripción:**

```
ChalaScrape convierte los datos de una página web en un archivo de Excel o CSV. Abre una página con una tabla, un listado o tarjetas de productos, haz clic en el icono y la extensión detecta sola los datos repetidos, los resalta en la página y te los muestra en una tabla lista para exportar.

QUÉ HACE
• Detección automática de tablas, listas y tarjetas repetidas (productos, directorios, resultados).
• Resalta en la página el bloque detectado. Con «Cambiar selección» alternas entre los grupos que encontró.
• Extrae el texto visible, los enlaces y las direcciones de las imágenes.
• Vista previa en el panel lateral: renombra columnas y elimina las que no necesites antes de exportar.
• Exporta a CSV (UTF-8, compatible con Excel: conserva tildes y ñ) y a Excel (.xlsx).
• Paginación automática: selecciona el botón «Siguiente» de la página o activa el scroll infinito, y la extensión va acumulando las filas.

PRIVACIDAD
• La extracción ocurre en tu navegador. El contenido de las páginas nunca se envía a ningún servidor.
• Solo lee la pestaña en la que haces clic en el icono. No pide acceso a todos tus sitios.
• Sin analítica y sin publicidad.

PLANES
• Gratis: detección y vista previa ilimitadas. Exporta a CSV hasta 50 filas por archivo.
• Pro (opcional, pago único de US$9.99 con PayPal): filas ilimitadas, paginación automática, scroll infinito y exportación a Excel (.xlsx). Se activa con una clave de licencia; la extensión la valida contra chalascrape.vercel.app.

LO QUE DEBES SABER
• Tú decides qué páginas extraer. Respeta los términos de uso de cada sitio y las leyes de protección de datos que te apliquen.
• Las páginas internas del navegador y las tiendas de extensiones no se pueden leer.

Política de privacidad y reembolsos: https://chalascrape.vercel.app/privacy.html
```

## 6. Ficha de la tienda — English

- **Search terms:** `web scraper`, `data extractor`, `export to excel`, `table to csv`, `scrape table`
- Mismas imágenes que en español.

**Description:**

```
ChalaScrape turns the data on a web page into an Excel or CSV file. Open a page with a table, a listing or product cards, click the icon, and the extension automatically detects the repeating data, highlights it on the page and shows it in a table ready to export.

WHAT IT DOES
• Automatic detection of tables, lists and repeated cards (products, directories, search results).
• Highlights the detected block on the page. "Change selection" cycles through the groups it found.
• Extracts visible text, links and image URLs.
• Preview in the side panel: rename columns and delete the ones you do not need before exporting.
• Exports to CSV (UTF-8, Excel-compatible, keeps accented characters) and Excel (.xlsx).
• Auto-pagination: select the page's "Next" button or turn on infinite scroll, and the extension keeps collecting rows.

PRIVACY
• Extraction happens in your browser. Page content is never sent to any server.
• It only reads the tab where you click the icon. It does not ask for access to all your sites.
• No analytics and no ads.

PLANS
• Free: unlimited detection and preview. Exports to CSV up to 50 rows per file.
• Pro (optional, one-time payment of US$9.99 via PayPal): unlimited rows, auto-pagination, infinite scroll and Excel (.xlsx) export. Activated with a license key, which the extension validates against chalascrape.vercel.app.

GOOD TO KNOW
• You decide which pages to extract. Respect each site's terms of use and the data-protection laws that apply to you.
• Internal browser pages and extension stores cannot be read.

Privacy policy and refunds: https://chalascrape.vercel.app/privacy.html
```

## 7. Notas para certificación (pegar en inglés)

```
No account or credentials are needed to test the core feature (free plan).

Optional paid plan: the extension offers an optional Pro license (one-time US$9.99, paid with PayPal at https://chalascrape.vercel.app). It only removes the free plan's 50-row export limit and unlocks Excel export and auto-pagination. The payment happens on that website, not inside the extension.

How to test:
1. Open any page with a table or a listing, for example https://books.toscrape.com/ or a Wikipedia article with a table.
2. Click the ChalaScrape toolbar icon. The side panel opens, the repeating data is outlined in cyan on the page and its rows appear in the preview table.
3. Click "Change selection" to cycle through other groups detected on the same page.
4. Rename a column by typing in its header, or remove one with the × button.
5. Click "Export CSV". A .csv file is downloaded (free plan: first 50 rows).
6. "Export Excel" and "Auto-pagination" open the upgrade dialog on the free plan.

Permissions: only activeTab, scripting, sidePanel and storage. No host permissions and no content scripts declared in the manifest; the detector script is injected into a tab only after the user clicks the toolbar icon on it.

Server dependency: the free plan makes no network requests. With a Pro license, the extension sends only the license key to https://chalascrape.vercel.app/api/paypal to validate it (on activation and at most once a day). Page content never leaves the browser.

Remote code: none. lib/xlsx.full.min.js is the unmodified SheetJS Community Edition 0.20.3 library (Apache-2.0), bundled locally to build the .xlsx and .csv files.

Data: no analytics, no ads, no personal data collected.
```

## 8. Antes de pulsar «Publicar»

- [x] El zip se genera con `scripts/pack.ps1` y la extensión extraída del zip pasa `test/e2e.mjs` en Edge (14/11/2026).
- [x] La política de privacidad está en línea en `https://chalascrape.vercel.app/privacy.html`.
- [x] El plan Pro se puede comprar: PayPal en modo Live a US$9.99. Verificado contra PayPal sin cobrar; **no se ha hecho una compra real**.
- [ ] El buzón `info@chaladev.site` recibe correo (es el contacto de soporte y de reembolsos).
- [ ] `chalascrape.vercel.app` estará en línea durante toda la revisión.
- [ ] La ficha no menciona otros navegadores ni otras tiendas.

## 9. Estado del envío

- **Enviado a revisión:** 14/11/2026, 07:17, versión 1.0.0. Estado en Partner Center: «In review». Microsoft indica hasta 7 días hábiles.
- **Store ID:** `0RDCKC32CR7V` · **CRX ID:** `onapjfkfnjifcegfkcdnjdobfddmddgi` · **Product ID:** `b99d44ce-b19b-4c06-a5f2-9b1657ae771d`
- **URL pública:** disponible cuando se publique. Será `https://microsoftedge.microsoft.com/addons/detail/onapjfkfnjifcegfkcdnjdobfddmddgi`.
- **Lo enviado:** categoría Productivity, visibilidad Public en 241 mercados, idiomas español e inglés, dato declarado «Authentication information», y las notas de certificación de la sección 7 con la opción «Yes, I need to provide credentials, accounts, or other info for testers».
- **Borrador creado:** 14/11/2026, con el paquete `ChalaScrape-1.0.0.zip`.
- Durante la revisión: mantener en línea `https://chalascrape.vercel.app` (tienda y política de privacidad).
- Al publicarse: anotar aquí la fecha y confirmar la URL.

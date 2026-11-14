# Guía para publicar ChalaScrape en Edge Add-ons y Chrome Web Store

Pasos en el orden en que los pide cada panel, con cada opción y el valor que debes elegir.
Los textos largos para copiar y pegar están en [LISTING.md](LISTING.md); aquí se indica en qué sección.

Verificada el 14/11/2026 contra la documentación oficial de [Edge Add-ons](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) y de [Chrome Web Store](https://developer.chrome.com/docs/webstore/publish). Lo que no pude confirmar está en la [sección 6](#6-lo-que-no-pude-confirmar).

## 1. Qué está listo

| Qué | Dónde | Estado |
|---|---|---|
| Paquete | `dist/ChalaScrape-1.0.0.zip` | Listo. Sirve para las dos tiendas. |
| Capturas 1280×800 | `store/screenshots/01-…`, `02-…`, `03-…` | Listas (3). |
| Logo 300×300 (Edge) | `store/screenshots/logo-300x300.png` | Listo. |
| Icono de tienda 128×128 (Chrome) | `store/screenshots/icono-tienda-128.png` | Listo. |
| Mosaico 440×280 | `store/screenshots/promo-440x280.png` | Listo. |
| Textos de la ficha | [LISTING.md](LISTING.md), secciones 4 a 7 | Listos, en español e inglés. |
| Política de privacidad | `https://chalascrape.vercel.app/privacy.html` | En línea. |
| Tienda del plan Pro | `https://chalascrape.vercel.app` | En línea, PayPal en modo live. |

Falta, y no depende del paquete:

- **Chrome:** tu cuenta está en «Límite de extensiones: 2/2». Hay que ampliar el cupo antes de crear el elemento ([paso 4.0](#40-ampliar-el-cupo-de-extensiones)).
- **Compra real:** nadie ha pagado todavía en modo live. Las notas para los revisores dicen que el plan Pro se puede comprar.
- **Buzón:** confirma que `info@chaladev.site` recibe correo; es el contacto de soporte y de reembolsos.

## 2. Antes de empezar

1. Si cambiaste algo del código, regenera el ZIP desde la raíz del repositorio:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\pack.ps1
   ```

2. Ten abiertos [LISTING.md](LISTING.md) y la carpeta `store/screenshots/`.
3. Empieza por Edge: no tiene el bloqueo de cupo y la revisión puede tardar hasta 7 días hábiles.

El nombre y la descripción corta salen del paquete (`_locales/*/messages.json`), no del panel. Para cambiarlos hay que editar esos archivos, regenerar el ZIP y volver a subirlo.

## 3. Microsoft Edge Add-ons

Panel: <https://partner.microsoft.com/dashboard/microsoftedge/overview>. No tiene costo de registro.

### 3.1 Crear la extensión y subir el paquete

1. **Create new extension**.
2. Arrastra `dist/ChalaScrape-1.0.0.zip` o usa **Browse your files**.
3. Cuando termine la validación, en **Packages** pulsa **Continue**.

### 3.2 Availability

| Opción | Valores posibles | Qué elegir |
|---|---|---|
| **Visibility** | `Public` (aparece en la tienda y en búsquedas) o `Hidden` (solo con el enlace directo) | `Public` |
| **Markets** | Todos, o los que elijas con **Change markets** | Todos |

Estas dos opciones se pueden cambiar después sin subir un paquete nuevo. Pulsa **Save & Continue**.

### 3.3 Properties

| Opción | Obligatorio | Qué poner |
|---|---|---|
| **Category** | Sí | `Productivity`. Las opciones son: Accessibility, Blogging, Developer Tools, Entertainment, News And Weather, Photos, Productivity, Search Tools, Shopping, Social, Communication y Sports |
| **Website** | No | `https://chalascrape.vercel.app` |
| **Support contact detail** | No | `info@chaladev.site` |
| **Mature content** | No | Sin marcar |

El sitio web y el contacto se muestran a los usuarios. Pulsa **Save & Continue**.

### 3.4 Privacy

| Opción | Qué poner |
|---|---|
| **Single purpose description** (máx. 1000 caracteres) | El texto en inglés de [LISTING.md, sección 4](LISTING.md#4-privacidad) |
| **Permission justification** (máx. 1000 caracteres cada una) | Una caja por permiso (`sidePanel`, `activeTab`, `scripting`, `storage`): los textos de la tabla de esa misma sección |
| **Are you using remote code?** | `No, I am not using remote code` |
| **Data usage** → qué datos recopilas | Solo *Authentication information* (la clave de licencia). No marques *Website content*, historial ni actividad |
| **Data usage** → certificaciones | Marca las tres |
| **Privacy Policy URL** | `https://chalascrape.vercel.app/privacy.html` |

Si el panel lista un permiso que no esperabas, no lo justifiques: avísame, porque significa que el manifest cambió.

Pulsa **Save & Continue**.

### 3.5 Store listings

El paquete trae dos idiomas, inglés y español. El panel exige completar **al menos uno** con **Edit details**; lo recomendable es completar los dos. Si quieres publicar ya con uno solo, quita el otro con **Remove** y agrégalo después.

| Campo | Obligatorio | Límite | Qué poner |
|---|---|---|---|
| **Extension name** | Sí | Sale del paquete | No se edita aquí |
| **Short description** | Sí | Sale del paquete | No se edita aquí |
| **Description** | Sí | 250 a 10,000 caracteres | [LISTING.md, sección 5](LISTING.md#5-ficha-de-la-tienda--español) (español) o [sección 6](LISTING.md#6-ficha-de-la-tienda--english) (inglés) |
| **Extension logo** | Sí | 1:1, recomendado 300×300 | `logo-300x300.png` |
| **Small promotional tile** | No | 440×280 | `promo-440x280.png` |
| **Large promotional tile** | No | 1400×560, PNG | Dejar vacío (no lo preparé) |
| **Screenshots** | No | Hasta 6; 1280×800 o 640×480 | Las tres capturas, en orden |
| **YouTube video URL** | No | — | Dejar vacío |
| **Search terms** | No | Hasta 7 términos, 30 caracteres cada uno, 21 palabras en total | Los de la sección 5 o 6 de LISTING.md |

Puedes usar **Duplicate** para copiar las imágenes de un idioma al otro. No uses **Generate with AI** para la descripción: sustituiría el texto ya revisado.

Pulsa **Save draft**. La columna **Status** de cada idioma debe quedar en `Complete`; solo entonces se activa **Publish**.

### 3.6 Enviar

1. Pulsa **Publish**.
2. En **Notes for certification** pega el bloque de [LISTING.md, sección 7](LISTING.md#7-notas-para-certificación-pegar-en-inglés).
3. Pulsa **Publish** otra vez.

La certificación puede tardar hasta 7 días hábiles. Al aprobarse, el estado pasa a **In the Store**.

## 4. Chrome Web Store

Panel: <https://chrome.google.com/webstore/devconsole>.

### 4.0 Ampliar el cupo de extensiones

Una cuenta nueva puede tener como máximo dos extensiones publicadas, y la tuya ya tiene dos (Chalablock y ChalaVPN).

1. En el panel, pulsa el aviso **Límite de extensiones: 2/2**.
2. Usa la opción para solicitar el aumento.

Según la documentación, la decisión suele ser inmediata; si se abre un caso de soporte, tarda unos días. Pueden negarlo si las extensiones publicadas tienen poco uso o la cuenta es muy reciente, y en ese caso te dicen el motivo. No hay nada que yo pueda hacer para acelerarlo.

### 4.1 Subir el paquete

1. **Nuevo elemento** (*Add new item*).
2. **Choose file** → `dist/ChalaScrape-1.0.0.zip` → **Upload**.

La pestaña **Package** solo muestra los datos del paquete; no se edita.

### 4.2 Store Listing

| Campo | Obligatorio | Límite | Qué poner |
|---|---|---|---|
| **Detailed description** | Sí | — | [LISTING.md, sección 5](LISTING.md#5-ficha-de-la-tienda--español) o [6](LISTING.md#6-ficha-de-la-tienda--english) |
| **Category** | Sí | — | *Herramientas* (o *Flujo de trabajo y planificación*) |
| **Language** | Sí | — | Español |
| **Store icon** | Sí | 128×128 PNG | `icono-tienda-128.png` |
| **Screenshots** | Sí, al menos 1 | Hasta 5; 1280×800 o 640×400 | Las tres capturas, en orden |
| **Small promo tile** | No | 440×280 | `promo-440x280.png` |
| **Marquee promo tile** | No | 1400×560 | Dejar vacío |
| **YouTube video** | No | — | Dejar vacío |
| **Official URL** | No | Solo sitios verificados en Search Console | Dejar vacío |
| **Homepage URL** | No | — | `https://chalascrape.vercel.app` |
| **Support URL** | No | — | `https://chalascrape.vercel.app/privacy.html` |
| **Mature content** | No | — | Sin marcar |

Como el paquete trae inglés, el panel permite una descripción por idioma: pega también la de la sección 6. Las imágenes promocionales no se traducen por idioma.

### 4.3 Privacy

| Campo | Qué poner |
|---|---|
| **Single purpose description** | El texto en inglés de [LISTING.md, sección 4](LISTING.md#4-privacidad) |
| **Permissions justification** | Una caja por permiso (`activeTab`, `scripting`, `sidePanel`, `storage`): los textos de esa misma tabla. No hay permisos de host |
| **Remote Code** | `No, I am not using remote code.` |
| **Data usage** → tipos de datos | Solo información de autenticación (la clave de licencia) |
| **Data usage** → certificaciones | Márcalas todas, incluida la de uso limitado |
| **Privacy policy** | `https://chalascrape.vercel.app/privacy.html` |

Chrome muestra estas declaraciones a los usuarios, así que deben coincidir con la política de privacidad.

### 4.4 Distribution

| Opción | Valores posibles | Qué elegir |
|---|---|---|
| **Pagos** | Gratis o de pago; con o sin compras dentro de la aplicación | Gratis, **con compras dentro de la aplicación**: el plan Pro se cobra fuera de la tienda, con PayPal |
| **Visibility** | `Public` (listada), `Unlisted` (solo con el enlace), `Private` (solo usuarios que tú indiques) | `Public` |
| **Regiones** | `All regions` o países concretos | `All regions` |

Si prefieres que alguien la pruebe antes de hacerla pública, `Private` o `Unlisted` pasan la misma revisión y se pueden cambiar a `Public` después.

### 4.5 Test instructions

Es opcional. Pega el bloque de [LISTING.md, sección 7](LISTING.md#7-notas-para-certificación-pegar-en-inglés): explica que no hace falta cuenta y cómo probar la extensión.

### 4.6 Enviar a revisión

1. Pulsa **Submit for Review**.
2. En el diálogo hay una casilla de publicación automática:
   - **Marcada:** se publica sola al aprobarse. Es lo recomendado.
   - **Desmarcada:** queda aprobada pero sin publicar, y tienes 30 días para publicarla a mano; si se vence, vuelve a borrador.

Si descubres un error después de enviar, usa **cancel review**, sube el paquete corregido y vuelve a enviar.

## 5. Después de enviar

- **Mantén en línea** `https://chalascrape.vercel.app` durante toda la revisión: los revisores pueden abrir la tienda y la política.
- **Anota** la fecha de envío y los ID que te dé cada panel en la sección «Estado» de [LISTING.md](LISTING.md) y [CHROME.md](CHROME.md), o pásamelos y lo hago yo.
- **Avisos por correo:** en Chrome, los de rechazo vienen activados; los de «publicada» hay que activarlos en la página de la cuenta.

### Publicar una versión nueva

1. Sube el número en `"version"` de `manifest.json` (por ejemplo, `1.0.1`).
2. Regenera el ZIP con `scripts\pack.ps1`.
3. En cada panel, entra al elemento, sube el ZIP nuevo y vuelve a enviar. Pasa otra vez por revisión.

No hace falta volver a llenar la ficha, salvo que cambien los permisos: en ese caso ambos paneles piden justificar los nuevos.

## 6. Lo que no pude confirmar

- **Tiempo de revisión de Chrome:** la documentación que leí no da un plazo; depende del tipo de elemento.
- **Texto exacto de la opción de pagos en Chrome:** la documentación solo dice que la pestaña *Distribution* permite declarar si el elemento es de pago. «Con compras dentro de la aplicación» es lo que elegiste para ChalaVPN, según tu guía de ese proyecto.
- **Límites de caracteres del nombre y de la descripción corta en Edge:** su documentación no los publica. El nombre tiene 36 caracteres y la descripción corta menos de 132, que son los límites que conozco de Chrome. Partner Center aceptó el paquete el 14/11/2026 sin objetarlos.
- **Qué casillas de «Data usage» corresponden a una clave de licencia:** marcar solo información de autenticación es mi criterio, no una regla escrita que haya encontrado.
- **Requisitos de la cuenta de Chrome** (verificación de correo, verificación en dos pasos): no los revisé porque ya publicaste dos extensiones con esa cuenta.

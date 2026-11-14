// ChalaScrape — plan Pro: activación de licencia y modal "Actualizar a ChalaScrape Pro".
// El cobro es con PayPal. La clave de licencia es el ID del cobro, y la valida el backend de server/
// (PayPal exige una credencial secreta para consultarlo, que no puede vivir dentro de la extensión).

// ▼▼ Configuración: URL donde desplegaste la carpeta server/ (sin barra final) ▼▼
const SERVER = 'https://chalascrape.vercel.app';
// ▲▲ Vacío = las claves reales se rechazan y solo funciona la clave de desarrollo ▲▲

const RECHECK_MS = 24 * 60 * 60 * 1000;

// Clave de prueba: solo vale en instalaciones "sin empaquetar". Chrome Web Store y Edge Add-ons
// agregan update_url al manifest al publicar, así que en producción queda desactivada sola.
const DEV_KEY = 'CHALA-DEV-2026';
const isDevInstall = !chrome.runtime.getManifest().update_url;

const t = (k) => chrome.i18n.getMessage(k);
const $ = (id) => document.getElementById(id);
const fail = (key) => new Error(key);

// ¿PayPal confirma este cobro? Lanza licNetwork si no se pudo preguntar (sin conexión, backend caído).
async function check(key) {
  try {
    const res = await fetch(`${SERVER}/api/paypal?do=license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw 0;
    return (await res.json()).valid === true;
  } catch {
    throw fail('licNetwork');
  }
}

export async function getLicense() {
  const { license } = await chrome.storage.local.get('license');
  if (!license || license.dev || Date.now() - license.checked < RECHECK_MS) return license || null;
  // Una vez al día se vuelve a preguntar: un reembolso en PayPal revoca Pro.
  // Si no hay conexión se conserva la licencia; nunca se le quita a quien pagó por un fallo de red.
  if (!(await check(license.key).catch(() => true))) {
    await chrome.storage.local.remove('license');
    return null;
  }
  await chrome.storage.local.set({ license: { ...license, checked: Date.now() } });
  return license;
}

export async function activate(rawKey) {
  const key = rawKey.trim().toUpperCase();
  let license;
  if (isDevInstall && key === DEV_KEY) {
    license = { key, dev: true };
  } else {
    if (!SERVER) throw fail('licNotConfigured');
    if (!(await check(key))) throw fail('licInvalid');
    license = { key, checked: Date.now() };
  }
  await chrome.storage.local.set({ license });
}

export const deactivate = () => chrome.storage.local.remove('license');

// ---------- Modal ----------

function message(text, isError = false) {
  $('licMsg').textContent = text;
  $('licMsg').classList.toggle('error', isError);
}

export function openLicense() {
  message('');
  $('licenseDlg').showModal();
}

// onChange(esPro) se llama al iniciar y cada vez que cambia el estado de la licencia.
export async function initLicense(onChange) {
  const refresh = async () => {
    const pro = !!(await getLicense());
    $('licForm').hidden = pro;
    $('licActive').hidden = !pro;
    onChange(pro);
  };
  $('licBuy').href = SERVER;
  $('licBuy').hidden = !SERVER;
  $('licForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('licActivate').disabled = true;
    try {
      await activate($('licKey').value);
      $('licKey').value = '';
      message(t('licOk'));
    } catch (err) {
      message(t(err.message) || err.message, true);
    }
    $('licActivate').disabled = false;
    await refresh();
  });
  $('licRemove').addEventListener('click', async () => {
    await deactivate();
    message('');
    await refresh();
  });
  $('licClose').addEventListener('click', () => $('licenseDlg').close());
  await refresh();
}

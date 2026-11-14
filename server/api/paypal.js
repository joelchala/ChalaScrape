// ChalaScrape Pro — único backend (Vercel Function, sin base de datos ni dependencias).
// La clave de licencia es el ID del cobro (capture) en PayPal: validar = consultarle a PayPal si ese
// cobro existe, está completado y es de este producto. Un reembolso lo invalida solo.
//
//   GET  /api/paypal             → configuración pública para la página de compra
//   POST /api/paypal?do=create   → crea la orden (el precio lo fija el servidor, no el navegador)
//   POST /api/paypal?do=capture  → cobra la orden aprobada y devuelve la clave { key }
//   POST /api/paypal?do=license  → { key } → { valid }   (lo llama la extensión)
//
// shortcut: sin base de datos no hay tope de activaciones por clave (una clave compartida sirve en
// cualquier navegador). Para limitarlo, guardar activaciones por clave en un KV (p. ej. Upstash Redis).

const PRODUCT = 'chalascrape-pro';
const PAYPAL_ID = /^[A-Z0-9]{10,25}$/; // los IDs se interpolan en la URL de PayPal: se validan siempre
const CORS = {
  'Access-Control-Allow-Origin': '*', // la extensión llama desde chrome-extension://…; no se usan cookies
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const env = () => ({
  id: process.env.PAYPAL_CLIENT_ID,
  secret: process.env.PAYPAL_CLIENT_SECRET,
  base: process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com',
  price: process.env.PRICE || '19.00',
  currency: process.env.CURRENCY || 'USD',
});

const json = (data, status = 200) => Response.json(data, { status, headers: CORS });

async function paypal(path, method = 'GET', body) {
  const { id, secret, base } = env();
  const auth = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!auth.ok) throw new Error(`PayPal auth ${auth.status}`);
  const { access_token } = await auth.json();
  const res = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const actions = {
  async create() {
    const { price, currency } = env();
    const { status, data } = await paypal('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: price }, custom_id: PRODUCT, description: 'ChalaScrape Pro' }],
    });
    if (!data.id) throw new Error(`PayPal create ${status}`);
    return json({ id: data.id });
  },

  async capture({ orderID }) {
    if (!PAYPAL_ID.test(orderID)) return json({ error: 'orden inválida' }, 400);
    const { data } = await paypal(`/v2/checkout/orders/${orderID}/capture`, 'POST');
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    if (data.status !== 'COMPLETED' || !capture) return json({ error: 'el pago no se completó' }, 402);
    return json({ key: capture.id });
  },

  async license({ key }) {
    const id = String(key || '').trim().toUpperCase();
    if (!PAYPAL_ID.test(id)) return json({ valid: false });
    const { status, data } = await paypal(`/v2/payments/captures/${id}`);
    if (status === 404) return json({ valid: false });
    // Cualquier otro fallo (credenciales, límite de tasa, caída) NO es "clave inválida":
    // responder false le quitaría Pro a clientes que sí pagaron.
    if (status !== 200) throw new Error(`PayPal capture ${status}`);
    return json({ valid: data.status === 'COMPLETED' && data.custom_id === PRODUCT });
  },
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const { id, price, currency } = env();
    if (request.method === 'GET') return json({ clientId: id, price, currency });
    const action = actions[new URL(request.url).searchParams.get('do')];
    if (request.method !== 'POST' || !action) return json({ error: 'no encontrado' }, 404);
    try {
      return await action(await request.json().catch(() => ({})));
    } catch (e) {
      console.error(e);
      return json({ error: 'PayPal no disponible' }, 502);
    }
  },
};

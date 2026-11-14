// Autoverificación del backend con PayPal simulado: node test.mjs
import assert from 'node:assert/strict';

Object.assign(process.env, { PAYPAL_CLIENT_ID: 'cid', PAYPAL_CLIENT_SECRET: 'sec', PRICE: '19.00', CURRENCY: 'USD' });
const { default: app } = await import('./api/paypal.js');

// PayPal falso: una captura buena, una reembolsada, una de otro producto y una que hace fallar a PayPal.
const captures = {
  GOODCAPTURE0000001: { status: 'COMPLETED', custom_id: 'chalascrape-pro' },
  REFUNDED0000000001: { status: 'REFUNDED', custom_id: 'chalascrape-pro' },
  PENDING00000000001: { status: 'PENDING', custom_id: 'chalascrape-pro' },
  DECLINED0000000001: { status: 'DECLINED', custom_id: 'chalascrape-pro' },
  OTHERPRODUCT000001: { status: 'COMPLETED', custom_id: 'otro-producto' },
};
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  const path = new URL(url).pathname;
  calls.push(`${init.method || 'GET'} ${new URL(url).host}${path}`);
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });
  if (path === '/v1/oauth2/token') {
    assert.equal(init.headers.Authorization, 'Basic ' + Buffer.from('cid:sec').toString('base64'));
    return reply({ access_token: 'tok' });
  }
  assert.equal(init.headers.Authorization, 'Bearer tok');
  if (path === '/v2/checkout/orders') {
    const unit = JSON.parse(init.body).purchase_units[0];
    assert.deepEqual(unit.amount, { currency_code: 'USD', value: '19.00' });
    assert.equal(unit.custom_id, 'chalascrape-pro');
    return reply({ id: 'ORDER00000000001' }, 201);
  }
  if (path === '/v2/checkout/orders/ORDER00000000001/capture') {
    return reply({ status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'GOODCAPTURE0000001' }] } }] }, 201);
  }
  if (path === '/v2/checkout/orders/DECLINED00000001/capture') return reply({ name: 'UNPROCESSABLE_ENTITY' }, 422);
  if (path === '/v2/payments/captures/PAYPALDOWN00000001') return reply({}, 503);
  if (path === '/v2/payments/captures/AJENO0000000000001') return reply({ name: 'NOT_AUTHORIZED' }, 401);
  if (path === '/v2/payments/captures/TOKENMALO000000001') return reply({ error: 'invalid_token' }, 401);
  const capture = captures[path.split('/').pop()];
  return capture ? reply(capture) : reply({ name: 'RESOURCE_NOT_FOUND' }, 404);
};

const call = async (action, body, method = 'POST') => {
  const res = await app.fetch(new Request('https://x.test/api/paypal' + (action ? `?do=${action}` : ''), {
    method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body || {}) : undefined,
  }));
  return { status: res.status, cors: res.headers.get('access-control-allow-origin'), data: res.status === 204 ? null : await res.json() };
};
const silent = console.error;
console.error = () => {};

assert.deepEqual((await call('', null, 'GET')).data, { clientId: 'cid', price: '19.00', currency: 'USD' });
assert.ok(!JSON.stringify((await call('', null, 'GET')).data).includes('sec'), 'el secreto nunca sale del servidor');
assert.equal((await call('license', {}, 'OPTIONS')).status, 204);

assert.deepEqual((await call('create')).data, { id: 'ORDER00000000001' });
assert.deepEqual((await call('capture', { orderID: 'ORDER00000000001' })).data, { key: 'GOODCAPTURE0000001' });
assert.equal((await call('capture', { orderID: 'DECLINED00000001' })).status, 402);

const valid = await call('license', { key: ' goodcapture0000001 ' });
assert.deepEqual([valid.data, valid.cors], [{ valid: true }, '*']);
assert.deepEqual((await call('license', { key: 'REFUNDED0000000001' })).data, { valid: false }, 'reembolso invalida');
assert.deepEqual((await call('license', { key: 'PENDING00000000001' })).data, { valid: true }, 'pago en revisión vale');
assert.deepEqual((await call('license', { key: 'DECLINED0000000001' })).data, { valid: false }, 'revisión rechazada invalida');
assert.deepEqual((await call('license', { key: 'OTHERPRODUCT000001' })).data, { valid: false }, 'otro producto no vale');
assert.deepEqual((await call('license', { key: 'NOEXISTE0000000001' })).data, { valid: false });
assert.equal((await call('license', { key: 'AJENO0000000000001' })).status, 502, 'falta de permisos no es "inválida"');
assert.equal((await call('license', { key: 'PAYPALDOWN00000001' })).status, 502, 'caída de PayPal no es "inválida"');
assert.equal((await call('license', { key: 'TOKENMALO000000001' })).status, 502, 'fallo de credenciales no es "inválida"');

// Entradas maliciosas: no deben llegar a PayPal.
const before = calls.length;
assert.deepEqual((await call('license', { key: '../../v1/oauth2/token' })).data, { valid: false });
assert.deepEqual((await call('license', { key: { $ne: 1 } })).data, { valid: false });
assert.equal((await call('capture', { orderID: 'X/../../captures/Y' })).status, 400);
assert.equal(calls.length, before, 'IDs inválidos no generan llamadas a PayPal');
assert.equal((await call('borrar')).status, 404);

// Secreto vacío: debe fallar antes de hablar con PayPal, que lo aceptaría con un token limitado.
process.env.PAYPAL_CLIENT_SECRET = '';
const callsBefore = calls.length;
assert.equal((await call('create')).status, 502);
assert.equal(calls.length, callsBefore, 'sin secreto no se llama a PayPal');
process.env.PAYPAL_CLIENT_SECRET = 'sec';

console.error = silent;
console.log('server: TODO OK');

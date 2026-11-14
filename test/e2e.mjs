// E2E real de ChalaScrape: lanza el navegador con perfil temporal, carga la extensión sin empaquetar
// por CDP (pipe), dispara el clic del icono y maneja el panel lateral.
// Uso: node e2e.mjs <navegador.exe> <carpeta extensión> <carpeta de trabajo>
// Con LICENSE_KEY=<clave> prueba la activación contra el backend (SERVER en license.js) en vez de la clave de desarrollo.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [exe, extDir, workDir] = process.argv.slice(2);
const dlDir = path.join(workDir, 'downloads');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(dlDir, { recursive: true });

const proc = spawn(exe, [
  `--user-data-dir=${path.join(workDir, 'profile')}`,
  '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  '--no-first-run', '--no-default-browser-check', '--window-size=1300,900', 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

let seq = 0, buf = '';
const pending = new Map();
const swLog = [];
let swSession = null;
proc.stdio[4].setEncoding('utf8');
proc.stdio[4].on('data', (d) => {
  buf += d;
  for (let i; (i = buf.indexOf('\0')) >= 0;) {
    const m = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(`${p.method}: ${m.error.message}`)) : p.res(m.result);
    } else if (m.sessionId !== swSession) {
      // solo interesa la consola del service worker
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      swLog.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
    } else if (m.method === 'Runtime.exceptionThrown') {
      swLog.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    }
  }
});
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej, method });
  proc.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000, step = 250) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(step)) {
    const v = await fn().catch(() => null);
    if (v) return v;
  }
  return null;
};
const targets = async () => (await send('Target.getTargets', { filter: [{}] })).targetInfos;
const attach = async (targetId) => {
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  return sessionId;
};
const ev = async (sessionId, expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const openTab = async (url) => {
  const { targetId } = await send('Target.createTarget', { url });
  const s = await attach(targetId);
  await until(() => ev(s, 'location.href !== "about:blank" && document.readyState === "complete"'), 30000);
  return { targetId, s };
};

// triggerAction exige el target de tipo 'tab' que envuelve a la página.
const click = async (extId, page) => {
  const url = await ev(page.s, 'location.href');
  const tab = (await targets()).find((t) => t.type === 'tab' && t.url === url);
  if (!tab) throw new Error('sin target tab para ' + url);
  await send('Extensions.triggerAction', { id: extId, targetId: tab.targetId });
};

let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) failed++; };
const PANEL = `(() => { const $ = (i) => document.getElementById(i); return {
  status: $('status').textContent, counts: $('counts').textContent, plan: $('planBtn').textContent,
  rows: document.querySelectorAll('#grid tbody tr').length,
  heads: [...document.querySelectorAll('#grid thead input')].map((i) => i.value),
  first: [...document.querySelectorAll('#grid tbody tr:first-child td')].map((t) => t.textContent.slice(0, 40)),
  next: $('nextLabel').textContent, running: $('detectBtn').disabled, lang: document.documentElement.lang }; })()`;
const MARKS = `(() => { const c = document.querySelector('[data-chalascrape="container"]'); return {
  container: c && c.localName + (c.className ? '.' + c.className : ''), items: document.querySelectorAll('[data-chalascrape="item"]').length,
  outline: c && getComputedStyle(c).outlineColor, url: location.href }; })()`;

const timer = setTimeout(() => { console.log('FAIL  tiempo agotado (150 s)'); proc.kill(); process.exit(2); }, 150000);
try {
  const ver = await send('Browser.getVersion');
  console.log('navegador:', ver.product);
  const { id: extId } = await send('Extensions.loadUnpacked', { path: extDir });
  console.log('extensión cargada, id:', extId);

  const sw = await until(async () => (await targets()).find((t) => t.type === 'service_worker' && t.url.includes(extId)));
  ok(!!sw, 'service worker registrado');
  if (sw) swSession = await attach(sw.targetId);

  // --- Clic en el icono sobre una página con tarjetas ---
  const A = await openTab('https://books.toscrape.com/');
  await click(extId, A);
  const panelT = await until(async () => (await targets()).find((t) => t.url.startsWith(`chrome-extension://${extId}/sidepanel/`)));
  ok(!!panelT, `el clic en el icono abre el panel lateral (target ${panelT?.type})`);
  if (!panelT) throw new Error('sin panel: ' + JSON.stringify((await targets()).map((t) => [t.type, t.url.slice(0, 60)])));
  const P = await attach(panelT.targetId);
  let st = await until(async () => { const v = await ev(P, PANEL); return v.rows || /\[/.test(v.status) ? v : null; }) || await ev(P, PANEL);
  console.log('  panel:', JSON.stringify(st));
  ok(st.rows === 20, `un clic: detecta los 20 libros (${st.rows})`);
  let mk = await ev(A.s, MARKS);
  console.log('  página:', JSON.stringify(mk));
  ok(mk.items === 20 && mk.outline === 'rgb(6, 182, 212)', 'resaltado cian inyectado con activeTab');

  // --- Segundo clic en otra pestaña con el panel ya abierto ---
  const B = await openTab('https://es.wikipedia.org/wiki/Anexo:Pa%C3%ADses_y_territorios_dependientes_por_poblaci%C3%B3n');
  await click(extId, B);
  await sleep(1500);
  const still = (await targets()).some((t) => t.targetId === panelT.targetId);
  ok(still, 'segundo clic en otra pestaña NO cierra el panel');
  st = await until(async () => { const v = await ev(P, PANEL); return v.rows > 20 ? v : null; }) || await ev(P, PANEL);
  console.log('  panel:', JSON.stringify({ ...st, first: st.first.slice(0, 4) }));
  mk = await ev(B.s, MARKS);
  console.log('  página:', JSON.stringify(mk));
  ok(st.rows > 20 && mk.container?.startsWith('table'), `detecta la tabla de Wikipedia en la nueva pestaña (${st.counts})`);

  ok(st.heads.length <= 30, `tabla: columnas acotadas (${st.heads.length}): ${st.heads.slice(0, 6).join(' | ')}`);
  await ev(P, `document.getElementById('cycleBtn').click()`);
  st = await until(async () => { const v = await ev(P, PANEL); return /2 de/.test(v.status) ? v : null; }, 6000) || await ev(P, PANEL);
  ok(/2 de/.test(st.status) && st.rows > 0, `botón Cambiar selección: ${st.status} ${st.counts}`);
  await ev(P, `document.getElementById('detectBtn').click()`);
  st = await until(async () => { const v = await ev(P, PANEL); return /1 de/.test(v.status) ? v : null; }, 6000) || await ev(P, PANEL);
  ok(/1 de/.test(st.status) && /^245 /.test(st.counts), `botón Detectar datos sobre la pestaña activa: ${st.status} ${st.counts}`);

  // --- Free: exportación CSV limitada ---
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });
  await ev(P, `document.getElementById('csvBtn').click()`);
  let file = await until(async () => fs.readdirSync(dlDir).find((f) => f.endsWith('.csv')));
  let csv = file ? fs.readFileSync(path.join(dlDir, file)) : Buffer.alloc(0);
  ok(csv[0] === 0xEF && csv[1] === 0xBB && csv[2] === 0xBF, `CSV descargado con BOM (${file})`);
  ok(csv.toString('utf8').trim().split('\r\n').length === 51, 'Free: CSV limitado a 50 filas');
  await ev(P, `document.getElementById('xlsxBtn').click()`);
  ok(await ev(P, `document.getElementById('licenseDlg').open`), 'Free: Excel abre el modal de licencia');

  // --- Pro: clave de desarrollo o, con LICENSE_KEY, activación real contra el backend ---
  const KEY = process.env.LICENSE_KEY || 'CHALA-DEV-2026';
  const submit = (k) => ev(P, `(() => { document.getElementById('licKey').value = '${k}'; document.getElementById('licForm').requestSubmit(); })()`);
  if (process.env.LICENSE_KEY) {
    await submit('NOEXISTE0000000001');
    const bad = await until(() => ev(P, `document.getElementById('licMsg').classList.contains('error') && document.getElementById('licMsg').textContent`));
    ok(bad && !(await ev(P, `document.body.classList.contains('is-pro')`)), `backend rechaza una clave inexistente (${bad})`);
  }
  await submit(KEY);
  ok(await until(() => ev(P, `document.body.classList.contains('is-pro')`)), `clave ${KEY} activa Pro`);
  await ev(P, `document.getElementById('licClose').click()`);
  await ev(P, `document.getElementById('xlsxBtn').click()`);
  file = await until(async () => fs.readdirSync(dlDir).find((f) => f.endsWith('.xlsx')));
  const xl = file ? fs.readFileSync(path.join(dlDir, file)) : Buffer.alloc(0);
  ok(xl[0] === 0x50 && xl[1] === 0x4B && xl.length > 5000, `Pro: XLSX descargado (${file}, ${xl.length} bytes)`);

  // --- Paginación real con navegación entre páginas ---
  await send('Target.activateTarget', { targetId: A.targetId });
  await click(extId, A);
  st = await until(async () => { const v = await ev(P, PANEL); return v.rows === 20 ? v : null; }) || await ev(P, PANEL);
  ok(st.rows === 20, `volver a la primera pestaña y un clic: vuelve a detectar los libros (${st.rows})`);
  console.log('  columnas:', JSON.stringify(st.heads), JSON.stringify(st.first));
  await ev(P, `document.getElementById('pickBtn').click()`);
  await sleep(800);
  await ev(A.s, `(() => { const a = document.querySelector('li.next a');
    a.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); })()`);
  st = await until(async () => { const v = await ev(P, PANEL); return /next/i.test(v.next) ? v : null; }, 5000) || await ev(P, PANEL);
  ok(/next/i.test(st.next) && (await ev(A.s, 'location.pathname')) === '/', `botón "Siguiente" elegido sin navegar (${st.next})`);
  await ev(P, `(() => { const d = document.getElementById('delay'); d.value = '1.5'; d.dispatchEvent(new Event('input')); document.getElementById('runBtn').click(); })()`);
  st = await until(async () => { const v = await ev(P, PANEL); return /^60 /.test(v.counts) || !v.running ? v : null; }, 40000, 400) || await ev(P, PANEL);
  await ev(P, `document.getElementById('runBtn').click()`); // detener
  await until(async () => !(await ev(P, PANEL)).running, 15000);
  st = await ev(P, PANEL);
  const where = await ev(A.s, 'location.pathname').catch(() => '?');
  console.log('  panel:', JSON.stringify({ status: st.status, counts: st.counts }), 'página:', where);
  ok(parseInt(st.counts) >= 60 && /page-\d/.test(where), `paginación navega y acumula sin duplicar (${st.counts}, ${where})`);
  const saved = await ev(P, `chrome.storage.local.get('data').then((d) => d.data.rows.length)`);
  ok(saved === parseInt(st.counts), `acumulado en chrome.storage.local (${saved})`);
} catch (e) {
  ok(false, 'excepción: ' + e.message);
}
console.log('consola del service worker:', swLog.length ? '\n  ' + swLog.join('\n  ') : 'sin errores');
console.log(failed ? `\n${failed} FALLARON` : '\nTODO OK');
clearTimeout(timer);
await send('Browser.close').catch(() => {});
setTimeout(() => { proc.kill(); process.exit(failed ? 1 : 0); }, 1500);

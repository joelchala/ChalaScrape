// ChalaScrape — panel lateral: vista previa editable, paginación automática y exportación.
import { initLicense, openLicense } from './license.js';

const FREE_ROWS = 50;     // tope de filas por archivo en el plan Free
const PREVIEW_ROWS = 100; // filas que se pintan en la vista previa
const XLSX_CELL_MAX = 32767; // límite de Excel por celda

const t = (k, ...subs) => chrome.i18n.getMessage(k, subs.map(String));
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Todo el estado persistente vive en chrome.storage.local bajo "data".
// shortcut: storage.local tiene cupo de ~10 MB; pasar a IndexedDB si los datasets crecen más.
let state = { cols: [], rows: [], hidden: [], group: null, next: null, mode: 'next', delay: 2, acc: false };
let pro = false;
let tabId = null;
let running = false;
let seen = new Set(); // firmas de filas ya acumuladas (evita duplicados entre páginas / scrolls)
let headKey = null;

const status = (text) => { $('status').textContent = text; };
const save = () => chrome.storage.local.set({ data: state }).catch(() => status(t('errStorage')));

// ---------- Comunicación con la pestaña (vía background.js) ----------

const clickedTab = async () => (await chrome.storage.session.get('clickedTab')).clickedTab;

// Pestaña activa de la ventana; si el navegador no la resuelve desde el panel, la última donde se hizo clic en el icono.
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id ?? clickedTab();
}

async function toTab(payload) {
  tabId ??= await activeTab();
  if (tabId == null) throw new Error('no se encontró la pestaña');
  const res = await chrome.runtime.sendMessage({ toTab: tabId, payload });
  if (res === undefined) throw new Error('sin respuesta del service worker');
  if (res?.error) throw new Error(res.error);
  return res;
}

// Mensaje para el usuario + detalle técnico del navegador (útil para soporte).
const noAccess = (e) => status(`${t('errNoAccess')} [${e.message}]`);

// ---------- Datos ----------

// Firma independiente del orden y de columnas vacías: sigue valiendo cuando aparecen columnas nuevas.
const sig = (row) => state.cols.map((c, i) => (row[i] ? `${c.key}\u0001${row[i]}` : '')).filter(Boolean).join('\u0002');

function uniqueName(name) {
  const base = name || t('colDefault');
  let out = base;
  for (let n = 2; state.cols.some((c) => c.name === out); n++) out = `${base} ${n}`;
  return out;
}

// Integra una extracción { cols, rows } alineando por clave de columna. Devuelve cuántas filas nuevas entraron.
function merge(res, replace = false) {
  if (replace) {
    Object.assign(state, { cols: [], rows: [], hidden: [], acc: false });
    seen = new Set();
  }
  const map = res.cols.map((c) => {
    if (state.hidden.includes(c.key)) return -1;
    const i = state.cols.findIndex((x) => x.key === c.key);
    return i >= 0 ? i : state.cols.push({ key: c.key, name: uniqueName(c.name) }) - 1;
  });
  const fresh = [];
  for (const src of res.rows) {
    const row = Array(state.cols.length).fill('');
    src.forEach((v, j) => { if (map[j] >= 0) row[map[j]] = v; });
    const s = sig(row);
    // Solo se descarta lo ya visto en extracciones anteriores; los duplicados dentro de una misma página se conservan.
    if (s && !seen.has(s)) fresh.push([row, s]);
  }
  for (const [row, s] of fresh) {
    state.rows.push(row);
    seen.add(s);
  }
  return fresh.length;
}

function deleteCol(i) {
  state.hidden.push(state.cols[i].key);
  state.cols.splice(i, 1);
  state.rows.forEach((r) => r.splice(i, 1));
  seen = new Set(state.rows.map(sig));
  render();
  save();
}

const okToDiscard = () => !state.acc || confirm(t('confirmReplace'));

// ---------- Vista ----------

function renderHead() {
  const tr = document.createElement('tr');
  state.cols.forEach((col, i) => {
    const th = document.createElement('th');
    const input = document.createElement('input');
    const del = document.createElement('button');
    const label = () => {
      input.value = col.name;
      del.title = t('deleteCol', col.name);
      del.setAttribute('aria-label', del.title);
    };
    input.setAttribute('aria-label', t('renameCol'));
    input.addEventListener('change', () => {
      col.name = input.value.trim() || col.name;
      label();
      save();
    });
    del.type = 'button';
    del.className = 'col-del';
    del.textContent = '×';
    del.addEventListener('click', () => deleteCol(i));
    label();
    th.append(input, del);
    tr.append(th);
  });
  $('grid').tHead.replaceChildren(tr);
}

function render() {
  const { cols, rows } = state;
  // El encabezado solo se reconstruye si cambian las columnas, para no pisar un renombrado en curso.
  const key = cols.map((c) => c.key).join('\u0002');
  if (key !== headKey) {
    headKey = key;
    renderHead();
  }
  $('grid').tBodies[0].replaceChildren(...rows.slice(0, PREVIEW_ROWS).map((row) => {
    const tr = document.createElement('tr');
    cols.forEach((_, i) => {
      const td = document.createElement('td');
      td.textContent = td.title = row[i] ?? '';
      tr.append(td);
    });
    return tr;
  }));

  const has = rows.length > 0;
  $('empty').hidden = has;
  $('tableWrap').hidden = !has;
  $('counts').textContent = has ? t('counts', rows.length, cols.length) : '';
  $('more').textContent = rows.length > PREVIEW_ROWS ? t('previewMore', PREVIEW_ROWS, rows.length) : '';

  document.body.classList.toggle('is-pro', pro);
  $('planBtn').textContent = t(pro ? 'planPro' : 'planFree');
  $('mode').value = state.mode;
  $('delay').value = state.delay;
  $('delayOut').textContent = `${Number(state.delay).toFixed(1)} s`;
  $('nextRow').hidden = state.mode !== 'next';
  $('nextLabel').textContent = state.next ? `${t('nextPicked')}: ${state.next.label || state.next.tag}` : t('nextNone');
  $('runBtn').textContent = t(running ? 'stop' : 'start');
  for (const id of ['detectBtn', 'cycleBtn', 'pickBtn', 'clearBtn', 'mode']) $(id).disabled = running;
  $('csvBtn').disabled = $('xlsxBtn').disabled = !has;
}

// ---------- Detección ----------

// onTab: pestaña donde se acaba de hacer clic en el icono; sin él, "Detectar" usa la pestaña activa
// y "Cambiar selección" sigue en la última detectada.
async function detect(type, onTab) {
  if (!okToDiscard()) return;
  if (type === 'detect') tabId = onTab ?? null;
  try {
    const res = await toTab({ type });
    merge(res, true);
    state.group = res.group;
    status(res.total ? t('statusGroup', res.index + 1, res.total) : t('statusNone'));
  } catch (e) {
    noAccess(e);
  }
  render();
  save();
}

async function clearAll() {
  if (!okToDiscard()) return;
  merge({ cols: [], rows: [] }, true);
  state.group = state.next = null;
  status('');
  render();
  save();
  toTab({ type: 'clear' }).catch(() => {});
}

// ---------- Paginación automática (Pro) ----------

async function pickNext() {
  try {
    await toTab({ type: 'pickNext' });
    status(t('statusPicking'));
  } catch (e) {
    noAccess(e);
  }
}

async function waitLoaded() {
  for (let i = 0; i < 40; i++) { // máx. ~12 s
    if ((await chrome.tabs.get(tabId)).status === 'complete') return;
    await sleep(300);
  }
}

async function run() {
  if (running) { running = false; return; }
  if (!pro) return openLicense();
  if (!state.group) return status(t('statusNone'));
  if (state.mode === 'next' && !state.next) return status(t('errPickNext'));

  running = true;
  render();
  let page = 1;
  let empty = 0;
  try {
    while (running) {
      if (state.mode === 'next') {
        // Si el clic navega, la respuesta puede cortarse: se asume que avanzó y lo confirma la extracción.
        const r = await toTab({ type: 'clickNext', next: state.next }).catch(() => ({}));
        if (r?.done) break;
      } else {
        await toTab({ type: 'scroll', group: state.group });
      }
      await sleep(state.delay * 1000);
      await waitLoaded();
      if (!running) break;
      const added = merge(await toTab({ type: 'extract', group: state.group }));
      state.acc = true;
      render();
      save();
      status(t('statusPage', ++page, state.rows.length));
      empty = added ? 0 : empty + 1;
      // Sin filas nuevas = fin (el scroll infinito recibe un segundo intento por si la carga fue lenta).
      if (empty >= (state.mode === 'next' ? 1 : 2)) break;
    }
    status(t('statusDone', state.rows.length));
  } catch (e) {
    status(`${t('errRun')} [${e.message}]`);
  }
  running = false;
  render();
}

// ---------- Exportación ----------

// Datos de terceros: evita que Excel ejecute como fórmula una celda de CSV que empiece con = + - @.
const csvSafe = (v) => (/^[=+\-@\t\r]/.test(v) && !/^[+-]?[\d\s.,()%-]+$/.test(v) ? `'${v}` : v);

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

function exportFile(kind) {
  if (kind === 'xlsx' && !pro) return openLicense();
  const rows = pro ? state.rows : state.rows.slice(0, FREE_ROWS);
  const fix = kind === 'csv' ? csvSafe : (v) => v.slice(0, XLSX_CELL_MAX);
  const aoa = [state.cols.map((c) => c.name), ...rows.map((r) => state.cols.map((_, i) => fix(r[i] ?? '')))];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const name = `chalascrape-${new Date().toLocaleDateString('sv')}`;
  if (kind === 'xlsx') {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'ChalaScrape');
    const data = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
    download(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${name}.xlsx`);
  } else {
    // BOM UTF-8: sin él Excel abre el CSV como ANSI y rompe tildes y "ñ".
    download(new Blob(['﻿', XLSX.utils.sheet_to_csv(sheet, { RS: '\r\n' })], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
  }
  if (!pro && state.rows.length > FREE_ROWS) status(t('freeLimit', FREE_ROWS, state.rows.length));
}

// ---------- Inicio ----------

async function init() {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('planBtn').title = t('planTitle');

  $('detectBtn').addEventListener('click', () => detect('detect'));
  $('cycleBtn').addEventListener('click', () => detect('cycle'));
  $('clearBtn').addEventListener('click', clearAll);
  $('pickBtn').addEventListener('click', pickNext);
  $('runBtn').addEventListener('click', run);
  $('csvBtn').addEventListener('click', () => exportFile('csv'));
  $('xlsxBtn').addEventListener('click', () => exportFile('xlsx'));
  $('planBtn').addEventListener('click', openLicense);
  $('mode').addEventListener('change', (e) => { state.mode = e.target.value; render(); save(); });
  $('delay').addEventListener('input', (e) => { state.delay = Number(e.target.value); render(); save(); });

  // El content script avisa directo al panel cuando el usuario elige (o cancela) el botón "Siguiente".
  chrome.runtime.onMessage.addListener((msg) => {
    // Clic en el icono con el panel ya abierto: detecta en esa pestaña, salvo que haya un acumulado que cuidar.
    if (msg?.type === 'actionClicked' && !running && !state.acc) detect('detect', msg.tabId);
    if (msg?.type !== 'nextPicked') return;
    if (msg.next) state.next = msg.next;
    status('');
    render();
    save();
  });

  await initLicense((isPro) => { pro = isPro; render(); });

  const saved = (await chrome.storage.local.get('data')).data;
  if (saved?.rows?.length) {
    state = { ...state, ...saved };
    seen = new Set(state.rows.map(sig));
    status(t('statusRestored'));
    render();
  } else {
    await detect('detect', await clickedTab()); // un solo clic: el icono abre el panel y ya detecta
  }
}

init();

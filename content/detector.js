// ChalaScrape — detección de patrones repetitivos, resaltado y extracción.
// Se inyecta bajo demanda desde background.js (activeTab); no corre en ninguna página por defecto.
(() => {
  if (window.__chalaScrape) return;
  window.__chalaScrape = true;

  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'br', 'hr', 'link', 'meta', 'iframe', 'canvas', 'select', 'option']);
  const TABLE_PARTS = /^(table|thead|tbody|tfoot|tr)$/;
  const CLICKABLE = 'a, button, [role="button"], input[type="button"], input[type="submit"]';
  const t = (k) => chrome.i18n.getMessage(k);

  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const seg = (el) => el.localName + (el.classList[0] ? '.' + el.classList[0] : '');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const abs = (url) => {
    try { return new URL(url, location.href).href; } catch { return ''; }
  };

  function cssPath(el) {
    const parts = [];
    for (; el && el !== document.documentElement; el = el.parentElement) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) {
        parts.unshift('#' + CSS.escape(el.id));
        break;
      }
      const same = [...el.parentElement.children].filter((c) => c.localName === el.localName);
      parts.unshift(el.localName + (same.length > 1 ? `:nth-of-type(${same.indexOf(el) + 1})` : ''));
    }
    return parts.join('>');
  }

  // ---------- Detección ----------

  const isTable = (c) => c.container.localName === 'table';

  function itemsOf(container, key) {
    const all = container.localName === 'table'
      ? [...container.rows].filter((r) => r.querySelector('td'))
      : [...container.children].filter((c) => seg(c) === key);
    return all.filter(visible);
  }

  // Puntaje: cantidad × tamaño × parecido estructural. Favorece listados grandes y homogéneos
  // frente a menús (ítems pequeños) y secciones de página (pocas y muy distintas entre sí).
  function score(items) {
    const sample = items.slice(0, 20);
    let area = 0, filled = 0;
    const sizes = [];
    for (const it of sample) {
      const r = it.getBoundingClientRect();
      area += r.width * r.height;
      if (clean(it.textContent) || it.querySelector('img')) filled++;
      sizes.push(it.getElementsByTagName('*').length + 1);
    }
    if (filled < sample.length / 2) return 0;
    const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const sd = Math.sqrt(sizes.reduce((a, b) => a + (b - mean) ** 2, 0) / sizes.length);
    return items.length * Math.sqrt(area / sample.length) / (1 + sd / mean);
  }

  function findCandidates() {
    const out = [];
    for (const table of document.querySelectorAll('table')) {
      const items = itemsOf(table);
      if (items.length >= 2) out.push({ container: table, key: 'tr', items });
    }
    for (const el of document.body.querySelectorAll('*')) {
      if (el.children.length < 3 || SKIP.has(el.localName) || TABLE_PARTS.test(el.localName)) continue;
      const counts = {};
      for (const c of el.children) {
        if (!SKIP.has(c.localName)) counts[seg(c)] = (counts[seg(c)] || 0) + 1;
      }
      for (const key in counts) {
        if (counts[key] < 3) continue;
        const items = itemsOf(el, key);
        if (items.length >= 3) out.push({ container: el, key, items });
      }
    }
    for (const c of out) c.score = score(c.items);
    return out.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);
  }

  const describe = (c) => ({ sel: cssPath(c.container), key: c.key });

  // Reubica el grupo tras una navegación (paginación): mismo contenedor o, si cambió, el más parecido.
  function resolve(group) {
    let container = null;
    try { container = document.querySelector(group.sel); } catch { /* selector inválido en esta página */ }
    if (container) {
      const items = itemsOf(container, group.key);
      if (items.length) return { container, key: group.key, items };
    }
    const all = findCandidates();
    return all.find((c) => c.key === group.key) || all[0] || null;
  }

  // ---------- Extracción ----------

  const imgSrc = (img) => {
    const s = img.getAttribute('data-src') || img.currentSrc || img.getAttribute('src') || '';
    return s.startsWith('data:') ? '' : s && abs(s);
  };
  const linkHref = (a) => (/^(javascript|data):/i.test(a.getAttribute('href')) ? '' : a.href);

  // Recorre un ítem y emite campos (clave estable por ruta, nombre sugerido, valor).
  // El nombre sale de la clase más cercana (propia o heredada del ancestro) o, si no hay, de la etiqueta.
  function walk(el, path, put, cls = '') {
    if (SKIP.has(el.localName) || !el.checkVisibility()) return;
    cls = el.classList[0] || cls;
    const name = clean((cls || el.localName).replace(/[-_]+/g, ' '));
    if (el.localName === 'img') return put(path + '@src', `${name} (${t('colImage')})`, imgSrc(el));
    if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      // Texto mezclado con etiquetas en línea (<p>Hola <b>mundo</b></p>): se toma como un solo campo.
      put(path, name, clean(el.innerText));
      el.querySelectorAll('a[href], img').forEach((d, i) => (d.localName === 'img'
        ? put(`${path}@src${i}`, `${name} (${t('colImage')})`, imgSrc(d))
        : put(`${path}@href${i}`, `${name} (${t('colLink')})`, linkHref(d))));
    } else {
      const nth = {};
      for (const child of el.children) {
        const s = seg(child);
        nth[s] = (nth[s] || 0) + 1;
        walk(child, `${path}>${s}${nth[s] > 1 ? ':' + nth[s] : ''}`, put, cls);
      }
    }
    // El enlace va después de su texto para que la columna de texto quede primero.
    if (el.localName === 'a' && el.hasAttribute('href')) put(path + '@href', `${name} (${t('colLink')})`, linkHref(el));
  }

  function tableHeads(table) {
    const row = table.tHead?.rows[0] || [...table.rows].find((r) => !r.querySelector('td'));
    return row ? [...row.cells].map((c) => clean(c.innerText)) : [];
  }

  function extract(c) {
    const heads = isTable(c) ? tableHeads(c.container) : null;
    const cols = new Map(); // clave → nombre sugerido, en orden de aparición
    const recs = c.items.map((item) => {
      const rec = {};
      const put = (key, name, val) => {
        if (!val || key in rec) return;
        rec[key] = val;
        if (!cols.has(key)) cols.set(key, name);
      };
      // Tablas: una columna por celda (más su primer enlace e imagen). Recorrer cada celda por dentro
      // multiplica las columnas cuando las filas no tienen todas el mismo marcado (p. ej. Wikipedia).
      if (heads) {
        [...item.cells].forEach((cell, i) => {
          const name = heads[i] || `${t('colDefault')} ${i + 1}`;
          const a = cell.querySelector('a[href]');
          const img = cell.querySelector('img');
          put('c' + i, name, clean(cell.innerText));
          if (a) put(`c${i}@href`, `${name} (${t('colLink')})`, linkHref(a));
          if (img) put(`c${i}@src`, `${name} (${t('colImage')})`, imgSrc(img));
        });
      } else walk(item, '', put);
      return rec;
    });
    const keys = [...cols.keys()];
    return {
      cols: keys.map((key) => ({ key, name: cols.get(key) })),
      rows: recs.map((rec) => keys.map((k) => rec[k] || '')),
    };
  }

  // ---------- Resaltado ----------

  function highlight(c) {
    document.querySelectorAll('[data-chalascrape]').forEach((e) => e.removeAttribute('data-chalascrape'));
    if (!c) return;
    c.container.setAttribute('data-chalascrape', 'container');
    c.items.forEach((e) => e.setAttribute('data-chalascrape', 'item'));
  }

  // ---------- Botón "Siguiente" ----------

  const nextLabel = (el) => clean(el.innerText || el.value || el.getAttribute('aria-label') || el.title).slice(0, 80);
  const classOf = (el) => el.getAttribute('class') || '';

  function findNext(d) {
    let el = null;
    try { el = document.querySelector(d.sel); } catch { /* selector inválido en esta página */ }
    if (el && nextLabel(el) === d.label) return el;
    // La posición cambia entre páginas ("Anterior" aparece en la 2): se busca por etiqueta + clases + texto.
    return [...document.querySelectorAll(d.tag)].filter((e) => classOf(e) === d.cls && nextLabel(e) === d.label).pop() || null;
  }

  let stopPick = null;
  function startPick() {
    stopPick?.();
    let last = null;
    const mark = (el) => {
      last?.removeAttribute('data-chalascrape-pick');
      last = el;
      el?.setAttribute('data-chalascrape-pick', '');
    };
    const finish = (next) => {
      stopPick();
      chrome.runtime.sendMessage({ type: 'nextPicked', next }).catch(() => {});
    };
    const over = (e) => mark(e.target.closest(CLICKABLE) || e.target);
    const click = (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const el = e.target.closest(CLICKABLE) || e.target;
      finish({ sel: cssPath(el), tag: el.localName, cls: classOf(el), label: nextLabel(el) });
    };
    const key = (e) => e.key === 'Escape' && finish(null);
    stopPick = () => {
      mark(null);
      document.removeEventListener('mouseover', over, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('keydown', key, true);
      stopPick = null;
    };
    document.addEventListener('mouseover', over, true);
    document.addEventListener('click', click, true);
    document.addEventListener('keydown', key, true);
    return { ok: true };
  }

  // ---------- Mensajes ----------

  let cands = [];
  let idx = 0;

  function show() {
    const c = cands[idx];
    highlight(c);
    if (!c) return { total: 0, index: 0, group: null, cols: [], rows: [] };
    c.items[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    return { total: cands.length, index: idx, group: describe(c), ...extract(c) };
  }

  const handlers = {
    ping: () => true,
    detect: () => {
      cands = findCandidates();
      idx = 0;
      return show();
    },
    cycle: () => {
      // Se vuelve a detectar siempre: tras paginar o hacer scroll los elementos anteriores ya no están en el DOM.
      cands = findCandidates();
      idx = cands.length ? (idx + 1) % cands.length : 0;
      return show();
    },
    extract: ({ group }) => {
      const c = resolve(group);
      highlight(c);
      return c ? extract(c) : { cols: [], rows: [] };
    },
    clear: () => {
      stopPick?.();
      highlight(null);
      return { ok: true };
    },
    pickNext: startPick,
    clickNext: ({ next }) => {
      const el = findNext(next);
      if (!el || el.closest('[disabled], .disabled, [aria-disabled="true"]')) return { done: true };
      el.click();
      return { ok: true };
    },
    scroll: ({ group }) => {
      // Cubre listas con scroll interno (último ítem a la vista) y scroll de ventana.
      resolve(group)?.items.at(-1)?.scrollIntoView({ block: 'end' });
      window.scrollTo(0, document.documentElement.scrollHeight);
      return { ok: true };
    },
  };

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    const handler = handlers[msg?.type];
    if (handler) reply(handler(msg));
  });
})();

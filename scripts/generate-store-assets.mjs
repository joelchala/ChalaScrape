/**
 * Generador de activos gráficos promocionales para ChalaScrape (440x280 y 1400x560).
 * Renderiza HTML/CSS real vía Edge/Chrome Headless (CDP + WebSocket nativo).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const STORE_DIR = path.join(ROOT, "store", "screenshots");
const ICON_SVG_PATH = path.join(ROOT, "icons", "icon.svg");

function getIconDataUri() {
  const svg = fs.readFileSync(ICON_SVG_PATH, "utf8");
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function findBrowserBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("No local Edge or Chrome binary found.");
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function waitForTargetWsUrl(port, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const targets = await res.json();
        const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Starting
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error("Timed out waiting for headless browser DevTools.");
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.readyPromise = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (err) => reject(err));
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(String(event.data));
      if (typeof msg.id === "number" && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`CDP ${msg.error.code}: ${msg.error.message}`));
        else resolve(msg.result);
      }
    });
  }
  async connect() { await this.readyPromise; }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

function assertPngDimensions(filePath, expectedWidth, expectedHeight) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const buf = fs.readFileSync(filePath);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error(`Invalid PNG: ${filePath}`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== expectedWidth || h !== expectedHeight) {
    throw new Error(`Dimension mismatch ${filePath}: ${w}x${h} != ${expectedWidth}x${expectedHeight}`);
  }
}

function buildPromo440(iconUri) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 440px;
    height: 280px;
    overflow: hidden;
    font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
    background: radial-gradient(circle at 82% 20%, rgba(16, 185, 129, 0.22), transparent 52%),
                radial-gradient(circle at 18% 84%, rgba(6, 182, 212, 0.16), transparent 48%),
                linear-gradient(145deg, #0B1220 0%, #101B2E 60%, #13233A 100%);
    color: #F8FAFC;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    width: 440px;
    height: 280px;
    padding: 24px 26px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .icon-box {
    width: 50px;
    height: 50px;
    border-radius: 13px;
    background: #142033;
    border: 1px solid #263B59;
    display: grid;
    place-items: center;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
  }
  .icon-box img { width: 34px; height: 34px; }
  .name {
    font-size: 27px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .name span { color: #10B981; }
  .tag {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.14);
    color: #6EE7B7;
  }
  .mid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sub {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.3;
    color: #E2E8F0;
  }
  .sub em {
    font-style: normal;
    color: #22D3EE;
  }
  .mini-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.9fr 0.7fr;
    gap: 5px;
    padding: 8px 10px;
    border-radius: 9px;
    background: rgba(15, 23, 42, 0.75);
    border: 1px solid #243652;
  }
  .cell {
    height: 10px;
    border-radius: 3px;
    background: #1E293B;
  }
  .cell.hdr { background: rgba(16, 185, 129, 0.55); }
  .cell.cyan { background: rgba(6, 182, 212, 0.45); }
  .badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .badge {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    background: #152236;
    border: 1px solid #2A3F5F;
    color: #CBD5E1;
  }
  .badge.green {
    border-color: rgba(16, 185, 129, 0.45);
    color: #6EE7B7;
  }
  .badge.cyan {
    border-color: rgba(6, 182, 212, 0.45);
    color: #67E8F9;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">
        <div class="icon-box"><img src="${iconUri}" alt="" /></div>
        <div class="name">Chala<span>Scrape</span></div>
      </div>
      <span class="tag">MV3 · Local</span>
    </div>

    <div class="mid">
      <div class="sub">Extrae tablas, listas y tarjetas web a <em>Excel (.xlsx) y CSV</em></div>
      <div class="mini-grid">
        <div class="cell hdr"></div><div class="cell cyan"></div><div class="cell hdr"></div>
        <div class="cell"></div><div class="cell"></div><div class="cell"></div>
        <div class="cell"></div><div class="cell"></div><div class="cell"></div>
      </div>
    </div>

    <div class="badges">
      <span class="badge green">Side Panel</span>
      <span class="badge cyan">Excel .xlsx</span>
      <span class="badge">CSV 100% Local</span>
    </div>
  </div>
</body>
</html>`;
}

function buildFeatured1400(iconUri) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: 1400px;
    height: 560px;
    overflow: hidden;
    font-family: "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
    background: radial-gradient(circle at 76% 42%, rgba(16, 185, 129, 0.16), transparent 48%),
                radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.14), transparent 45%),
                linear-gradient(135deg, #0B1220 0%, #0F172A 58%, #13233A 100%);
    color: #F8FAFC;
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    width: 1400px;
    height: 560px;
    padding: 48px 60px;
    display: grid;
    grid-template-columns: 0.96fr 1.24fr;
    gap: 44px;
    align-items: center;
  }
  .left {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .kicker {
    align-self: flex-start;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.14);
    color: #6EE7B7;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 15px;
  }
  .icon-box {
    width: 62px;
    height: 62px;
    border-radius: 15px;
    background: #142033;
    border: 1px solid #263B59;
    display: grid;
    place-items: center;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
  }
  .icon-box img { width: 42px; height: 42px; }
  .brand-name {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -0.025em;
  }
  .brand-name span { color: #10B981; }
  .headline {
    font-size: 35px;
    font-weight: 700;
    line-height: 1.18;
    color: #E2E8F0;
  }
  .headline em {
    font-style: normal;
    color: #22D3EE;
  }
  .desc {
    font-size: 16.5px;
    line-height: 1.5;
    color: #94A3B8;
    max-width: 510px;
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .pill {
    padding: 8px 15px;
    border-radius: 999px;
    font-size: 13.5px;
    font-weight: 600;
    background: #152236;
    border: 1px solid #2A3F5F;
    color: #CBD5E1;
  }
  .pill.green {
    border-color: rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.14);
    color: #6EE7B7;
  }
  .pill.cyan {
    border-color: rgba(6, 182, 212, 0.45);
    background: rgba(6, 182, 212, 0.14);
    color: #67E8F9;
  }

  /* Browser + Side Panel Mockup */
  .window {
    height: 464px;
    background: #0F172A;
    border: 1px solid #2A3C58;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 26px 60px rgba(0, 0, 0, 0.5);
    display: grid;
    grid-template-columns: 1fr 292px;
  }
  .page {
    background: #F8FAFC;
    color: #0F172A;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .page-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 700;
    color: #1E293B;
  }
  .page-url {
    font-size: 11px;
    font-weight: 500;
    color: #64748B;
    background: #E2E8F0;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .detect-frame {
    flex: 1;
    border: 2px solid #06B6D4;
    border-radius: 10px;
    padding: 10px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: rgba(6, 182, 212, 0.04);
  }
  .p-card {
    background: #FFFFFF;
    border: 1.5px dashed #06B6D4;
    border-radius: 8px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .p-thumb {
    height: 54px;
    border-radius: 6px;
    background: linear-gradient(135deg, #2DD4BF, #0EA5E9);
  }
  .p-card:nth-child(2) .p-thumb { background: linear-gradient(135deg, #38BDF8, #6366F1); }
  .p-card:nth-child(3) .p-thumb { background: linear-gradient(135deg, #F59E0B, #EC4899); }
  .p-card:nth-child(4) .p-thumb { background: linear-gradient(135deg, #10B981, #06B6D4); }
  .p-title { font-size: 12.5px; font-weight: 700; color: #0F172A; }
  .p-price { font-size: 12px; font-weight: 700; color: #059669; }
  .p-meta { font-size: 11px; color: #64748B; }

  .sidepanel {
    background: #0D1524;
    border-left: 1px solid #24344D;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .sp-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
  }
  .sp-brand img { width: 18px; height: 18px; }
  .sp-pill {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid #334155;
    color: #94A3B8;
  }
  .sp-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .btn-primary {
    background: #10B981;
    color: #052E16;
    font-size: 11.5px;
    font-weight: 700;
    padding: 8px 10px;
    border-radius: 7px;
    text-align: center;
  }
  .btn-ghost {
    background: #162238;
    border: 1px solid #2A3B58;
    color: #E2E8F0;
    font-size: 11.5px;
    font-weight: 600;
    padding: 8px 10px;
    border-radius: 7px;
    text-align: center;
  }
  .sp-meta {
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #94A3B8;
  }
  .sp-meta strong { color: #22D3EE; font-weight: 700; }
  .table-box {
    flex: 1;
    background: #111C30;
    border: 1px solid #23334D;
    border-radius: 9px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: hidden;
  }
  .t-row {
    display: grid;
    grid-template-columns: 1.4fr 0.7fr;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 11.5px;
    background: #16233B;
    color: #E2E8F0;
  }
  .t-row.hdr {
    background: #1B2B47;
    color: #6EE7B7;
    font-weight: 700;
  }
  .sp-export {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .btn-pro {
    background: #162238;
    border: 1px solid rgba(16, 185, 129, 0.5);
    color: #6EE7B7;
    font-size: 11.5px;
    font-weight: 700;
    padding: 8px 8px;
    border-radius: 7px;
    text-align: center;
  }
</style>
</head>
<body>
  <div class="canvas">
    <section class="left">
      <span class="kicker">Suite Chala · 100% Local</span>
      <div class="brand">
        <div class="icon-box"><img src="${iconUri}" alt="" /></div>
        <div class="brand-name">Chala<span>Scrape</span></div>
      </div>
      <h1 class="headline">Extrae tablas y listas web a <em>Excel y CSV</em></h1>
      <p class="desc">
        Detecta patrones repetitivos en la pestaña activa, edita columnas en el Panel Lateral y exporta localmente sin enviar datos fuera del navegador.
      </p>
      <div class="pills">
        <span class="pill green">Detección en 1 clic</span>
        <span class="pill cyan">Excel .xlsx / CSV</span>
        <span class="pill">Sin &lt;all_urls&gt;</span>
      </div>
    </section>

    <section class="window">
      <div class="page">
        <div class="page-top">
          <span>Catálogo Detectado</span>
          <span class="page-url">tienda-demo.local/catalogo</span>
        </div>
        <div class="detect-frame">
          <div class="p-card">
            <div class="p-thumb"></div>
            <div class="p-title">Cafetera de émbolo 1 L</div>
            <div class="p-price">US$ 24.90</div>
            <div class="p-meta">Cocina · ★ 4.7</div>
          </div>
          <div class="p-card">
            <div class="p-thumb"></div>
            <div class="p-title">Lámpara LED escritorio</div>
            <div class="p-price">US$ 32.50</div>
            <div class="p-meta">Oficina · ★ 4.5</div>
          </div>
          <div class="p-card">
            <div class="p-thumb"></div>
            <div class="p-title">Mochila urbana 20 L</div>
            <div class="p-price">US$ 48.00</div>
            <div class="p-meta">Viaje · ★ 4.8</div>
          </div>
          <div class="p-card">
            <div class="p-thumb"></div>
            <div class="p-title">Audífonos inalámbricos</div>
            <div class="p-price">US$ 59.99</div>
            <div class="p-meta">Audio · ★ 4.4</div>
          </div>
        </div>
      </div>

      <aside class="sidepanel">
        <div class="sp-head">
          <div class="sp-brand"><img src="${iconUri}" alt="" /><span>ChalaScrape</span></div>
          <span class="sp-pill">SIDE PANEL</span>
        </div>
        <div class="sp-actions">
          <div class="btn-primary">Detectar datos</div>
          <div class="btn-ghost">Cambiar selección</div>
        </div>
        <div class="sp-meta">
          <span>Vista previa</span>
          <strong>12 filas · 5 cols</strong>
        </div>
        <div class="table-box">
          <div class="t-row hdr"><span>Producto</span><span>Precio</span></div>
          <div class="t-row"><span>Cafetera de émbolo 1 L</span><span>US$ 24.90</span></div>
          <div class="t-row"><span>Lámpara LED escritorio</span><span>US$ 32.50</span></div>
          <div class="t-row"><span>Mochila urbana 20 L</span><span>US$ 48.00</span></div>
          <div class="t-row"><span>Audífonos inalámbricos</span><span>US$ 59.99</span></div>
          <div class="t-row"><span>Termo acero 750 ml</span><span>US$ 19.50</span></div>
        </div>
        <div class="sp-export">
          <div class="btn-primary">Exportar CSV</div>
          <div class="btn-pro">Exportar .xlsx</div>
        </div>
      </aside>
    </section>
  </div>
</body>
</html>`;
}

async function renderJob(cdp, tmpDir, name, width, height, html) {
  const htmlPath = path.join(tmpDir, `${name}.html`);
  fs.writeFileSync(htmlPath, html, "utf8");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await cdp.send("Page.navigate", { url: pathToFileURL(htmlPath).href });
  await new Promise((r) => setTimeout(r, 320));
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true
  });
  const outPath = path.join(STORE_DIR, name);
  fs.writeFileSync(outPath, Buffer.from(data, "base64"));
  assertPngDimensions(outPath, width, height);
  console.log(`Generated ${outPath} (${width}x${height})`);
}

async function main() {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const browserBin = findBrowserBinary();
  const port = await getFreePort();
  const tmpProfile = fs.mkdtempSync(path.join(os.tmpdir(), "chalascrape-assets-"));
  const iconUri = getIconDataUri();

  const browserProc = spawn(browserBin, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tmpProfile}`,
    "about:blank"
  ], { stdio: "ignore" });

  let cdp;
  try {
    const wsUrl = await waitForTargetWsUrl(port);
    cdp = new CdpClient(wsUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await renderJob(cdp, tmpProfile, "promo-440x280.png", 440, 280, buildPromo440(iconUri));
    await renderJob(cdp, tmpProfile, "destacada-1400x560.png", 1400, 560, buildFeatured1400(iconUri));
  } finally {
    if (cdp) cdp.close();
    await new Promise((r) => {
      browserProc.once("exit", r);
      browserProc.kill();
      setTimeout(r, 1500);
    });
    try { fs.rmSync(tmpProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 }); } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

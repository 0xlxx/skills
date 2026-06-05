// Probe toolbox for fix workflow.
// Enable only the capabilities needed. Fill in pageUrl and setup,
// then toggle flags below. Each probe is self-contained — enable one or many.

import { chromium } from 'playwright';
import { cac } from 'cac';
import fs from 'fs';

const cli = cac('probe');
cli.option('--debug', 'Show verbose output');
const { options } = cli.parse();

// ── CONFIG ──────────────────────────────────────────────────────────────────

const pageUrl = 'http://localhost:3000'; // TODO: fill in

const setup = async (page) => {
  // TODO: navigate, click, type, wait — trigger the bug
};

// ── PROBE FLAGS ─────────────────────────────────────────────────────────────
// Toggle to true to enable specific probes.

const PROBE_CONSOLE = false;   // Collect console.log/warn/error with call stacks
const PROBE_NETWORK = false;   // Intercept requests/responses, capture SSE/WS
const PROBE_TRACE = false;     // Record Playwright trace for timeline analysis
const PROBE_SNAPSHOTS = false; // Take DOM snapshots at key moments

// ── RUNNER ──────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ---- Console probe -------------------------------------------------------
  if (PROBE_CONSOLE) {
    const consoleLog = [];
    page.on('console', (msg) => {
      consoleLog.push({ type: msg.type(), text: msg.text(), location: msg.location() });
      if (options.debug) console.log(`[console.${msg.type()}]`, msg.text());
    });
    // Attach call-stack capture by injecting trace into console methods
    await page.addInitScript(() => {
      const orig = console.error;
      console.error = (...args) => {
        orig('[probe]', new Error().stack, ...args);
      };
    });
  }

  // ---- Network probe -------------------------------------------------------
  if (PROBE_NETWORK) {
    const networkLog = [];
    page.on('request', (req) => {
      networkLog.push({ type: 'request', url: req.url(), method: req.method(), headers: req.headers() });
      if (options.debug) console.log(`[network.request] ${req.method()} ${req.url()}`);
    });
    page.on('response', async (res) => {
      let body;
      try { body = await res.text(); } catch { body = '[binary]'; }
      networkLog.push({ type: 'response', url: res.url(), status: res.status(), body: body.slice(0, 2000) });
      if (options.debug) console.log(`[network.response] ${res.status()} ${res.url()}`);
    });
    // SSE capture
    page.on('request', (req) => {
      if (req.headers()['accept']?.includes('text/event-stream')) {
        req.response().then(async (res) => {
          const body = await res.text();
          console.log('[sse]', body.slice(0, 3000));
        }).catch(() => {});
      }
    });
    // WebSocket capture
    page.on('websocket', (ws) => {
      if (options.debug) console.log(`[ws] connected: ${ws.url()}`);
      ws.on('framereceived', (frame) => {
        console.log(`[ws ◀]`, frame.payload.toString().slice(0, 2000));
      });
      ws.on('framesent', (frame) => {
        console.log(`[ws ▶]`, frame.payload.toString().slice(0, 2000));
      });
    });
  }

  // ---- Trace probe ---------------------------------------------------------
  if (PROBE_TRACE) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }

  // ---- Run ----------------------------------------------------------------
  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await setup(page);
  } catch (err) {
    console.error('❌ Setup error:', err.message);
  }

  // ---- Snapshot probe ------------------------------------------------------
  if (PROBE_SNAPSHOTS) {
    const ts = Date.now();
    await page.screenshot({ path: `probe-snap-${ts}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`probe-snap-${ts}.html`, html);
    console.log(`[snapshot] probe-snap-${ts}.png / .html`);
  }

  // ---- Finalize -----------------------------------------------------------
  if (PROBE_TRACE) {
    const tracePath = `probe-trace-${Date.now()}.zip`;
    await context.tracing.stop({ path: tracePath });
    console.log(`[trace] Saved to ${tracePath}`);
    console.log(`  Open with: npx playwright show-trace ${tracePath}`);
  }

  await browser.close();

  // ---- Summary -------------------------------------------------------------
  console.log('\n--- Probe Summary ---');
  if (PROBE_CONSOLE) console.log(`Console entries: ${consoleLog?.length ?? 'N/A'}`);
  if (PROBE_NETWORK) console.log(`Network events: ${networkLog?.length ?? 'N/A'}`);
  console.log('Done.');

  process.exit(0);
}

run();

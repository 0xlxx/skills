// Reproduce script template for fix workflow.
// Fill in pageUrl, setup, and assertions. Keep everything else.

import { chromium } from 'playwright';
import { cac } from 'cac';

const cli = cac('reproduce');

cli.option('--debug', 'Enable screenshots and DOM dumps on failure');

const { options } = cli.parse();

// ── CONFIG ──────────────────────────────────────────────────────────────────

const pageUrl = 'http://localhost:3000'; // TODO: fill in

const setup = async (page) => {
  // TODO: navigate, click, type, wait — trigger the bug
};

const assertions = async (page) => {
  // TODO: check DOM, text, attributes, visibility — what should be true
};

// ── RUNNER ──────────────────────────────────────────────────────────────────

async function run() {
  const browser = await chromium.launch({ headless: !options.debug });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle' });
    await setup(page);
    await assertions(page);

    console.log('✅ PASS');
    process.exit(0);
  } catch (err) {
    console.error('❌ FAIL:', err.message);

    if (options.debug) {
      const ts = Date.now();
      await page.screenshot({ path: `regression-fail-${ts}.png`, fullPage: true });
      const html = await page.content();
      const fs = await import('fs');
      fs.writeFileSync(`regression-fail-${ts}.html`, html);
      console.error(`  Screenshot: regression-fail-${ts}.png`);
      console.error(`  DOM dump:   regression-fail-${ts}.html`);
    }

    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();

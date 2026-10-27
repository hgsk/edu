// Verify the offline reader with an owned Chromium process and guaranteed cleanup.
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '../..');
  const out = path.join(root, 'hht/assets/unity');
  const report = { checks: [], errors: [], cleanup: 'NOT RUN' };
  let server, browser, proc;
  try {
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    server = await chromium.launchServer({ headless: true });
    proc = server.process();
    report.process = { pid: proc.pid, executable: proc.spawnfile, startedAt: new Date().toISOString() };
    browser = await chromium.connect(server.wsEndpoint());
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(pathToFileURL(process.env.UNITY_COURSE_FILE || path.join(root, 'unity/index.html')).href);
    assert.equal(await page.locator('nav a').count(), 36);
    assert.equal(await page.locator('h3').count(), 36);
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(img => img.decode());
      assert.ok(await image.getAttribute('alt'));
      assert.ok(await image.evaluate(img => img.naturalWidth > 0));
    }
    const count = await page.locator('main img').count();
    assert.ok(count >= 50);
    report.checks.push({ name: '36 units, alt text, actual image decoding', status: 'PASS', images: count });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('nav a[href="#unity-36"]').click();
      assert.equal(new URL(page.url()).hash, '#unity-36');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `horizontal overflow at ${width}`);
      await page.screenshot({ path: path.join(out, `reader-${width}.png`) });
      report.checks.push({ name: `navigation and layout ${width}px`, status: 'PASS' });
    }
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
  } catch (e) {
    report.status = 'FAIL'; report.errors.push(e.stack || String(e)); process.exitCode = 1;
  } finally {
    await browser?.close().catch(e => report.errors.push('browser close: ' + e.message));
    await server?.close().catch(e => report.errors.push('server close: ' + e.message));
    report.cleanup = !proc || proc.exitCode !== null || proc.signalCode !== null ? 'PASS' : 'FAIL';
    if (report.cleanup !== 'PASS' || report.errors.length) { report.status = 'FAIL'; process.exitCode = 1; }
    await fs.writeFile(process.env.UNITY_VERIFICATION_REPORT || path.join(out, 'browser-verification.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
})();

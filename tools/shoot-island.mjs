/**
 * Drives the running dev server in headless Chromium and screenshots the 3D island from a few
 * camera angles. Used to eyeball the procedurally assembled houses — their geometry is built from
 * the kit's grid conventions, which a typecheck can't validate.
 *
 * Usage: node tools/shoot-island.mjs [outputDir]
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.argv[2] ?? 'tmp/shots');
// `ng serve` falls back to a random port if 4200 looks busy, so allow overriding it.
const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:4200';
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') {
    errors.push(message.text());
  }
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

// The island only appears once both kit GLBs have loaded and the first frame is drawn.
await page.waitForSelector('app-cube-experience canvas', { timeout: 60000 });
await page.waitForFunction(
  () => document.querySelectorAll('app-cube-experience .label-chip').length > 1,
  { timeout: 60000 },
);
await page.waitForTimeout(1500);

/** Orbits the camera by dragging across the canvas, then screenshots. */
async function shoot(name, drag) {
  if (drag) {
    const box = await page.locator('app-cube-experience canvas').boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + drag.dx, cy + drag.dy, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: path.join(outputDir, `${name}.png`) });
  console.log(`wrote ${name}.png`);
}

await shoot('01-overview');

// Fly to each island via the header nav, which also parks the orbit target on it — then drag to
// confirm the island turns on its own axis rather than swinging around the world centre.
for (const [label, slug] of [
  ['Projekte', 'projects'],
  ['Skills', 'skills'],
  ['Über mich', 'about'],
  ['Kontakt', 'contact'],
]) {
  await page.locator('app-header').getByRole('button', { name: label }).first().click();
  await page.waitForTimeout(1600);
  await shoot(`02-${slug}`);
  await shoot(`03-${slug}-orbited`, { dx: 260, dy: 0 });
}

// Zoom toward the cursor in two stages: one framing a whole building, one close enough to check
// how the wall modules and their inserts meet.
await page.mouse.move(720, 450);
for (let i = 0; i < 7; i++) {
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(1200);
await shoot('04-building');

for (let i = 0; i < 9; i++) {
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(80);
}
await page.waitForTimeout(1200);
await shoot('05-closeup');

const labels = await page.locator('app-cube-experience .label-chip').allTextContents();
console.log('labels:', JSON.stringify(labels));
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.join('\n')}` : 'no console errors');

await browser.close();

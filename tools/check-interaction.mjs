/**
 * Drives the running dev server to verify the island's interactions end to end: clicking a house
 * opens that project's modal, clicking a label chip does the same, and each header-nav link opens
 * its panel. Usage: node tools/check-interaction.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve('tmp/interaction');
// `ng serve` falls back to a random port if 4200 looks busy, so allow overriding it.
const baseUrl = process.env['BASE_URL'] ?? 'http://localhost:4200';
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('app-cube-experience canvas', { timeout: 60000 });
await page.waitForFunction(
  () => document.querySelectorAll('app-cube-experience .label-chip').length > 1,
  { timeout: 60000 },
);
await page.waitForTimeout(1500);

const dialog = page.locator('app-cube-experience [role="dialog"]');

async function closeAnyPanel() {
  if (await dialog.count()) {
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

// --- 1. Click a label chip -> that project's modal ---
// Building chips only appear once the camera is at an island, so fly there first. The opening
// view deliberately shows island titles only.
await page.locator('app-header').getByRole('button', { name: 'Projekte' }).first().click();
await page.waitForTimeout(2200);

const chip = page.locator('app-cube-experience .label-chip[data-kind="project"]').first();
const chipText = (await chip.textContent())?.trim();
// The island bobs continuously, so the chips never satisfy Playwright's stability check.
await chip.click({ force: true });
await dialog.waitFor({ timeout: 5000 });
const chipModalText = await dialog.innerText();
check('label chip opens its project', chipModalText.includes(chipText), `expected "${chipText}"`);

// The project modal is the one that carries media — confirm it actually rendered some.
const mediaCount = await dialog.locator('video, img').count();
check('project modal shows video/screenshots', mediaCount > 0, `${mediaCount} media elements`);
await page.screenshot({ path: path.join(outputDir, 'project-modal.png') });
await closeAnyPanel();

// --- 2. Click the house itself on the canvas ---
// Aim just below a chip's anchor, which is where that project's roof sits.
const box = await chip.boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height + 60);
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
check('clicking a house opens a project', (await dialog.count()) > 0);
if (await dialog.count()) {
  await page.screenshot({ path: path.join(outputDir, 'house-click.png') });
}
await closeAnyPanel();

// --- 2b. With a panel open, the X button closes it and the wheel scrolls the panel ---
await chip.click({ force: true });
await dialog.waitFor({ timeout: 5000 });

/**
 * Screen position of one named chip — a proxy for where the camera is. Zooming moves it a long
 * way; the island's idle bob only by a pixel or two.
 *
 * Deliberately pinned to one chip by name rather than "the first two chips": chips now come and go
 * with camera distance, so an index-based pick can silently compare two different chips.
 */
async function chipPosition(name) {
  return page.evaluate((wanted) => {
    const chip = [...document.querySelectorAll('app-cube-experience .label-chip[data-kind]')].find(
      (el) => el.textContent.trim() === wanted,
    );
    if (!chip) return null;
    const rect = chip.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  }, name);
}

const posBefore = await chipPosition(chipText);
const modal = page.locator('app-cube-experience .modal');
const modalBox = await modal.boundingBox();
await page.mouse.move(modalBox.x + modalBox.width / 2, modalBox.y + modalBox.height / 2);
await page.mouse.wheel(0, 400);
await page.waitForTimeout(700);

const scrollTop = await modal.evaluate((el) => el.scrollTop);
check('wheel scrolls the open panel', scrollTop > 0, `scrollTop=${scrollTop}`);

const posAfter = await chipPosition(chipText);
const drift =
  posBefore && posAfter ? Math.hypot(posAfter.x - posBefore.x, posAfter.y - posBefore.y) : Infinity;
check(
  'wheel does not zoom the world behind a panel',
  drift < 10,
  `chip moved ${drift.toFixed(1)}px`,
);

await page.locator('app-cube-experience [aria-label="Fenster schließen"]').click();
await page.waitForTimeout(600);
check('X button closes the panel', (await dialog.count()) === 0);
await closeAnyPanel();

// --- 3. Skills island: nav flies there, then a tower opens its skill ---
await page.locator('app-header').getByRole('button', { name: 'Skills' }).first().click();
await page.waitForTimeout(2000);
check('nav "Skills" stays in the world', (await dialog.count()) === 0);

const skillChip = page.locator('app-cube-experience .label-chip[data-kind="skill"]').first();
const skillName = (await skillChip.textContent())?.trim();
await skillChip.click({ force: true });
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
const skillText = (await dialog.count()) ? await dialog.innerText() : '';
check('skill chip opens its skill', skillText.includes(skillName), `expected "${skillName}"`);
if (await dialog.count()) {
  await page.screenshot({ path: path.join(outputDir, 'skill-modal.png') });
}
await closeAnyPanel();

const skillBox = await skillChip.boundingBox();
await page.mouse.click(skillBox.x + skillBox.width / 2, skillBox.y + skillBox.height + 70);
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
check('clicking a tower opens a skill', (await dialog.count()) > 0);
await closeAnyPanel();

// --- 3b. About island: nav flies there, then the castle opens the About panel ---
await page.locator('app-header').getByRole('button', { name: 'Über mich' }).first().click();
await page.waitForTimeout(2000);
check('nav "Über mich" stays in the world', (await dialog.count()) === 0);

const castleChip = page.locator('app-cube-experience .label-chip[data-kind="about"]').first();
await castleChip.click({ force: true });
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
const aboutText = (await dialog.count()) ? (await dialog.innerText()).toLocaleLowerCase('de') : '';
check('castle chip opens the About panel', aboutText.includes('über mich'));
await closeAnyPanel();

const castleBox = await castleChip.boundingBox();
await page.mouse.click(castleBox.x + castleBox.width / 2, castleBox.y + castleBox.height + 80);
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
check('clicking the castle opens the About panel', (await dialog.count()) > 0);
await closeAnyPanel();

// --- 3c. Contact island: nav flies there, then the cruise ship opens the Contact panel ---
await page.locator('app-header').getByRole('button', { name: 'Kontakt' }).first().click();
await page.waitForTimeout(2000);
check('nav "Kontakt" stays in the world', (await dialog.count()) === 0);

const shipChip = page.locator('app-cube-experience .label-chip[data-kind="contact"]').first();
await shipChip.click({ force: true });
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
const contactText = (await dialog.count())
  ? (await dialog.innerText()).toLocaleLowerCase('de')
  : '';
check('ship chip opens the Contact panel', contactText.includes('kontakt'));
await closeAnyPanel();

const shipBox = await shipChip.boundingBox();
await page.mouse.click(shipBox.x + shipBox.width / 2, shipBox.y + shipBox.height + 60);
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
check('clicking the cruise ship opens the Contact panel', (await dialog.count()) > 0);
await closeAnyPanel();

// --- 4. Header nav opens each remaining section as a panel ---
for (const [label, expected] of [['Werdegang', 'Werdegang']]) {
  await page.locator('app-header').getByRole('button', { name: label }).first().click();
  const opened = await dialog
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  // Compared case-insensitively: the panel's eyebrow is uppercased by CSS, and innerText reflects
  // the rendered text-transform.
  const text = opened ? (await dialog.innerText()).toLocaleLowerCase('de') : '';
  check(
    `nav "${label}" opens its panel`,
    opened && text.includes(expected.toLocaleLowerCase('de')),
    opened ? `got: ${JSON.stringify(text.slice(0, 50))}` : 'no dialog appeared',
  );
  if (opened) {
    await page.screenshot({ path: path.join(outputDir, `nav-${expected}.png`) });
  }
  await closeAnyPanel();
}

// --- 5. Nav "Projekte" must not open a panel; it flies the camera instead ---
await page.locator('app-header').getByRole('button', { name: 'Projekte' }).first().click();
await page.waitForTimeout(1500);
check('nav "Projekte" stays in the world', (await dialog.count()) === 0);

// --- 6. The reset button returns the camera to the opening view ---
// Compared against the island title chip, which is only drawn from far enough out — so finding it
// back in its original spot means the camera really is back where the world loads.
async function titleChipPosition(name) {
  return page.evaluate((wanted) => {
    const chip = [...document.querySelectorAll('app-cube-experience .label-chip')].find(
      (el) => el.textContent.trim() === wanted,
    );
    if (!chip) return null;
    const rect = chip.getBoundingClientRect();
    return { x: rect.x, y: rect.y };
  }, name);
}

await page.locator('app-cube-experience .reset-view').click();
await page.waitForTimeout(1800);
const openingSpot = await titleChipPosition('Projekte');

// Wander off. The chip stays drawn — distant islands keep their name so you can navigate to them
// — but it should be somewhere else entirely.
await page.locator('app-header').getByRole('button', { name: 'Skills' }).first().click();
await page.waitForTimeout(2200);
const wanderedSpot = await titleChipPosition('Projekte');
const wanderDrift =
  openingSpot && wanderedSpot
    ? Math.hypot(wanderedSpot.x - openingSpot.x, wanderedSpot.y - openingSpot.y)
    : Infinity;
check(
  'wandering moves the view away',
  wanderDrift > 50,
  `chip moved ${wanderDrift === Infinity ? 'off screen' : `${wanderDrift.toFixed(0)}px`}`,
);

await page.locator('app-cube-experience .reset-view').click();
await page.waitForTimeout(1800);
const resetSpot = await titleChipPosition('Projekte');
const resetDrift =
  openingSpot && resetSpot
    ? Math.hypot(resetSpot.x - openingSpot.x, resetSpot.y - openingSpot.y)
    : Infinity;
check(
  'reset button returns to the opening view',
  resetDrift < 8,
  `chip landed ${resetDrift.toFixed(1)}px from the opening spot`,
);

// --- 7. From the opening view, clicking an island flies to it ---
/** How big the named island looks on screen, via the spread of its own chips. Flying closer makes
 * it grow; this is a camera-independent way to prove we arrived. */
async function skillChipCount() {
  return page.locator('app-cube-experience .label-chip[data-kind="skill"]').count();
}

check('opening view shows no building chips', (await skillChipCount()) === 0);

// Click the Skills island itself on the canvas, aiming just below its title chip.
const skillsTitle = await titleChipPosition('Skills');
await page.mouse.click(skillsTitle.x + 20, skillsTitle.y + 70);
await page.waitForTimeout(2000);
check(
  'clicking a distant island flies to it',
  (await skillChipCount()) > 0,
  `${await skillChipCount()} skill chips after the flight`,
);

// Back out, then do the same through the island's title chip.
await page.locator('app-cube-experience .reset-view').click();
await page.waitForTimeout(1800);
const aboutTitle = page.locator('app-cube-experience .label-chip[data-island="about"]');
check('distant island titles are marked clickable', (await aboutTitle.count()) === 1);

await aboutTitle.click({ force: true });
await page.waitForTimeout(2000);
check(
  'clicking an island title flies to it',
  (await page.locator('app-cube-experience .label-chip[data-kind="about"]').count()) > 0,
);

// Up close the title is a caption again, not a fly-to target.
check(
  'arriving clears the title fly-to target',
  (await page.locator('app-cube-experience .label-chip[data-island="about"]').count()) === 0,
);

check('no console errors', errors.length === 0, errors.join(' | '));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);

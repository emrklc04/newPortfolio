import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-gl=angle','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1100 } });
await p.goto(process.env.BASE_URL, { waitUntil: 'domcontentloaded' });
await p.waitForSelector('app-cube-experience canvas');
await p.waitForFunction(() => document.querySelectorAll('.label-chip').length > 1);
await p.waitForTimeout(1600);
await p.locator('app-header').getByRole('button', { name: 'Skills' }).first().click();
await p.waitForTimeout(2200);
const box = await p.locator('app-cube-experience canvas').boundingBox();
const cx = box.x + box.width/2, cy = box.y + box.height/2;
// Drag down -> camera swings overhead.
await p.mouse.move(cx, cy); await p.mouse.down();
await p.mouse.move(cx, cy + 420, { steps: 30 }); await p.mouse.up();
await p.waitForTimeout(1200);
for (let i=0;i<4;i++){ await p.mouse.wheel(0,-120); await p.waitForTimeout(80); }
await p.waitForTimeout(1200);
await p.screenshot({ path: 'tmp/ring-top.png' });
await b.close();

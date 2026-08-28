import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5187/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);
const el = page.locator('text=Бестселлэр бүтээгдэхүүн').first();
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy(0, 250));
await page.waitForTimeout(300);
await page.screenshot({ path: '.tmp_bs_home2.png', clip: { x: 0, y: 0, width: 1280, height: 700 } });
await browser.close();
console.log('done');

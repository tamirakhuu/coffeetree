import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:5187/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(2500);
const box = await page.evaluate(() => {
  const el = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === 'Бестселлэр бүтээгдэхүүн');
  const section = el.closest('section');
  const r = section.getBoundingClientRect();
  return { top: r.top + window.scrollY, height: r.height, bg: getComputedStyle(section).background };
});
console.log('section box:', JSON.stringify(box));
await page.screenshot({ path: '.tmp_bs_home3.png', clip: { x: 0, y: box.top, width: 1280, height: Math.min(box.height, 700) } });
await browser.close();
console.log('done');

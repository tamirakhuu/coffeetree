import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';

// Production bundle smoke test with isolated API fixtures; never creates real orders.
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve('dist', '.' + (extname(pathname) ? pathname : '/index.html'));
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const base = `http://127.0.0.1:${server.address().port}`;
  const product = { id: 1, name: 'Test Coffee', category_id: 1, brand_id: 1, subcategory: 'Beans', origin: 'Mongolia', tag: 'бестселлэр', images: [], unit_label: '250g', unit_price: 20000, warehouse_unit_stock: 10, box_label: 'Box', box_price: 100000, box_per_box: 6, warehouse_box_stock: 5 };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    if (url.hostname.endsWith('supabase.co')) {
      const table = url.pathname.split('/').at(-1);
      const data = { categories: [{ id: 1, name: 'Кофе', icon: 'CoffeeBean' }], subcategories: [{ category_id: 1, name: 'Beans' }], brands: [{ id: 1, name: 'Test Brand' }], products: [product] }[table] || [];
      return route.fulfill({ json: data });
    }
    return route.abort();
  });
  await context.routeWebSocket('**/*.supabase.co/**', ws => ws.close());
  await context.addInitScript(() => {
    if (!localStorage.getItem('cuppa:cart:guest')) localStorage.setItem('cuppa:cart:guest', JSON.stringify([{ productId: 1, optionType: 'unit', qty: 2 }]));
    localStorage.setItem('cuppa:wishlist:guest', '[1]');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const chunks = [];
  page.on('request', req => { if (req.url().endsWith('.js')) chunks.push(req.url()); });
  const routes = ['/', '/category/1', '/brand/test-brand', '/product/1', '/search?q=Test', '/wishlist', '/checkout', '/payment', '/confirmation', '/training', '/training-status', '/about', '/bestseller', '/new', '/discount', '/order-status', '/privacy', '/terms'];
  for (const path of routes) {
    await page.goto(base + path);
    await page.locator('main').waitFor();
    await page.getByRole('status').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('alert').count(), 0, `Error boundary on ${path}`);
    assert.ok((await page.locator('main').innerText()).trim(), `Empty page on ${path}`);
    assert.deepEqual(errors, [], `Runtime errors on ${path}`);
    if (path === '/') {
      assert.ok(chunks.some(url => url.includes('/Home-')));
      assert.ok(!chunks.some(url => /\/(Checkout|TrainingPage|ProductDetail)-/.test(url)), 'Unvisited pages loaded eagerly');
    }
    console.log(`PASS ${path}`);
  }
  // Slow chunk download keeps the shell visible, and browser history keeps cart state.
  await page.route('**/WishlistPage-*.js', async route => {
    await new Promise(r => setTimeout(r, 700));
    await route.continue();
  });
  await page.goto(base + '/product/1');
  await page.locator('main h1').waitFor();
  await page.locator('header button').filter({ has: page.locator('svg.lucide-heart') }).click();
  await page.waitForURL('**/wishlist');
  await page.locator('header').waitFor({ state: 'visible' });
  await page.getByRole('status').waitFor({ state: 'hidden' });
  await page.goBack();
  await page.waitForURL('**/product/1');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cuppa:cart:guest'))[0].qty), 2);
  assert.deepEqual(errors, []);
  console.log('PASS lazy chunks, navigation, history and cart persistence');

  // Exercise checkout -> lazy payment -> confirmation with server totals and no live writes.
  await page.route('**/rest/v1/rpc/submit_order', route => route.fulfill({ json: { orderNumber: 'TEST-1001', subtotal: 40000, deliveryFee: 0 } }));
  await page.route('**/functions/v1/qpay-create-invoice', route => route.fulfill({ json: { invoiceId: 'test-invoice', qrText: 'test', urls: [], demo: true } }));
  let paid = false;
  await page.route('**/functions/v1/qpay-check-payment', route => route.fulfill({ json: { paid, paidAmount: paid ? 40000 : 0 } }));
  await page.goto(base + '/checkout');
  await page.getByPlaceholder('Хүлээн авагчийн нэр').fill('Test Customer');
  await page.getByPlaceholder('Утасны дугаар', { exact: true }).fill('99112233');
  await page.getByRole('button', { name: 'Очиж авах(Саруул зах)', exact: true }).click();
  await page.getByRole('button', { name: 'Хувь хүн', exact: true }).click();
  await page.getByRole('button', { name: 'Баталгаажуулах', exact: true }).click();
  await page.getByRole('button', { name: 'Төлбөр төлөх', exact: true }).click();
  await page.waitForURL('**/payment');
  await page.getByRole('heading', { name: 'QPay-ээр төлөх' }).waitFor();
  assert.ok((await page.locator('main').innerText()).includes('TEST-1001'));
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('cuppa:cart:guest'))), []);
  paid = true;
  await page.waitForURL('**/confirmation');
  await page.getByRole('heading', { name: 'Төлбөр төлөлт амжилттай!' }).waitFor();
  assert.ok((await page.locator('main').innerText()).includes('TEST-1001'));
  assert.deepEqual(errors, []);
  console.log('PASS checkout, payment polling and confirmation state');

  // Homepage with a complete category grid, discounted slides and mobile layout.
  const names = ['Кофе', 'Сироп', 'Соус', 'Нунтаг', 'Бариста хэрэгсэл', 'Смүүти', 'Цай', 'Нэг удаагийн хэрэгсэл', 'Бейс', 'Эйд', 'Концентрат', 'Цэцэг, Жимс', 'Кофе шопын хэрэгсэл', 'Кофены хэрэгсэл'];
  await page.route('**/rest/v1/categories?*', route => route.fulfill({ json: names.map((name, i) => ({ id: i + 1, name, icon: 'CoffeeBean' })) }));
  await page.route('**/rest/v1/products?*', route => route.fulfill({ json: [
    { ...product, tag: 'хямдралтай', name: 'CUPPA Coffee', unit_original_price: 25000, images: ['/cuppa-logo.png'], discount_ends_at: '2099-01-01T00:00:00Z' },
    { ...product, id: 2, tag: 'хямдралтай', name: 'CUPPA Blend', images: ['/cuppa-logo.png'] },
    { ...product, id: 3 }, { ...product, id: 4, tag: 'шинэ' },
  ] }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page.locator('.home-hero h1').waitFor();
  assert.equal(await page.locator('.home-category-card').count(), 14);
  assert.equal(await page.locator('.home-category-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 7);
  await page.getByRole('button', { name: 'Дараах бараа', exact: true }).click();
  assert.equal(await page.locator('.home-hero h1').innerText(), 'CUPPA Blend');
  await page.getByRole('button', { name: 'Өмнөх бараа', exact: true }).click();
  assert.ok(!(await page.locator('.home-price').innerText()).includes('%'));
  assert.equal(await page.locator('.home-side-product').count(), 2);
  assert.equal(await page.getByRole('button', { name: /Слайд түр зогсоох|Слайд үргэлжлүүлэх/ }).count(), 0);
  await page.screenshot({ path: resolve(tmpdir(), 'cuppa-home-desktop.png'), fullPage: true });
  for (const width of [820, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.locator('.home-category-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), width > 720 ? 4 : 2);
    assert.ok(await page.locator('.home-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Home overflow at ${width}px`);
    if (width === 390) await page.screenshot({ path: resolve(tmpdir(), 'cuppa-home-mobile.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Бараа үзэх', exact: true }).click();
  await page.waitForURL('**/product/1');
  await page.goBack();
  await page.locator('.home-category-card').first().click();
  await page.waitForURL('**/category/1');
  await page.goBack();
  await page.getByRole('button', { name: 'Сургалттай танилцах' }).click();
  await page.waitForURL('**/training');
  assert.deepEqual(errors, []);
  console.log('PASS homepage slides, 7/4/2-column layouts, mobile overflow and navigation');
  console.log(`Screenshots: ${resolve(tmpdir(), 'cuppa-home-desktop.png')}, ${resolve(tmpdir(), 'cuppa-home-mobile.png')}`);
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}

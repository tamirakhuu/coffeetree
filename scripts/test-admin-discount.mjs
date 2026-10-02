import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run the actual product form and save handler with an isolated database stub.
const html = await readFile('public/admin-panel.html', 'utf8');
const formCode = html.slice(html.indexOf('function productFormHtml('), html.indexOf('function confirmDeleteProduct('));
const dateCode = html.slice(html.indexOf('function toLocalDatetimeInput('), html.indexOf('async function checkAuth('));
const escapeCode = html.slice(html.indexOf('function escapeHtml('), html.indexOf('// toLocaleDateString'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<div id="form"></div><div id="modalFoot"><button class="btn-primary">Save</button></div>');
  await page.addScriptTag({ content: `
    let productImages = [], saved = [];
    const brandOptions = () => '<option value="1">Brand</option>';
    const categoryOptions = () => '<option value="1">Category</option>';
    const subOptionsDatalist = () => '';
    const imagesSectionHtml = () => '';
    const toast = () => {}, closeModal = () => {}, loadAll = async () => {};
    const sb = { from: () => ({ insert: row => ({ select: async () => { saved.push(row); return { data: [row], error: null }; } }) }) };
    ${dateCode}
    ${escapeCode}
    ${formCode}
    function mount(product = {}) { document.getElementById('form').innerHTML = productFormHtml({ name: 'Test', unit_price: 80, ...product }); }
    mount();
  ` });
  assert.equal(await page.locator('#pf-unit-original-price').isVisible(), false);
  await page.selectOption('#pf-tag', 'хямдралтай');
  assert.equal(await page.locator('#pf-unit-original-price').isVisible(), true);
  assert.equal(await page.locator('#pf-discount-ends').isVisible(), true);
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), 0);
  await page.fill('#pf-unit-original-price', '100');
  assert.match(await page.locator('#pf-unit-discount-preview').innerText(), /20%/);
  for (const price of ['80', '70', '-1', '']) {
    await page.fill('#pf-unit-original-price', price);
    await page.evaluate(() => saveProduct(null));
    assert.equal(await page.evaluate(() => saved.length), 0);
    assert.equal(await page.locator('#pf-unit-original-price').getAttribute('aria-invalid'), 'true');
  }
  await page.fill('#pf-unit-original-price', '100');
  await page.fill('#pf-unit-price', '0');
  assert.equal(await page.locator('#pf-unit-price').getAttribute('aria-invalid'), 'true');
  await page.fill('#pf-unit-price', '80');
  await page.fill('#pf-discount-ends', '2000-01-01T12:00');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), 0);
  assert.equal(await page.locator('#pf-discount-ends').getAttribute('aria-invalid'), 'true');
  await page.fill('#pf-discount-ends', '');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), 1);
  assert.equal(await page.evaluate(() => saved[0].discount_ends_at), null);

  await page.evaluate(() => mount({ id: 1, tag: 'хямдралтай', unit_original_price: 100, box_price: 400, box_per_box: 6, box_original_price: 500 }));
  await page.evaluate(() => toggleDiscountEndField());
  assert.match(await page.locator('#pf-box-discount-preview').innerText(), /20%/);
  await page.fill('#pf-box-original-price', '300');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), 1);
  await page.uncheck('#pf-box-enable');
  assert.equal(await page.evaluate(() => validateProductDiscount()), true);
  await page.selectOption('#pf-tag', 'шинэ');
  assert.equal(await page.locator('#pf-unit-original-price').isVisible(), false);
  assert.equal(await page.locator('#pf-discount-ends').isVisible(), false);
  await page.selectOption('#pf-tag', 'хямдралтай');
  assert.equal(await page.inputValue('#pf-unit-original-price'), '100');
  await page.fill('#pf-discount-ends', '2099-01-01T12:00');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), 2);
  await page.evaluate(() => mount({ size: '750 мл "<b>"' }));
  assert.equal(await page.inputValue('#pf-size'), '750 мл "<b>"');
  assert.equal(await page.locator('#form b').count(), 0);
  await page.fill('#pf-size', '  250 г  ');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved[2].size), '250 г');
  await page.fill('#pf-size', '');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved[3].size), null);
  assert.match(await page.evaluate(() => saved[1].discount_ends_at), /^2099-/);
  assert.deepEqual(errors, []);
  await page.evaluate(() => mount({ unit_price: 16500 }));
  await page.fill('#pf-bulk-qty', '3');
  await page.fill('#pf-bulk-unit-price', '15000');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.at(-1).bulk_unit_price), 15000);
  assert.equal(await page.evaluate(() => saved.at(-1).bulk_qty), 3);
  assert.equal(await page.evaluate(() => saved.at(-1).box_price), 0);
  const count = await page.evaluate(() => saved.length);
  for (const price of ['-1', '20000', '']) {
    await page.fill('#pf-bulk-unit-price', price);
    await page.evaluate(() => saveProduct(null));
    assert.equal(await page.evaluate(() => saved.length), count);
  }
  await page.fill('#pf-bulk-unit-price', '15000');
  await page.fill('#pf-bulk-qty', '2.5');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), count);
  console.log('PASS unit-only bulk price persistence and invalid bulk settings blocked');
  await page.evaluate(() => { mount(); toggleCoffeeSizes(); });
  assert.equal(await page.locator('#pf-coffee-section').isVisible(), false);
  await page.evaluate(() => {
    document.querySelector('#pf-brand option').textContent = "Jack's Coffee";
    document.querySelector('#pf-category option').textContent = '☕ Кофе';
    toggleCoffeeSizes();
  });
  await page.check('#pf-coffee-enable');
  assert.equal(await page.locator('#pf-legacy-pricing').isVisible(), false);
  const beforeSizes = await page.evaluate(() => saved.length);
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), beforeSizes);
  await page.fill('#pf-size_1kg-price', '100000');
  await page.fill('#pf-size_1kg-stock', '4');
  await page.fill('#pf-size_250g-price', '34000');
  await page.fill('#pf-size_250g-stock', '0');
  await page.evaluate(() => saveProduct(null));
  assert.deepEqual(await page.evaluate(() => saved.at(-1).coffee_sizes), {
    size_1kg: { price: 100000, stock: 4, original_price: null },
    size_250g: { price: 34000, stock: 0, original_price: null },
  });
  assert.equal(await page.evaluate(() => saved.at(-1).unit_price), 0);
  assert.equal(await page.evaluate(() => saved.at(-1).box_price), 0);
  await page.fill('#pf-size_250g-stock', '1.5');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), beforeSizes + 1);
  await page.fill('#pf-size_250g-stock', '5');
  await page.selectOption('#pf-tag', 'хямдралтай');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.length), beforeSizes + 1);
  await page.fill('#pf-size_1kg-original', '120000');
  await page.fill('#pf-size_250g-original', '38000');
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.at(-1).coffee_sizes.size_250g.original_price), 38000);
  assert.deepEqual(errors, []);
  console.log('PASS Jack\'s Coffee gating, two prices/stocks, zero stock, invalid stock and discounts');
  const conditions = await page.evaluate(async () => {
    const coffee_sizes = saved.at(-1).coffee_sizes;
    mount({ id: 10, coffee_sizes });
    document.querySelector('#pf-brand option').textContent = "Jack's Coffee";
    document.querySelector('#pf-category option').textContent = 'Кофе';
    const filters = [];
    const query = {
      eq: (key, value) => { filters.push([key, value]); return query; },
      select: async () => ({ data: [], error: null }),
    };
    sb.from = () => ({ update: () => query });
    await saveProduct(10);
    return { filters, snapshot: JSON.stringify(coffee_sizes), stillOpen: !!document.getElementById('pf-name') };
  });
  assert.deepEqual(conditions.filters, [['id', 10], ['coffee_sizes', conditions.snapshot]]);
  assert.equal(conditions.stillOpen, true);
  console.log('PASS admin stock save includes snapshot precondition');
  console.log('PASS discount visibility, percentage, unit/box validation, optional/future dates and save blocking');
} finally { await browser.close(); }

import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run the actual product form and save handler with an isolated database stub.
const html = await readFile('public/admin-panel.html', 'utf8');
const formCode = html.slice(html.indexOf('function productFormHtml('), html.indexOf('function confirmDeleteProduct('));
const dateCode = html.slice(html.indexOf('function toLocalDatetimeInput('), html.indexOf('async function checkAuth('));
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
  assert.match(await page.evaluate(() => saved[1].discount_ends_at), /^2099-/);
  assert.deepEqual(errors, []);
  console.log('PASS discount visibility, percentage, unit/box validation, optional/future dates and save blocking');
} finally { await browser.close(); }

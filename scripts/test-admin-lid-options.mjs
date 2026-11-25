import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const html = await readFile('public/admin-panel.html', 'utf8');
const formCode = html.slice(html.indexOf('function productFormHtml('), html.indexOf('function confirmDeleteProduct('));
const dateCode = html.slice(html.indexOf('function toLocalDatetimeInput('), html.indexOf('async function checkAuth('));
const escapeCode = html.slice(html.indexOf('function escapeHtml('), html.indexOf('function formatMnDate('));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setContent('<div id="form"></div><div id="modalFoot"><button class="btn-primary">Save</button></div>');
  await page.addScriptTag({ content: `
    if (typeof crypto.randomUUID !== 'function') { let _uid = 0; crypto.randomUUID = () => 'test-uuid-' + (_uid++); }
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
    function mount(product = {}) { document.getElementById('form').innerHTML = productFormHtml({ name: 'Test', unit_price: 500, ...product }); }
    mount();
  ` });

  assert.equal(await page.locator('#pf-lid-section').isVisible(), false);
  await page.fill('#pf-subcategory', 'Халуун ундааны аяга');
  await page.evaluate(() => toggleLidOptions());
  assert.equal(await page.locator('#pf-lid-section').isVisible(), true);
  assert.equal(await page.locator('#pf-lid-toggles input[type=checkbox]').count(), 2);
  assert.equal(await page.locator('#pf-lid-Хар').isChecked(), true);
  assert.equal(await page.locator('#pf-lid-Цагаан').isChecked(), true);
  await page.locator('#pf-lid-Цагаан').uncheck();
  await page.evaluate(() => saveProduct(null));
  assert.deepEqual(await page.evaluate(() => saved.at(-1).lid_options), { 'Хар': true, 'Цагаан': false });
  console.log('PASS hot cup: lid toggles render and persist on/off state');

  await page.fill('#pf-subcategory', 'Хүйтэн ундааны аяга');
  await page.evaluate(() => toggleLidOptions());
  assert.equal(await page.locator('#pf-lid-Хавтгай').count(), 1);
  assert.equal(await page.locator('#pf-lid-Бөмбгөр').count(), 1);
  await page.evaluate(() => saveProduct(null));
  assert.deepEqual(await page.evaluate(() => saved.at(-1).lid_options), { 'Хавтгай': true, 'Бөмбгөр': true });
  console.log('PASS cold cup: lid toggles swap in when subcategory changes');

  await page.fill('#pf-subcategory', 'Соруул');
  await page.evaluate(() => toggleLidOptions());
  assert.equal(await page.locator('#pf-lid-section').isVisible(), false);
  await page.evaluate(() => saveProduct(null));
  assert.equal(await page.evaluate(() => saved.at(-1).lid_options), null);
  console.log('PASS non-cup subcategory: lid section hidden, lid_options saved as null');

  await page.evaluate(() => mount({ subcategory: 'Халуун ундааны аяга', lid_options: { 'Хар': false, 'Цагаан': true } }));
  await page.evaluate(() => toggleLidOptions());
  assert.equal(await page.locator('#pf-lid-Хар').isChecked(), false);
  assert.equal(await page.locator('#pf-lid-Цагаан').isChecked(), true);
  console.log('PASS editing restores previously saved per-product toggle state');

  assert.deepEqual(errors, []);
} finally { await browser.close(); }

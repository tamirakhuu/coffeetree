import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const html = await readFile('public/admin-panel.html', 'utf8');
const code = html.slice(html.indexOf('const PRODUCTS_PER_PAGE'), html.indexOf('function categoryOptions'));
const escapeCode = html.slice(html.indexOf('function escapeHtml('), html.indexOf('// toLocaleDateString'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(`<input id="productSearch"><select id="productBrandFilter"><option value=""></option><option value="1">A</option></select><select id="productCategoryFilter"><option value=""></option><option value="1">Coffee</option><option value="2">Syrup</option></select><div id="productCategoryTabs"></div><p id="prodCount"></p><table><tbody id="productTable"></tbody></table><div id="productPagination"></div>`);
  await page.addScriptTag({ content: `
    const categories = [{ id: 1, name: 'Coffee' }, { id: 2, name: 'Syrup' }];
    const brands = [{ id: 2, name: 'B' }, { id: 1, name: 'A' }];
    const products = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: 'Product ' + i, category_id: i % 2 + 1, brand_id: i % 3 ? 1 : 2, unit_price: i + 10 }));
    const fmt = n => String(n || 0), unitWord = n => n || '';
    ${escapeCode}
    ${code}
    renderProducts();
  ` });
  assert.equal(await page.locator('#productTable tr:not(.product-group-row)').count(), 20);
  assert.equal(await page.locator('.product-group-row').first().innerText(), 'Coffee · A');
  await page.evaluate(() => goProductPage(2));
  assert.equal(await page.locator('#productTable tr:not(.product-group-row)').count(), 5);
  assert.equal(await page.locator('#productTable tr').first().getAttribute('class'), 'product-group-row');
  await page.getByRole('button', { name: 'Syrup (12)', exact: true }).click();
  assert.equal(await page.evaluate(() => productPage), 1);
  assert.equal(await page.locator('#productTable tr:not(.product-group-row)').count(), 12);
  await page.selectOption('#productBrandFilter', '1');
  await page.evaluate(() => renderProducts());
  assert.equal(await page.locator('.product-group-row').count(), 1);
  assert.equal(await page.locator('.product-group-row').innerText(), 'Syrup · A');
  await page.fill('#productSearch', 'no-match');
  await page.evaluate(() => renderProducts());
  assert.equal(await page.locator('td.empty').count(), 1);
  await page.evaluate(() => resetProductFilters());
  assert.equal(await page.inputValue('#productSearch'), '');
  assert.equal(await page.locator('#productTable tr:not(.product-group-row)').count(), 20);
  console.log('PASS admin category tabs, grouped pagination, combined filters and reset');
} finally { await browser.close(); }

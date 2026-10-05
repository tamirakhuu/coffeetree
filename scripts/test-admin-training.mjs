import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const html = await readFile('public/admin-panel.html', 'utf8');
const code = html.slice(html.indexOf('function trainingToday('), html.indexOf('function renderTraining()'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div id="form"></div><div id="modalFoot"></div><div id="trainingScheduleError"></div><table><tbody id="trainingScheduleTable"></tbody></table>');
  await page.addScriptTag({ content: `
    let trainingSessions=[], trainingScheduleError='', writes=[], messages=[], filters=[];
    const toast = message => messages.push(message);
    const closeModal = () => {};
    const openModal = (title, body, footer) => { document.getElementById('form').innerHTML=body; document.getElementById('modalFoot').innerHTML=footer; };
    const sb = { from: () => {
      const query = {
        insert: row => { writes.push(row); return query; },
        update: row => { writes.push(row); return query; },
        eq: (key,value) => { filters.push([key,value]); return query; },
        select: () => Object.assign(Promise.resolve({data:[writes.at(-1)],error:null}), { order: async () => ({data:trainingSessions,error:null}) }),
      }; return query;
    }};
    ${code}
    openTrainingSession();
  ` });
  await page.fill('#ts-month', '2099-06');
  await page.locator('#ts-month').dispatchEvent('change');
  const dates = await page.locator('#ts-date option').evaluateAll(options => options.map(o => o.value));
  assert.ok(dates.length >= 8);
  assert.ok(dates.every(date => [0, 6].includes(new Date(date + 'T00:00:00').getDay())));
  assert.ok(dates.some(date => new Date(date + 'T00:00:00').getDay() === 0));
  for (const invalid of ['', '-1', '1.5']) {
    await page.fill('#ts-seats', invalid);
    await page.evaluate(() => saveTrainingSession());
    assert.equal(await page.evaluate(() => writes.length), 0);
  }
  await page.fill('#ts-seats', '0');
  await page.evaluate(() => saveTrainingSession());
  assert.equal(await page.evaluate(() => writes.at(-1).remaining_seats), 0);
  await page.evaluate(() => {
    trainingSessions=[{training_date:'2099-06-07',remaining_seats:7,is_active:true,updated_at:'2099-01-01T00:00:00Z'}];
    openTrainingSession('2099-06-07');
  });
  assert.equal(await page.locator('#ts-date').isDisabled(), true);
  await page.fill('#ts-seats', '12');
  await page.uncheck('#ts-active');
  await page.evaluate(() => saveTrainingSession());
  assert.equal(await page.evaluate(() => writes.at(-1).remaining_seats), 12);
  assert.equal(await page.evaluate(() => writes.at(-1).is_active), false);
  assert.deepEqual(await page.evaluate(() => filters), [['training_date','2099-06-07'],['updated_at','2099-01-01T00:00:00Z']]);
  console.log('PASS admin weekend-only options, manual free seats, invalid quantities, closure and concurrent-edit precondition');
} finally { await browser.close(); }

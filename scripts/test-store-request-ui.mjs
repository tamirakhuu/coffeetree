import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
const server=createServer(async(req,res)=>{try{const name=req.url.split('?')[0];if(!/^\/[a-z-]+\.(html|css|js)$/.test(name))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await readFile('public'+name));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:`
 const sample=[{id:1,name:'Available product',brand_id:7,images:['/favicon.png'],unit_price:100,unit_label:'Unit',warehouse_unit_stock:5},{id:2,name:'Sold out',unit_price:100,unit_label:'Unit',warehouse_unit_stock:0},{id:3,name:'Box product',unit_price:100,warehouse_unit_stock:50,box_price:500,box_label:'Box',box_per_box:5,warehouse_box_stock:10}];
 window.testData={requests:[],quick:[]};window.calls=[];
 window.supabase={createClient:()=>({
 auth:{getUser:async()=>({data:{user:{id:'employee'}}}),getSession:async()=>({data:{session:{user:{id:'employee'}}}})},
 rpc:async(name,args)=>{window.calls.push({name,args});if(name==='request_store')return {data:'Store A'};if(name==='is_request_manager')return {data:true};if(name==='submit_store_request'){window.testData.requests=[{id:args.p_id,requested_by:'employee',store_name:'Store A',status:'pending',created_at:new Date().toISOString(),note:args.p_note,store_request_items:args.p_items.map(i=>({...i,product_name:'Available product',option_label:'Unit'}))}];return {data:args.p_id};}if(name==='prepare_store_request'){window.testData.requests[0].status='sent';window.testData.requests[0].store_request_items=window.testData.requests[0].store_request_items.map(i=>({...i,approved:true}));return {data:null}}if(name==='change_store_request'){window.testData.requests[0].status=args.p_status;return {data:null}}},
 from:table=>{
 if(table==='store_quick_products'){
   return {select:()=>Promise.resolve({data:[...window.testData.quick],error:null}),
     insert:row=>{window.testData.quick.push(row);return Promise.resolve({error:null});},
     delete(){const filters=[];const chain={eq(k,v){filters.push([k,v]);return chain;},then(res){window.testData.quick=window.testData.quick.filter(r=>!filters.every(([k,v])=>r[k]===v));res({error:null});}};return chain;}};
 }
 const result={data:table==='products'?sample:table==='brands'?[{id:7,name:'Test Brand'}]:window.testData.requests};return {select(){return this},order(){return this},limit(){return this},then(resolve){resolve(result)}};
 },
 channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
 })};` }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/employee.html`);
 await page.locator('[data-products] .sr-brand-summary').first().waitFor();
 await page.locator('[data-products] .sr-brand-summary').evaluateAll(els=>els.forEach(el=>el.click()));
 await page.locator('[data-add="1"]').waitFor();
 assert.equal(await page.locator('[data-add="2"]').isDisabled(),true);
 assert.equal(await page.locator('[data-add="3"][data-option="unit"]').count(),1);
 assert.equal(await page.locator('[data-add="3"][data-option="box"]').count(),1);
 await page.locator('[data-brand]').selectOption('7');
 assert.equal(await page.locator('[data-products] .sr-product').count(),1);
 await page.locator('[data-brand]').selectOption('');
 await page.locator('[data-soldout]').check();
 assert.equal(await page.locator('[data-add="2"]').count(),1);
 assert.equal(await page.locator('[data-add="1"]').count(),0);
 await page.locator('[data-soldout]').uncheck();
 await page.locator('[data-search]').fill('Box product');
 assert.equal(await page.locator('[data-products] .sr-product').count(),1);
 await page.locator('[data-search]').fill('');
 await page.locator('[data-add="1"]').click();
 await page.locator('.sr-bar-info').click();
 await page.locator('[data-qty]').fill('6');await page.locator('[data-note]').click();
 await page.locator('[data-submit]').click();
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='submit_store_request').length),0);
 await page.locator('[data-dec="0"]').click();await page.locator('[data-dec="0"]').click();
 assert.equal(await page.locator('[data-qty]').inputValue(),'4');
 await page.locator('[data-inc="0"]').click();
 assert.equal(await page.locator('[data-qty]').inputValue(),'5');
 await page.locator('[data-qty]').fill('2');await page.locator('[data-note]').click();
 await page.locator('[data-submit]').click();
 assert.equal(await page.locator('[data-cart-sheet]').isHidden(),true);
 await page.locator('[data-profile]').click();
 await page.waitForFunction(()=>document.querySelector('[data-requests] article'));
 assert.equal(await page.locator('[data-action="cancelled"]').count(),1);
 assert.equal(await page.locator('[data-requests] .sr-request-info .muted').textContent(),'Test Brand');
 assert.equal(await page.locator('[data-requests] .sr-request-image img').getAttribute('src'),'/favicon.png');
 await page.locator('[data-history-toggle]').click();
 assert.equal(await page.locator('[data-history-panel]').isHidden(),true);
 assert.equal(await page.locator('[data-quick-row] .sr-quick-item').count(),0);
 await page.locator('[data-quick-edit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-quick-edit-list] .sr-quick-edit-row'));
 assert.equal(await page.locator('[data-quick-edit-list] .sr-quick-edit-row').count(),4);
 await page.locator('[data-quick-edit-search]').fill('Box product');
 assert.equal(await page.locator('[data-quick-edit-list] .sr-quick-edit-row').count(),2);
 await page.locator('[data-quick-edit-search]').fill('');
 await page.locator('[data-quick-toggle="1"][data-quick-option="unit"]').click();
 await page.waitForFunction(()=>window.testData.quick.length===1);
 await page.locator('[data-quick-edit-close]').click();
 await page.waitForFunction(()=>document.querySelector('[data-quick-row] .sr-quick-item'));
 assert.equal(await page.locator('[data-quick-row] .sr-quick-item').count(),1);
 assert.match(await page.locator('[data-quick-row]').innerText(),/Available product/);
 await page.locator('[data-quick-row] .sr-quick-item').click();
 await page.locator('.sr-bar-info').click();
 assert.equal(await page.locator('[data-draft] .sr-card').count(),1);
 assert.match(await page.locator('[data-draft]').innerText(),/Available product/);
 await page.locator('.sr-cart-sheet .sr-sheet-close').click();
 await page.locator('[data-quick-edit]').click();
 await page.locator('[data-quick-toggle="1"][data-quick-option="unit"]').click();
 await page.waitForFunction(()=>window.testData.quick.length===0);
 await page.locator('[data-quick-edit-close]').click();
 assert.equal(await page.locator('[data-quick-row] .sr-quick-item').count(),0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(tmpdir(),'store-request-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:resolve(tmpdir(),'store-request-desktop.png'),fullPage:true});
 await page.evaluate(async()=>{const {mountRequests}=await import('/store-requests.js');const root=document.createElement('div');root.id='warehouse-test';document.body.append(root);await mountRequests(root,window.storeClient,'warehouse');});
 page.on('dialog',d=>d.accept());
 await page.locator('#warehouse-test [data-action="preparing"]').click();
 await page.locator('#warehouse-test [data-print]').waitFor();
 assert.equal(await page.locator('#warehouse-test [data-action="sent"]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS mobile employee page, sold-out guard, quantity validation, submit/history and warehouse preparation');
}finally{await browser.close();server.close();}


import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=createServer(async(req,res)=>{try{const name=req.url.split('?')[0];if(!/^\/[a-z-]+\.(html|css|js)$/.test(name))throw Error();res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await readFile('public'+name));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'application/javascript',body:`
 const sample=[{id:1,name:'Available product',unit_price:100,unit_label:'Unit',warehouse_unit_stock:5},{id:2,name:'Sold out',unit_price:100,unit_label:'Unit',warehouse_unit_stock:0}];
 let requests=[];window.calls=[];
 window.supabase={createClient:()=>({
 auth:{getUser:async()=>({data:{user:{id:'employee'}}}),getSession:async()=>({data:{session:{user:{id:'employee'}}}})},
 rpc:async(name,args)=>{window.calls.push({name,args});if(name==='request_store')return {data:'Store A'};if(name==='is_request_manager')return {data:true};if(name==='submit_store_request'){requests=[{id:args.p_id,requested_by:'employee',store_name:'Store A',status:'pending',created_at:new Date().toISOString(),note:args.p_note,store_request_items:args.p_items.map(i=>({...i,product_name:'Available product',option_label:'Unit'}))}];sample[0].warehouse_unit_stock-=args.p_items[0].qty;return {data:args.p_id};}if(name==='change_store_request'){requests[0].status=args.p_status;return {data:null}}},
 from:table=>{const result={data:table==='products'?sample:requests};return {select(){return this},order(){return this},limit(){return this},then(resolve){resolve(result)}}},
 channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
 })};` }));
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/employee.html`);
 await page.locator('[data-add="1"]').waitFor();
 assert.equal(await page.locator('[data-add="2"]').isDisabled(),true);
 await page.locator('[data-add="1"]').click();
 await page.locator('[data-qty]').fill('6');await page.locator('[data-note]').click();
 await page.locator('[data-submit]').click();
 assert.equal(await page.evaluate(()=>calls.filter(c=>c.name==='submit_store_request').length),0);
 await page.locator('[data-qty]').fill('2');await page.locator('[data-note]').click();
 await page.locator('[data-submit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-requests] article'));
 assert.equal(await page.locator('[data-action="cancelled"]').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(async()=>{const {mountRequests}=await import('/store-requests.js');const root=document.createElement('div');root.id='warehouse-test';document.body.append(root);await mountRequests(root,window.storeClient,'warehouse');});
 page.on('dialog',d=>d.accept());
 await page.locator('#warehouse-test [data-action="preparing"]').click();
 await page.locator('#warehouse-test [data-action="sent"]').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS mobile employee page, sold-out guard, quantity validation, submit/history and warehouse preparation');
}finally{await browser.close();server.close();}

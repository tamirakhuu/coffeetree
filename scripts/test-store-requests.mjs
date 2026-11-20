import assert from 'node:assert/strict';
export async function testStoreRequests(db){
  await db.exec('begin');
  try {
    await db.exec(`create or replace function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create or replace function auth.email() returns text language sql as $$ select current_setting('test.email',true) $$;
      create or replace function public.is_warehouse_staff() returns boolean language sql as $$ select auth.email()='warehouse@test.local' $$;
      insert into auth.users(id) values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
      insert into store_staff(email,store_name) values ('sar@test.local','Саруул зах'),('yar@test.local','Яармаг');
      insert into products(id,name,unit_price,warehouse_unit_stock,box_price,box_per_box,unified_stock,warehouse_box_stock)
        values (99001,'Request test',100,10,600,6,true,1),(99002,'Sold out',100,0,0,null,false,0);
    `);
    const as=async(email,id)=>{await db.exec('reset role');await db.query("select set_config('test.email',$1,true),set_config('test.uid',$2,true)",[email,`10000000-0000-0000-0000-00000000000${id}`]);await db.exec('set local role authenticated');};
    const fail=async fn=>{await db.exec('savepoint failure');await assert.rejects(fn);await db.exec('rollback to failure');};
    const id='20000000-0000-0000-0000-000000000001';
    const submit=(key,items)=>db.query('select submit_store_request($1,$2::jsonb,$3)',[key,JSON.stringify(items),'test']);
    const items=[{product_id:99001,option_type:'unit',qty:4}];
    const stock=async()=>{await db.exec('reset role');return (await db.query('select warehouse_unit_stock from products where id=99001')).rows[0].warehouse_unit_stock;};
    await as('sar@test.local',1);
    await submit(id,items);await submit(id,items);
    assert.equal(await stock(),6,'Retry must not reserve twice');
    await as('sar@test.local',1);
    await fail(()=>submit('20000000-0000-0000-0000-000000000002',[{...items[0],qty:7}]));
    await fail(()=>submit('20000000-0000-0000-0000-000000000002',[{...items[0],qty:2},{product_id:99002,option_type:'unit',qty:1}]));
    assert.equal(await stock(),6,'Multi-item failure rolls back');
    await as('sar@test.local',1);
    await fail(()=>db.query("update store_requests set status='sent' where id=$1",[id]));
    await fail(()=>db.query("select change_store_request($1,'sent')",[id]));
    await as('yar@test.local',2);
    assert.equal((await db.query('select * from store_requests')).rows.length,0);
    assert.equal((await db.query('select * from store_request_items')).rows.length,0);
    await fail(()=>db.query("select change_store_request($1,'cancelled')",[id]));
    await as('warehouse@test.local',3);
    assert.equal((await db.query('select * from store_requests')).rows.length,1);
    await db.query("select change_store_request($1,'rejected')",[id]);
    await db.query("select change_store_request($1,'rejected')",[id]);
    assert.equal(await stock(),10,'Reject restores once');
    await as('sar@test.local',1);
    const second='20000000-0000-0000-0000-000000000003';
    await submit(second,[{product_id:99001,option_type:'box',qty:1}]);
    assert.equal(await stock(),4,'Shared box inventory reserves units');
    await as('warehouse@test.local',3);
    await fail(()=>db.query("select change_store_request($1,'received')",[second]));
    await db.query("select change_store_request($1,'preparing')",[second]);
    await db.query("select change_store_request($1,'sent')",[second]);
    await as('sar@test.local',1);
    await db.query("select change_store_request($1,'received')",[second]);
    assert.equal(await stock(),4,'Dispatch and receipt must not deduct again');
    await as('outsider@test.local',2);
    await fail(()=>submit('20000000-0000-0000-0000-000000000004',items));
    await db.exec('reset role; set local role anon');
    await fail(()=>db.query('select * from store_requests'));
    await fail(()=>submit(id,items));
    console.log('PASS store requests: idempotency, sold-out, atomic rollback, shared stock, role isolation, restore-once and dispatch');
  } finally {await db.exec('rollback');}
}

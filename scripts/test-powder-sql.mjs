import assert from 'node:assert/strict';

export async function testPowderSQL(db) {
  await db.exec('begin');
  const sizes = {
    powder_l: { price: 11500, bulk_price: 11000, bulk_qty: 5, stock: 5 },
    powder_m: { price: 9500, bulk_price: 9000, bulk_qty: 5, stock: 5 },
    powder_s: { price: 7500, bulk_price: 7000, bulk_qty: 5, stock: 5 },
  };
  await db.query('insert into products(id,name,powder_sizes) values (98001,$1,$2::jsonb)', ['Powder container', JSON.stringify(sizes)]);
  const order = async (size, qty) => (await db.query(
    "select submit_order('Test','99112233','','personal','','pickup',$1::jsonb) as result",
    [JSON.stringify([{ product_id: 98001, option_type: size, qty }])],
  )).rows[0].result;
  for (const [size, option] of Object.entries(sizes)) {
    for (const qty of [4, 5]) {
      await db.exec('savepoint quantity_test');
      await order(size, qty);
      const item = (await db.query('select option_label,unit_price,line_total from order_items where product_id=98001')).rows[0];
      assert.equal(item.option_label, size.slice(-1).toUpperCase());
      assert.equal(Number(item.unit_price), qty === 5 ? option.bulk_price : option.price);
      assert.equal(Number(item.line_total), (qty === 5 ? option.bulk_price : option.price) * qty);
      const stocks = (await db.query('select powder_sizes from products where id=98001')).rows[0].powder_sizes;
      for (const key of Object.keys(sizes)) assert.equal(stocks[key].stock, key === size ? 5 - qty : 5);
      await db.exec(`select restore_stock(98001,'${size}',${qty})`);
      assert.deepEqual((await db.query('select powder_sizes from products where id=98001')).rows[0].powder_sizes, sizes);
      await db.exec('rollback to quantity_test');
    }
  }
  for (const [size, qty] of [['powder_l', 6], ['unit', 1], ['box', 1]]) {
    await db.exec('savepoint invalid_test');
    await assert.rejects(() => order(size, qty));
    await db.exec('rollback to invalid_test');
  }
  await db.exec('savepoint invalid_price');
  await assert.rejects(() => db.exec("update products set powder_sizes=jsonb_set(powder_sizes,'{powder_l,price}','0') where id=98001"));
  await db.exec('rollback to invalid_price');
  await db.query('insert into products(id,name,powder_sizes) values (98002,$1,$2::jsonb)', ['Custom sizes', JSON.stringify({
    variant_small: {label:'300 ml',price:8000,stock:7,bulk_qty:null,bulk_price:null},
    variant_large: {label:'750 ml',price:12000,stock:8,bulk_qty:5,bulk_price:10000},
  })]);
  for (const [key,qty,total,label] of [['variant_small',5,40000,'300 ml'],['variant_large',5,50000,'750 ml']]) {
    await db.query("select submit_order('Test','99112233','','personal','','pickup',$1::jsonb)",
      [JSON.stringify([{product_id:98002,option_type:key,qty}])]);
    const item = (await db.query('select option_label,line_total from order_items where product_id=98002 and option_type=$1',[key])).rows[0];
    assert.equal(item.option_label,label);
    assert.equal(Number(item.line_total),total);
    await db.query('select restore_stock(98002,$1,$2)',[key,qty]);
  }
  const restored = (await db.query('select powder_sizes from products where id=98002')).rows[0].powder_sizes;
  assert.equal(restored.variant_small.stock,7);
  assert.equal(restored.variant_large.stock,8);
  console.log('PASS custom size names, optional bulk prices, order labels and stock restoration');
  await db.exec('rollback');
  console.log('PASS powder L/M/S pricing at 4/5 units, separate stock, restore, overselling and invalid prices');
}

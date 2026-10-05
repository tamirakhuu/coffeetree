-- Run after run-all-updates.sql on a TEST database as its owner.
-- All fixture rows/orders are rolled back. No payment API calls are made.
begin;
do $$
declare
  b bigint; c bigint; p bigint; other_p bigint; result jsonb; sizes jsonb;
  rejected boolean; saved_stock int; affected int;
begin
  insert into public.brands(name) values ('Jack''s Coffee') on conflict(name) do nothing;
  select id into b from public.brands where name = 'Jack''s Coffee';
  insert into public.categories(name) values ('Кофе') returning id into c;
  sizes := '{"size_1kg":{"price":100000,"stock":2},"size_250g":{"price":34000,"stock":5}}';
  insert into public.products(name, brand_id, category_id, coffee_sizes, warehouse_unit_stock)
    values ('Coffee size test', b, c, sizes, 99) returning id into p;
  insert into public.products(name, category_id, unit_price, warehouse_unit_stock)
    values ('Legacy test', c, 15000, 4) returning id into other_p;

  result := public.submit_order('Test', '00000000', null, 'individual', null, 'pickup',
    jsonb_build_array(jsonb_build_object('product_id',p,'option_type','size_1kg','qty',1),
      jsonb_build_object('product_id',p,'option_type','size_250g','qty',2)));
  assert (result->>'subtotal')::numeric = 168000, 'Server prices must match selected sizes';
  select coffee_sizes into sizes from public.products where id = p;
  assert (sizes->'size_1kg'->>'stock')::int = 1, '1kg stock';
  assert (sizes->'size_250g'->>'stock')::int = 3, '250g stock';
  assert (select warehouse_unit_stock = 99 from public.products where id = p), 'Legacy stock must not change';
  assert (select count(*) = 2 from public.order_items where order_number = result->>'orderNumber'
    and option_label in ('1кг','250гр')), 'Saved order labels';
  update public.products set coffee_sizes = '{"size_1kg":{"price":100000,"stock":2},"size_250g":{"price":34000,"stock":5}}'
    where id = p and coffee_sizes = '{"size_1kg":{"price":100000,"stock":2},"size_250g":{"price":34000,"stock":5}}';
  get diagnostics affected = row_count;
  assert affected = 0, 'Stale admin snapshot must not overwrite stock after a sale';

  rejected := false;
  begin
    perform public.submit_order('Test','00000000',null,'individual',null,'pickup',
      jsonb_build_array(jsonb_build_object('product_id',p,'option_type','size_250g','qty',1),
        jsonb_build_object('product_id',p,'option_type','size_1kg','qty',2)));
  exception when others then rejected := true; end;
  assert rejected, 'Overselling must fail';
  assert (select coffee_sizes = sizes from public.products where id = p), 'Failed order must roll back all sizes';

  rejected := false;
  begin
    perform public.submit_order('Test','00000000',null,'individual',null,'pickup',
      jsonb_build_array(jsonb_build_object('product_id',p,'option_type','unit','qty',1)));
  exception when others then rejected := true; end;
  assert rejected, 'Old cart option must fail after conversion';

  rejected := false;
  begin
    update public.products set coffee_sizes = sizes where id = other_p;
  exception when others then rejected := true; end;
  assert rejected, 'Other brands cannot use coffee sizes';

  perform public.restore_stock(p,'size_250g',2);
  assert (select (coffee_sizes->'size_250g'->>'stock')::int = 5 from public.products where id = p), 'Restore selected stock';
  assert (select (coffee_sizes->'size_1kg'->>'stock')::int = 1 from public.products where id = p), 'Restore must not touch other size';

  result := public.submit_order('Test','00000000',null,'individual',null,'pickup',
    jsonb_build_array(jsonb_build_object('product_id',other_p,'option_type','unit','qty',1)));
  assert (result->>'subtotal')::numeric = 15000, 'Legacy pricing';
  select warehouse_unit_stock into saved_stock from public.products where id = other_p;
  assert saved_stock = 3, 'Legacy stock';

  update public.products set tag = 'хямдралтай', discount_ends_at = now() - interval '1 day',
    coffee_sizes = '{"size_1kg":{"price":100000,"stock":2,"original_price":120000},"size_250g":{"price":34000,"stock":5,"original_price":38000}}'
    where id = p;
  result := public.submit_order('Test','00000000',null,'individual',null,'pickup',
    jsonb_build_array(jsonb_build_object('product_id',p,'option_type','size_250g','qty',1)));
  assert (result->>'subtotal')::numeric = 38000, 'Expired size discount uses original server price';
end $$;
rollback;

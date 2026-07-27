
-- security definer тул энгийн хэрэглэгч (anon/authenticated) шууд
-- "products" хүснэгтийг UPDATE хийх эрхгүй ч гэсэн зөвхөн энэ нэг
-- functiоор дамжуулж нөөцөө аюулгүйгээр хасуулж чадна (0-ээс доош орохгүй).
-- =====================================================================
create or replace function decrement_stock(p_product_id bigint, p_option_type text, p_qty int)
returns void as $$
begin
  if p_option_type = 'box' then
    update products set box_stock = greatest(box_stock - p_qty, 0) where id = p_product_id;
  else
    update products set unit_stock = greatest(unit_stock - p_qty, 0) where id = p_product_id;
  end if;
end;
$$ language plpgsql security definer;

grant execute on function decrement_stock(bigint, text, int) to authenticated, anon;

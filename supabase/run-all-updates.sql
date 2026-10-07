-- Combined with the supplied Supabase run-all-updates query.
-- Reuse that saved query; supabase-schema.sql remains separate for new databases only.
-- Preserves existing rows. Historical tags are renamed and missing defaults are added.
begin;
set local search_path = public;

---------------
update products set tag = 'эрэлттэй' where tag = 'алдартай';

-- ---------------------------------------------------------------------
-- 2) Брэндүүд нэмэх
-- ---------------------------------------------------------------------
insert into brands (name) values
  ('Pomona'), ('Taco'), ('Daeho'), ('Sweet Page'), ('Nature Tea')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 3) И-баримт (хувь хүн/байгууллага) талбарууд
-- ---------------------------------------------------------------------
alter table orders add column if not exists receipt_type text default 'individual';
alter table orders add column if not exists register_number text;

-- ---------------------------------------------------------------------
-- 4) admins хүснэгт, is_admin() функц, захиалгын эзэмшигч (user_id),
--    RLS policy-г "хэн ч нэвтэрсэн бол болно" байснаас зөвхөн admin
--    болгож чангатгах
-- ---------------------------------------------------------------------
create table if not exists admins (
  email text primary key
);
alter table admins enable row level security;
insert into admins (email) values ('cuppabrandmanager@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_admin() returns boolean as $$
  select exists(select 1 from public.admins where lower(email) = lower(auth.email()));
$$ language sql security definer stable set search_path = public;
grant execute on function is_admin() to authenticated, anon;

alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;

drop policy if exists "admin insert categories" on categories;
drop policy if exists "admin update categories" on categories;
drop policy if exists "admin delete categories" on categories;
create policy "admin insert categories" on categories for insert with check (is_admin());
create policy "admin update categories" on categories for update using (is_admin());
create policy "admin delete categories" on categories for delete using (is_admin());

drop policy if exists "admin insert subcategories" on subcategories;
drop policy if exists "admin delete subcategories" on subcategories;
create policy "admin insert subcategories" on subcategories for insert with check (is_admin());
create policy "admin delete subcategories" on subcategories for delete using (is_admin());

drop policy if exists "admin insert brands" on brands;
drop policy if exists "admin delete brands" on brands;
create policy "admin insert brands" on brands for insert with check (is_admin());
create policy "admin delete brands" on brands for delete using (is_admin());

drop policy if exists "admin insert products" on products;
drop policy if exists "admin update products" on products;
drop policy if exists "admin delete products" on products;
create policy "admin insert products" on products for insert with check (is_admin());
create policy "admin update products" on products for update using (is_admin());
create policy "admin delete products" on products for delete using (is_admin());

drop policy if exists "admin read orders" on orders;
drop policy if exists "admin update orders" on orders;
drop policy if exists "admin delete orders" on orders;
drop policy if exists "user read own orders" on orders;
create policy "admin read orders" on orders for select using (is_admin());
create policy "user read own orders" on orders for select using (user_id = auth.uid());
create policy "admin update orders" on orders for update using (is_admin());
create policy "admin delete orders" on orders for delete using (is_admin());

drop policy if exists "admin read order_items" on order_items;
drop policy if exists "admin delete order_items" on order_items;
drop policy if exists "user read own order_items" on order_items;
create policy "admin read order_items" on order_items for select using (is_admin());
create policy "user read own order_items" on order_items for select using (
  exists (select 1 from orders o where o.order_number = order_items.order_number and o.user_id = auth.uid())
);
create policy "admin delete order_items" on order_items for delete using (is_admin());

-- ---------------------------------------------------------------------
-- 6) Хямдрахаас өмнөх үнэ хадгалах багана
-- ---------------------------------------------------------------------
alter table products add column if not exists unit_original_price numeric;
alter table products add column if not exists box_original_price numeric;

-- ---------------------------------------------------------------------
-- 7) Хүргэлтийн хэлбэр, хураамж
-- ---------------------------------------------------------------------
alter table orders add column if not exists delivery_method text default 'pickup'; -- pickup | delivery
alter table orders add column if not exists delivery_fee numeric default 0;

-- ---------------------------------------------------------------------
-- 8) Storage bucket-ийн зураг upload/устгах эрхийг зөвхөн админд олгох
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

-- ---------------------------------------------------------------------
-- 9) Админ гараар оруулдаг "хэдэн хайрцаг" талбар (очиж авах, хүргэлт
--    хоёуланд нь адилхан)
-- ---------------------------------------------------------------------
alter table orders add column if not exists box_count integer default 0;

-- ---------------------------------------------------------------------
-- 10) "эрэлттэй" шошготой барааг "бестселлэр" болгох
-- ---------------------------------------------------------------------
update products set tag = 'бестселлэр' where tag = 'эрэлттэй';

-- ---------------------------------------------------------------------
-- 11) Шинэ захиалга ирэхэд admin panel-д refresh хийхгүйгээр мэдэгдэл
--     өгөх боломжтой болгох (Supabase Realtime-г orders хүснэгтэд асаах)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 12) Агуулахын нөөц: гараар 2 газар (агуулах -1, дэлгүүр +1) бичихийн
--     оронд admin panel дээрх "Татах" товчоор нэг л удаа оруулдаг болгох
-- ---------------------------------------------------------------------
alter table products add column if not exists warehouse_unit_stock int default 0;
alter table products add column if not exists warehouse_box_stock int default 0;

-- Бөөний үнэ бодогдож эхлэх ширхэгийн тоо (жишээ нь: FORTE кофе 3ш, сироп 6ш,
-- зарим повдер 12ш, нэг удаагийн аяга 1000ш — бараа бүрээр өөр өөр байдаг тул
-- ангиллаар биш барааны хувиар админ гараар тохируулна)
alter table products add column if not exists bulk_qty int;

-- ---------------------------------------------------------------------
-- 14) "Нэгдсэн нөөц" — хайрцгаар ирсэн барааг задалж ширхэгээр зарж байгаа
--     барааны хайрцгийн нөөцийг ширхэгийн нөөцөөс автоматаар тооцно
--     (жишээ нь: сироп, повдер зэрэг агуулахаас дандаа хайрцгаар ирж,
--     лангуунд ширхэгээр өрөгддөг бараа)
-- ---------------------------------------------------------------------
alter table products add column if not exists unified_stock boolean default false;

-- ---------------------------------------------------------------------
-- 15) Анхны/хоосон ангиллын дүрсийг шинэ түлхүүрүүд рүү шилжүүлэх.
--     Админы сонгосон дүрс болон custom SVG URL-ийг өөрчлөхгүй.
-- ---------------------------------------------------------------------
update categories set icon = 'CoffeeBean' where name = 'Кофе' and (icon is null or icon in ('Coffee', ''));
update categories set icon = 'Syrup' where name = 'Сироп' and (icon is null or icon in ('Coffee', ''));
update categories set icon = 'Sauce' where name = 'Соус' and (icon is null or icon in ('Coffee', ''));
update categories set icon = 'Powder' where name = 'Нунтаг' and (icon is null or icon in ('Coffee', ''));
update categories set icon = 'Smoothie' where name = 'Смүүти' and (icon is null or icon in ('Coffee', ''));
update categories set icon = 'TeaLeaf' where name = 'Цай' and (icon is null or icon in ('Coffee', ''));

-- ---------------------------------------------------------------------
-- 13) Агуулах ⇄ дэлгүүрийн шилжилтийн түүх (Тайлан хуудсанд харуулна)
-- ---------------------------------------------------------------------
create table if not exists stock_transfers (
  id bigint generated by default as identity primary key,
  product_id bigint references products(id) on delete set null,
  product_name text not null,
  option_type text not null, -- 'unit' | 'box'
  direction text not null, -- 'to_store' (агуулахаас татсан) | 'to_warehouse' (дэлгүүрээс буцаасан)
  qty int not null,
  admin_email text,
  created_at timestamptz default now()
);
alter table stock_transfers enable row level security;
drop policy if exists "admin read stock_transfers" on stock_transfers;
drop policy if exists "admin insert stock_transfers" on stock_transfers;
create policy "admin read stock_transfers" on stock_transfers for select using (is_admin());
create policy "admin insert stock_transfers" on stock_transfers for insert with check (is_admin());


do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table products;
  end if;
end $$;

update categories set icon = 'PaperCup' where name = 'Нэг удаа' and (icon is null or icon in ('Coffee', ''));

-- Add missing disposable-cup subcategories; keep existing rows and IDs.
insert into public.subcategories (category_id, name)
select c.id, s.name from public.categories c cross join unnest(array[
  'Хуйтний аяга', 'Давхар аяга', 'Дан аяга', 'Зайрмаг / Десерт аяга',
  'Соруул', 'Салфетка', 'Takeaway/Sleeve'
]) as s(name)
where c.name = 'Нэг удаа' and not exists (
  select 1 from public.subcategories existing where existing.category_id = c.id and existing.name = s.name
);

do $$
begin
  if exists (select 1 from pg_proc where oid = to_regprocedure('public.decrement_stock(bigint,text,integer)')
    and prorettype <> 'boolean'::regtype) then
    drop function public.decrement_stock(bigint, text, int);
  end if;
end $$;

alter table public.products add column if not exists size text;
alter table public.products add column if not exists bulk_unit_price numeric
  check (bulk_unit_price is null or bulk_unit_price > 0);
alter table public.products add column if not exists discount_ends_at timestamptz;
alter table public.products add column if not exists coffee_sizes jsonb;

-- Keep sizes on the existing product. Old stock is deliberately not reassigned.
create or replace function public.validate_coffee_sizes() returns trigger
language plpgsql set search_path = public as $$
declare k text; v jsonb;
begin
  if TG_OP = 'UPDATE' then
    if old.coffee_sizes is not null and new.coffee_sizes is null then
      raise exception 'Existing coffee sizes cannot be removed (order stock history).';
    end if;
  end if;
  if new.coffee_sizes is null then return new; end if;
  if not exists (select 1 from public.brands b join public.categories c on c.id = new.category_id
    where b.id = new.brand_id and lower(replace(trim(b.name), '’', '''')) = 'jack''s coffee' and c.name = 'Кофе') then
    raise exception 'Sizes are only available for Jack''s Coffee coffee products.';
  end if;
  if jsonb_typeof(new.coffee_sizes) <> 'object' or not (new.coffee_sizes ?& array['size_1kg','size_250g'])
    or (new.coffee_sizes - 'size_1kg' - 'size_250g') <> '{}'::jsonb then
    raise exception 'Both coffee sizes are required.';
  end if;
  foreach k in array array['size_1kg','size_250g'] loop
    v := new.coffee_sizes->k;
    if jsonb_typeof(v) is distinct from 'object'
      or jsonb_typeof(v->'price') is distinct from 'number'
      or jsonb_typeof(v->'stock') is distinct from 'number' then raise exception 'Invalid size price or stock'; end if;
    if (v->>'price')::numeric <= 0 or (v->>'stock')::numeric < 0
      or (v->>'stock')::numeric > 2147483647 or (v->>'stock')::numeric <> trunc((v->>'stock')::numeric) then
      raise exception 'Price must be positive and stock a nonnegative integer';
    end if;
    if v->>'original_price' is not null then
      if jsonb_typeof(v->'original_price') <> 'number' or (v->>'original_price')::numeric <= (v->>'price')::numeric then
        raise exception 'Original price must exceed size price';
      end if;
    end if;
    if new.tag = 'хямдралтай' and v->>'original_price' is null then raise exception 'Original size prices required'; end if;
  end loop;
  return new;
end $$;
drop trigger if exists validate_coffee_sizes on public.products;
create trigger validate_coffee_sizes before insert or update of coffee_sizes, brand_id, category_id, tag
on public.products for each row execute function public.validate_coffee_sizes();

  create or replace function decrement_stock(p_product_id bigint, p_option_type text, p_qty int)
  returns boolean as $$
  declare
    v_unified boolean;
    v_per_box int;
    v_new_unit int;
  begin
    if p_qty is null or p_qty <= 0 then return false; end if;
    if p_option_type in ('size_1kg', 'size_250g') then
      update public.products set coffee_sizes = jsonb_set(coffee_sizes, array[p_option_type, 'stock'],
        to_jsonb((coffee_sizes->p_option_type->>'stock')::int - p_qty))
      where id = p_product_id and (coffee_sizes->p_option_type->>'stock')::int >= p_qty;
      return found;
    end if;
    if p_option_type is null or p_option_type not in ('unit', 'box') then return false; end if;
    select unified_stock, box_per_box into v_unified, v_per_box from products where id = p_product_id for update;
    if v_unified and coalesce(v_per_box, 0) > 0 then
      -- Нэгдсэн нөөцтэй бараа: хайрцгаар авсан ч гэсэн бодит үлдэгдэл нь
      -- ширхэгээр хадгалагддаг тул warehouse_unit_stock-оос хасаад,
      -- warehouse_box_stock-ыг түүнээс нь дахин (floor) тооцно
      if p_option_type = 'box' then
        update products set warehouse_unit_stock = warehouse_unit_stock - (p_qty * v_per_box)
          where id = p_product_id and warehouse_unit_stock >= p_qty * v_per_box
          returning warehouse_unit_stock into v_new_unit;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock - p_qty
          where id = p_product_id and warehouse_unit_stock >= p_qty
          returning warehouse_unit_stock into v_new_unit;
      end if;
      if v_new_unit is null then return false; end if;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = p_product_id;
      return true;
    else
      if p_option_type = 'box' then
        update products set warehouse_box_stock = warehouse_box_stock - p_qty where id = p_product_id and warehouse_box_stock >= p_qty;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock - p_qty where id = p_product_id and warehouse_unit_stock >= p_qty;
      end if;
      return found;
    end if;
  end;
  $$ language plpgsql security definer set search_path = public;
  revoke execute on function decrement_stock(bigint, text, int) from public, anon, authenticated;

  -- Захиалга үүсгэх (эсвэл дараагийн бараа хангалтгүй болж цуцлах) явцад
  -- аль хэдийн амжилттай хассан нөөцөө буцаах rollback функц. Мөн л
  -- anon/authenticated-д шууд грант хийхгүй — submit_order доторх алдааны
  -- үед автомат транзакцийн rollback хангалттай, гаднаас дуудах шаардлагагүй.
  create or replace function restore_stock(p_product_id bigint, p_option_type text, p_qty int)
  returns void as $$
  declare
    v_unified boolean;
    v_per_box int;
    v_new_unit int;
  begin
    if p_qty is null or p_qty <= 0 then raise exception 'Invalid stock quantity'; end if;
    if p_option_type in ('size_1kg', 'size_250g') then
      update public.products set coffee_sizes = jsonb_set(coffee_sizes, array[p_option_type, 'stock'],
        to_jsonb((coffee_sizes->p_option_type->>'stock')::int + p_qty))
      where id = p_product_id and coffee_sizes ? p_option_type;
      if not found then raise exception 'Coffee size not found'; end if;
      return;
    end if;
    if p_option_type is null or p_option_type not in ('unit', 'box') then raise exception 'Invalid stock option'; end if;
    select unified_stock, box_per_box into v_unified, v_per_box from products where id = p_product_id for update;
    if v_unified and coalesce(v_per_box, 0) > 0 then
      if p_option_type = 'box' then
        update products set warehouse_unit_stock = warehouse_unit_stock + (p_qty * v_per_box) where id = p_product_id returning warehouse_unit_stock into v_new_unit;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock + p_qty where id = p_product_id returning warehouse_unit_stock into v_new_unit;
      end if;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = p_product_id;
    else
      if p_option_type = 'box' then
        update products set warehouse_box_stock = warehouse_box_stock + p_qty where id = p_product_id;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock + p_qty where id = p_product_id;
      end if;
    end if;
  end;
  $$ language plpgsql security definer set search_path = public;
  revoke execute on function restore_stock(bigint, text, int) from public, anon, authenticated;

  create or replace function submit_order(
    p_customer_name text, p_phone text, p_address text, p_receipt_type text,
    p_register_number text, p_delivery_method text, p_items jsonb
  ) returns jsonb
  language plpgsql security definer set search_path = public as $function$
  declare
    v_order_number text;
    v_item jsonb;
    v_product products%rowtype;
    v_qty int;
    v_option_type text;
    v_note text;
    v_current_price numeric;
    v_box_price numeric;
    v_line_total numeric;
    v_subtotal numeric := 0;
    v_delivery_method text;
    v_delivery_fee numeric := 0;
    v_ok boolean;
    v_discount_expired boolean;
    v_label text;
    v_item_rows jsonb := '[]'::jsonb;
    v_attempts int := 0;
  begin
    if p_items is null or jsonb_array_length(p_items) = 0 then
      raise exception 'Сагс хоосон байна.';
    end if;
    if p_phone is null or length(trim(p_phone)) = 0 then
      raise exception 'Утасны дугаар оруулна уу.';
    end if;

    v_delivery_method := case when p_delivery_method = 'delivery' then 'delivery' else 'pickup' end;

    for v_item in select * from jsonb_array_elements(p_items) loop
      v_option_type := v_item->>'option_type';
      v_qty := (v_item->>'qty')::int;
      v_note := v_item->>'note';
      if v_option_type is null or v_option_type not in ('unit','box','size_1kg','size_250g') or v_qty is null or v_qty <= 0 or v_qty > 1000 then
        raise exception 'Буруу барааны мэдээлэл.';
      end if;

      select * into v_product from products where id = (v_item->>'product_id')::bigint for update;
      if not found then
        raise exception 'Бараа олдсонгүй.';
      end if;

      if v_product.coffee_sizes is not null then
        if v_option_type not in ('size_1kg', 'size_250g') or not exists (
          select 1 from brands b join categories c on c.id = v_product.category_id
          where b.id = v_product.brand_id and lower(replace(trim(b.name), '’', '''')) = 'jack''s coffee' and c.name = 'Кофе'
        ) then raise exception 'Хэмжээг дахин сонгоно уу.'; end if;
      elsif v_option_type not in ('unit', 'box') then
        raise exception 'Энэ бараанд хэмжээний сонголт байхгүй.';
      end if;

      v_discount_expired := v_product.tag = 'хямдралтай' and v_product.discount_ends_at is not null and v_product.discount_ends_at <= now();
      v_box_price := case when v_discount_expired then coalesce(v_product.box_original_price, v_product.box_price) else v_product.box_price end;

      if v_option_type in ('size_1kg', 'size_250g') then
        v_current_price := case when v_discount_expired then
          coalesce((v_product.coffee_sizes->v_option_type->>'original_price')::numeric,
            (v_product.coffee_sizes->v_option_type->>'price')::numeric)
          else (v_product.coffee_sizes->v_option_type->>'price')::numeric end;
      elsif v_option_type = 'unit' then
        v_current_price := case when v_discount_expired then coalesce(v_product.unit_original_price, v_product.unit_price) else v_product.unit_price end;
      else
        v_current_price := v_box_price;
      end if;

      if v_current_price is null or v_current_price <= 0 then raise exception 'Барааны үнэ тохируулагдаагүй байна.'; end if;

      if v_option_type = 'unit' and coalesce(v_product.bulk_qty, 0) > 0 and coalesce(v_product.bulk_unit_price, 0) > 0 and v_qty >= v_product.bulk_qty then
        v_current_price := v_product.bulk_unit_price;
        v_line_total := round(v_current_price * v_qty);
      elsif v_option_type = 'unit' and coalesce(v_product.bulk_qty, 0) > 0 and coalesce(v_box_price, 0) > 0 and coalesce(v_product.box_per_box, 0) > 0 and v_qty >= v_product.bulk_qty then
        v_line_total := round((v_box_price / v_product.box_per_box) * v_qty);
      else
        v_line_total := v_current_price * v_qty;
      end if;

      v_ok := decrement_stock(v_product.id, v_option_type, v_qty);
      if not v_ok then
        raise exception '"%" барааны нөөц дууссан байна. Сагсаа шинэчилж дахин оролдоно уу.', v_product.name;
      end if;

      v_subtotal := v_subtotal + v_line_total;
      v_label := case v_option_type when 'size_1kg' then '1кг' when 'size_250g' then '250гр' when 'unit' then v_product.unit_label else v_product.box_label end;
      if v_note is not null and length(v_note) > 0 then
        v_label := v_label || ' · ' || v_note;
      end if;

      v_item_rows := v_item_rows || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'option_type', v_option_type, 'option_label', v_label, 'unit_price', v_current_price, 'qty', v_qty, 'line_total', v_line_total);
    end loop;

    v_delivery_fee := case when v_delivery_method = 'delivery' and v_subtotal < 500000 then 15000 else 0 end;

    -- Захиалгын дугаар (санамсаргүй 6 оронтой тоо, 900,000 хослол) мөргөлдвөл
    -- шинэ дугаараар дахин оролдоно — захиалгын тоо олширох тусам мөргөлдөх
    -- магадлал өсдөг тул урьдчилан хамгаална.
    loop
      v_order_number := 'CP' || floor(100000 + random() * 900000)::int::text;
      begin
        insert into orders (order_number, user_id, customer_name, phone, address, subtotal, status, receipt_type, register_number, delivery_method, delivery_fee)
        values (v_order_number, null, p_customer_name, p_phone, case when v_delivery_method = 'delivery' then p_address else null end, v_subtotal, 'pending', coalesce(p_receipt_type, 'individual'), case when p_receipt_type = 'company' then p_register_number else null end, v_delivery_method, v_delivery_fee);
        exit;
      exception when unique_violation then
        v_attempts := v_attempts + 1;
        if v_attempts >= 5 then
          raise exception 'Захиалгын дугаар үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.';
        end if;
      end;
    end loop;

    insert into order_items (order_number, product_id, product_name, option_type, option_label, unit_price, qty, line_total)
    select v_order_number, (r->>'product_id')::bigint, r->>'product_name', r->>'option_type', r->>'option_label', (r->>'unit_price')::numeric, (r->>'qty')::int, (r->>'line_total')::numeric
    from jsonb_array_elements(v_item_rows) r;

    return jsonb_build_object('orderNumber', v_order_number, 'subtotal', v_subtotal, 'deliveryFee', v_delivery_fee);
  end;
  $function$;



grant execute on function public.submit_order(text, text, text, text, text, text, jsonb) to anon, authenticated;
-- Admin-managed weekend training dates. Existing registrations are preserved.
create table if not exists public.training_registrations (
  id bigint generated by default as identity primary key,
  name text not null,
  phone text not null,
  training_date date not null,
  payment_status text not null default 'pending',
  qpay_invoice_id text,
  created_at timestamptz not null default now()
);
alter table public.training_registrations add column if not exists schedule_reserved boolean not null default false;
alter table public.training_registrations add column if not exists booking_key uuid;
create unique index if not exists training_booking_key_unique on public.training_registrations(booking_key) where booking_key is not null;
alter table public.training_registrations enable row level security;
drop policy if exists "admin read scheduled registrations" on public.training_registrations;
create policy "admin read scheduled registrations" on public.training_registrations for select to authenticated using (public.is_admin());
drop policy if exists "admin delete scheduled registrations" on public.training_registrations;
create policy "admin delete scheduled registrations" on public.training_registrations for delete to authenticated using (public.is_admin());
grant select, delete on public.training_registrations to authenticated;

create table if not exists public.training_sessions (
  training_date date primary key check (extract(isodow from training_date) in (6, 7)),
  remaining_seats integer not null check (remaining_seats >= 0),
  is_active boolean not null default true,
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.training_sessions enable row level security;
grant select on public.training_sessions to anon, authenticated;
grant insert, update on public.training_sessions to authenticated;
revoke insert, update, delete on public.training_sessions from anon;
revoke delete on public.training_sessions from authenticated;
drop policy if exists "public training schedule" on public.training_sessions;
create policy "public training schedule" on public.training_sessions for select to anon, authenticated
using (is_active and training_date >= (now() at time zone 'Asia/Ulaanbaatar')::date);
drop policy if exists "admin training schedule" on public.training_sessions;
create policy "admin training schedule" on public.training_sessions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_training_session() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and new.training_date <> old.training_date then
    raise exception 'Сургалтын огноог шилжүүлэхгүй. Шинэ өдөр нэмж, хуучныг хаана уу.';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
drop trigger if exists touch_training_session on public.training_sessions;
create trigger touch_training_session before insert or update on public.training_sessions
for each row execute function public.touch_training_session();

-- The trigger also guards inserts from older RPCs and restores only seats reserved by this schedule.
create or replace function public.reserve_training_seat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.training_date is null or new.training_date < (now() at time zone 'Asia/Ulaanbaatar')::date
    or extract(isodow from new.training_date) not in (6, 7) then
    raise exception 'Ирээдүйн Бямба эсвэл Ням гарагийн сургалтыг сонгоно уу.';
  end if;
  update public.training_sessions set remaining_seats = remaining_seats - 1
    where training_date = new.training_date and is_active and remaining_seats > 0;
  if not found then raise exception 'Энэ сургалтын бүртгэл хаалттай эсвэл суудал дүүрсэн байна.'; end if;
  new.schedule_reserved := true;
  return new;
end $$;
drop trigger if exists reserve_training_seat on public.training_registrations;
create trigger reserve_training_seat before insert on public.training_registrations
for each row execute function public.reserve_training_seat();

create or replace function public.restore_training_seat() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.schedule_reserved then
    update public.training_sessions set remaining_seats = remaining_seats + 1 where training_date = old.training_date;
  end if;
  return old;
end $$;
drop trigger if exists restore_training_seat on public.training_registrations;
create trigger restore_training_seat after delete on public.training_registrations
for each row execute function public.restore_training_seat();

create or replace function public.protect_training_reservation() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.training_date is distinct from old.training_date or new.schedule_reserved is distinct from old.schedule_reserved
    or new.booking_key is distinct from old.booking_key then
    raise exception 'Бүртгэлийн өдөр болон суудлын холбоосыг өөрчлөх боломжгүй.';
  end if;
  return new;
end $$;
drop trigger if exists protect_training_reservation on public.training_registrations;
create trigger protect_training_reservation before update on public.training_registrations
for each row execute function public.protect_training_reservation();

create or replace function public.register_scheduled_training(p_name text, p_phone text, p_training_date date, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.training_registrations%rowtype;
begin
  if p_request_id is null or nullif(trim(p_name), '') is null or length(trim(p_name)) > 200
    or p_phone is null or trim(p_phone) !~ '^[0-9]{8}$' then
    raise exception 'Нэр, 8 оронтой утасны дугаараа зөв оруулна уу.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into r from public.training_registrations where booking_key = p_request_id;
  if found then
    if r.name <> trim(p_name) or r.phone <> trim(p_phone) or r.training_date is distinct from p_training_date then
      raise exception 'Бүртгэлийн мэдээлэл өөрчлөгдсөн байна.';
    end if;
    return to_jsonb(r.id);
  end if;
  insert into public.training_registrations(name, phone, training_date, payment_status, booking_key)
    values (trim(p_name), trim(p_phone), p_training_date, 'pending', p_request_id) returning * into r;
  return to_jsonb(r.id);
end $$;
revoke all on function public.register_scheduled_training(text,text,date,uuid) from public;
grant execute on function public.register_scheduled_training(text,text,date,uuid) to anon, authenticated;
revoke all on function public.reserve_training_seat() from public, anon, authenticated;
revoke all on function public.restore_training_seat() from public, anon, authenticated;

-- BEGIN approved stock top-up 2026-10-06. Once only, including on repeated Run.
create table if not exists public.stock_topup_runs (
  operation text primary key,
  applied_at timestamptz not null default now(),
  changed_products integer not null default 0
);
create table if not exists public.stock_topup_audit (
  operation text not null references public.stock_topup_runs(operation),
  product_id bigint not null,
  before_stock jsonb not null,
  after_stock jsonb not null,
  primary key(operation, product_id)
);
alter table public.stock_topup_runs enable row level security;
alter table public.stock_topup_audit enable row level security;
revoke all on public.stock_topup_runs, public.stock_topup_audit from public, anon, authenticated;
do $$
declare
  p public.products%rowtype;
  units bigint; boxes bigint; sizes jsonb; k text; n bigint;
  changed integer := 0;
begin
  insert into public.stock_topup_runs(operation) values ('approved-even-topup-2026-10-06') on conflict do nothing;
  if not found then return; end if;
  for p in select * from public.products order by id for update loop
    units := p.warehouse_unit_stock; boxes := p.warehouse_box_stock; sizes := p.coffee_sizes;
    if sizes is not null then
      foreach k in array array['size_1kg','size_250g'] loop
        if coalesce((sizes->k->>'price')::numeric, 0) > 0 then
          n := greatest(coalesce((sizes->k->>'stock')::bigint, 0), 0) + 10;
          sizes := jsonb_set(sizes, array[k,'stock'], to_jsonb(n + n % 2));
        end if;
      end loop;
    elsif p.unified_stock and coalesce(p.box_per_box, 0) > 0 and (p.unit_price > 0 or p.box_price > 0) then
      -- Shared stock: an even box count gives both an even unit count and an exact conversion.
      n := greatest(coalesce(units, 0), 0) + case when p.unit_price > 0 then 10 else 0 end;
      boxes := greatest(ceil(n::numeric / p.box_per_box)::bigint,
        greatest(coalesce(boxes, 0), 0) + case when p.box_price > 0 then 10 else 0 end);
      boxes := boxes + boxes % 2;
      units := boxes * p.box_per_box;
    else
      if p.unit_price > 0 then
        units := greatest(coalesce(units, 0), 0) + 10;
        units := units + units % 2;
      end if;
      if p.box_price > 0 then
        boxes := greatest(coalesce(boxes, 0), 0) + 10;
        boxes := boxes + boxes % 2;
      end if;
    end if;
    if units is not distinct from p.warehouse_unit_stock and boxes is not distinct from p.warehouse_box_stock
      and sizes is not distinct from p.coffee_sizes then continue; end if;
    insert into public.stock_topup_audit(operation, product_id, before_stock, after_stock) values (
      'approved-even-topup-2026-10-06', p.id,
      jsonb_build_object('unit',p.warehouse_unit_stock,'box',p.warehouse_box_stock,'coffee_sizes',p.coffee_sizes),
      jsonb_build_object('unit',units,'box',boxes,'coffee_sizes',sizes));
    update public.products set warehouse_unit_stock=units, warehouse_box_stock=boxes, coffee_sizes=sizes where id=p.id;
    changed := changed + 1;
  end loop;
  update public.stock_topup_runs set changed_products=changed where operation='approved-even-topup-2026-10-06';
end $$;
-- END approved stock top-up 2026-10-06.

notify pgrst, 'reload schema';
commit;

-- The full query should finish with this result row, not just an empty Success message.
select
  'run-all-updates: training schedule ready' as update_status,
  to_regclass('public.training_sessions')::text as training_table,
  to_regprocedure('public.register_scheduled_training(text,text,date,uuid)')::text as registration_function,
  has_table_privilege('authenticated', 'public.training_sessions', 'INSERT,UPDATE') as admin_table_access,
  (select changed_products from public.stock_topup_runs where operation='approved-even-topup-2026-10-06') as stock_topup_products;

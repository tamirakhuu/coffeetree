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
alter table public.products add column if not exists shelf_life text;
alter table public.products add column if not exists extra_category_id bigint references public.categories(id) on delete set null;
alter table public.products add column if not exists extra_subcategory text;
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

alter table public.products add column if not exists powder_sizes jsonb;

create or replace function public.validate_powder_sizes() returns trigger
language plpgsql set search_path = public as $$
declare k text; v jsonb; f text; n numeric;
begin
  if tg_op = 'UPDATE' then
    if old.powder_sizes is not null and new.powder_sizes is null then raise exception 'Powder sizes cannot be removed'; end if;
  end if;
  if new.powder_sizes is null then return new; end if;
  if new.coffee_sizes is not null then raise exception 'Choose one size type'; end if;
  if jsonb_typeof(new.powder_sizes) <> 'object' or new.powder_sizes = '{}'::jsonb then
    raise exception 'At least one size is required';
  end if;
  for k in select jsonb_object_keys(new.powder_sizes) loop
    if k !~ '^(powder_[lms]|variant_[a-z0-9]+)$' then raise exception 'Invalid size key'; end if;
    v := new.powder_sizes->k;
    if jsonb_typeof(v) <> 'object' then raise exception 'Invalid size'; end if;
    if k like 'variant_%' and (jsonb_typeof(v->'label') is distinct from 'string' or length(trim(v->>'label')) not between 1 and 80) then
      raise exception 'Size name is required (1-80 characters)';
    end if;
    if (nullif(v->>'bulk_qty','') is null) <> (nullif(v->>'bulk_price','') is null) then raise exception 'Bulk quantity and price must be provided together'; end if;
    foreach f in array array['price','bulk_qty','bulk_price','stock'] loop
      if f in ('bulk_qty','bulk_price') and (v->>f) is null then continue; end if;
      if jsonb_typeof(v->f) is distinct from 'number' then raise exception 'Invalid powder size value'; end if;
      n := (v->>f)::numeric;
      if n <> trunc(n) or n > 2147483647 or n < (case when f='stock' then 0 else 1 end) then
        raise exception 'Invalid powder price, quantity or stock';
      end if;
    end loop;
    if (v->>'bulk_price')::numeric > (v->>'price')::numeric then raise exception 'Bulk price exceeds unit price'; end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists validate_powder_sizes on public.products;
create trigger validate_powder_sizes before insert or update on public.products
for each row execute function public.validate_powder_sizes();
revoke all on function public.validate_powder_sizes() from public, anon, authenticated;



  create or replace function decrement_stock(p_product_id bigint, p_option_type text, p_qty int)
  returns boolean as $$
  declare
    v_unified boolean;
    v_per_box int;
    v_new_unit int;
  begin
    if p_qty is null or p_qty <= 0 then return false; end if;
    if p_option_type ~ '^(powder_[lms]|variant_[a-z0-9]+)$' then
      update public.products set powder_sizes = jsonb_set(powder_sizes, array[p_option_type,'stock'],
        to_jsonb((powder_sizes->p_option_type->>'stock')::int - p_qty))
      where id = p_product_id and (powder_sizes->p_option_type->>'stock')::int >= p_qty;
      return found;
    end if;
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
    if p_option_type ~ '^(powder_[lms]|variant_[a-z0-9]+)$' then
      update public.products set powder_sizes = jsonb_set(powder_sizes, array[p_option_type,'stock'],
        to_jsonb((powder_sizes->p_option_type->>'stock')::int + p_qty))
      where id = p_product_id and powder_sizes ? p_option_type;
      if not found then raise exception 'Powder size not found'; end if;
      return;
    end if;
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
    perform expire_stale_orders();
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
      if v_option_type is null or (v_option_type not in ('unit','box','size_1kg','size_250g','powder_l','powder_m','powder_s') and v_option_type !~ '^variant_[a-z0-9]+$') or v_qty is null or v_qty <= 0 or v_qty > 1000 then
        raise exception 'Буруу барааны мэдээлэл.';
      end if;

      select * into v_product from products where id = (v_item->>'product_id')::bigint for update;
      if not found then
        raise exception 'Бараа олдсонгүй.';
      end if;

      if v_product.powder_sizes is not null then
        if not (v_product.powder_sizes ? v_option_type) then raise exception 'Select an available size'; end if;
      elsif v_product.coffee_sizes is not null then
        if v_option_type not in ('size_1kg', 'size_250g') or not exists (
          select 1 from brands b join categories c on c.id = v_product.category_id
          where b.id = v_product.brand_id and lower(replace(trim(b.name), '’', '''')) = 'jack''s coffee' and c.name = 'Кофе'
        ) then raise exception 'Хэмжээг дахин сонгоно уу.'; end if;
      elsif v_option_type not in ('unit', 'box') then
        raise exception 'Энэ бараанд хэмжээний сонголт байхгүй.';
      end if;

      v_discount_expired := v_product.tag = 'хямдралтай' and v_product.discount_ends_at is not null and v_product.discount_ends_at <= now();
      v_box_price := case when v_discount_expired then coalesce(v_product.box_original_price, v_product.box_price) else v_product.box_price end;

      if v_product.powder_sizes is not null then
        v_current_price := case when v_qty >= (v_product.powder_sizes->v_option_type->>'bulk_qty')::int
          then (v_product.powder_sizes->v_option_type->>'bulk_price')::numeric
          else (v_product.powder_sizes->v_option_type->>'price')::numeric end;
      elsif v_option_type in ('size_1kg', 'size_250g') then
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
      v_label := case when v_product.powder_sizes->v_option_type->>'label' is not null then v_product.powder_sizes->v_option_type->>'label' else case v_option_type when 'powder_l' then 'L' when 'powder_m' then 'M' when 'powder_s' then 'S' when 'size_1kg' then '1кг' when 'size_250g' then '250гр' when 'unit' then v_product.unit_label else v_product.box_label end end;
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
-- BEGIN employee store requests. Stock is deducted only on warehouse approval.
create table if not exists public.store_staff (
  email text primary key check (email = lower(trim(email))),
  store_name text not null check (store_name in ('Саруул зах','Яармаг'))
);
alter table public.store_staff enable row level security;
create or replace function public.request_store() returns text language sql stable security definer set search_path=public
as $$ select store_name from public.store_staff where email=lower(auth.email()) $$;
create or replace function public.is_request_manager() returns boolean language plpgsql stable security definer set search_path=public as $$
declare allowed boolean := false;
begin
  if public.is_admin() then return true; end if;
  if to_regprocedure('public.is_warehouse_staff()') is not null then
    execute 'select public.is_warehouse_staff()' into allowed;
  end if;
  return coalesce(allowed,false);
end $$;
revoke all on function public.request_store(), public.is_request_manager() from public, anon;
grant execute on function public.request_store(), public.is_request_manager() to authenticated;
drop policy if exists "manage store staff" on public.store_staff;
create policy "manage store staff" on public.store_staff for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.store_staff to authenticated;

create table if not exists public.store_requests (
  id uuid primary key,
  requested_by uuid not null references auth.users(id),
  store_name text not null,
  note text not null default '' check(length(note)<=500),
  status text not null default 'pending' check(status in ('pending','preparing','sent','received','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_request_items (
  request_id uuid not null references public.store_requests(id),
  product_id bigint not null references public.products(id),
  option_type text not null,
  product_name text not null,
  option_label text not null,
  qty int not null check(qty>0 and qty<=1000),
  primary key(request_id,product_id,option_type)
);
alter table public.store_requests enable row level security;
alter table public.store_request_items enable row level security;
drop policy if exists "read store requests" on public.store_requests;
create policy "read store requests" on public.store_requests for select to authenticated
using(public.is_request_manager() or store_name=public.request_store());
drop policy if exists "read store request items" on public.store_request_items;
create policy "read store request items" on public.store_request_items for select to authenticated
using(exists(select 1 from public.store_requests r where r.id=request_id));
revoke all on public.store_requests, public.store_request_items from anon, authenticated;
grant select on public.store_requests,public.store_request_items to authenticated;
create index if not exists store_requests_created on public.store_requests(created_at desc);
alter table public.store_request_items add column if not exists approved boolean not null default false;
-- Агуулахын ажилтан захиалгыг "Илгээх"-ээр бэлдэхдээ нэмж өөр бараа оруулсан бол
-- тэр нэмэлт бараа warehouse_create_transfer-ээр ижил batch_id-тай явна; энэ баганаар
-- adminpanel дээр захиалгын мөрүүд болон нэмэлт бараанууд хоорондоо холбогдож харагдана.
alter table public.store_requests add column if not exists batch_id text;
-- Upgrade old reservations once; rerunning must not restore stock again.
do $$ declare r record; i record; begin
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='store_requests' and column_name='stock_reserved') then
    alter table public.store_requests add column stock_reserved boolean not null default false;
    for r in select * from public.store_requests where status='pending' order by id for update loop
      for i in select * from public.store_request_items where request_id=r.id order by product_id,option_type loop
        perform public.restore_stock(i.product_id,i.option_type,i.qty);
      end loop;
    end loop;
    update public.store_requests set stock_reserved=true where status in ('preparing','sent','received');
    update public.store_request_items set approved=true where request_id in (select id from public.store_requests where stock_reserved);
  end if;
end $$;

create or replace function public.submit_store_request(p_id uuid,p_items jsonb,p_note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare branch text; r public.store_requests; item jsonb; p public.products; opt text; amount int; label text; available int;
begin
  branch:=public.request_store();
  if auth.uid() is null or branch is null then raise exception 'Ажилтны эрх байхгүй байна.'; end if;
  if p_id is null then raise exception 'Хүсэлтийн дугаар шаардлагатай.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into r from public.store_requests where id=p_id;
  if found then
    if r.requested_by<>auth.uid() then raise exception 'Хандах эрхгүй.'; end if;
    return r.id;
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception '1–100 мөр бараа сонгоно уу.'; end if;
  insert into public.store_requests(id,requested_by,store_name,note) values(p_id,auth.uid(),branch,coalesce(p_note,''));
  for item in select value from jsonb_array_elements(p_items) order by (value->>'product_id')::bigint,value->>'option_type' loop
    amount:=(item->>'qty')::int; opt:=item->>'option_type';
    if amount is null or amount<=0 or amount>1000 or opt is null then raise exception 'Барааны тоо буруу.'; end if;
    select * into p from public.products where id=(item->>'product_id')::bigint for update;
    if not found then raise exception 'Бараа олдсонгүй.'; end if;
    if p.powder_sizes is not null then
      if not(p.powder_sizes ? opt) then raise exception 'Хэмжээ буруу.'; end if;
      label:=coalesce(p.powder_sizes->opt->>'label',upper(right(opt,1)));
    elsif p.coffee_sizes is not null then
      if not(p.coffee_sizes ? opt) then raise exception 'Хэмжээ буруу.'; end if;
      label:=case opt when 'size_1kg' then '1кг' else '250гр' end;
    else
      if opt not in ('unit','box') or (opt='unit' and coalesce(p.unit_price,0)<=0) or (opt='box' and coalesce(p.box_price,0)<=0) then raise exception 'Савлагаа буруу.'; end if;
      label:=case opt when 'unit' then p.unit_label else p.box_label end;
    end if;
    available:=case when p.powder_sizes is not null then (p.powder_sizes->opt->>'stock')::int
      when p.coffee_sizes is not null then (p.coffee_sizes->opt->>'stock')::int
      when opt='box' then p.warehouse_box_stock else p.warehouse_unit_stock end;
    if coalesce(available,0)<amount then raise exception '"%" үлдэгдэл хүрэлцэхгүй. Жагсаалтаа шинэчилнэ үү.',p.name; end if;
    insert into public.store_request_items(request_id,product_id,option_type,product_name,option_label,qty) values(p_id,p.id,opt,p.name,coalesce(label,opt),amount);
  end loop;
  return p_id;
end $$;

drop function if exists public.prepare_store_request(uuid,jsonb);
create or replace function public.prepare_store_request(p_id uuid,p_items jsonb,p_batch_id text default null) returns void
language plpgsql security definer set search_path=public as $$
declare r public.store_requests; item public.store_request_items; selected_count int;
begin
  if auth.uid() is null or not public.is_request_manager() then raise exception 'Агуулахын эрх шаардлагатай.'; end if;
  select * into r from public.store_requests where id=p_id for update;
  if not found then raise exception 'Хүсэлт олдсонгүй.'; end if;
  if r.status in ('preparing','sent') then return; end if;
  if r.status<>'pending' then raise exception 'Энэ хүсэлтийг бэлтгэх боломжгүй.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 then raise exception 'Бэлдэх бараагаа сонгоно уу.'; end if;
  select count(*) into selected_count from public.store_request_items i where request_id=p_id and exists
    (select 1 from jsonb_array_elements(p_items) s where (s->>'product_id')::bigint=i.product_id and s->>'option_type'=i.option_type);
  if selected_count<>jsonb_array_length(p_items) then raise exception 'Сонгосон бараа буруу эсвэл давхардсан.'; end if;
  for item in select * from public.store_request_items i where request_id=p_id and exists
    (select 1 from jsonb_array_elements(p_items) s where (s->>'product_id')::bigint=i.product_id and s->>'option_type'=i.option_type)
    order by product_id,option_type loop
    if not public.decrement_stock(item.product_id,item.option_type,item.qty) then raise exception '"%" үлдэгдэл хүрэлцэхгүй. Сонголтоо шинэчилнэ үү.',item.product_name; end if;
    update public.store_request_items set approved=true where request_id=p_id and product_id=item.product_id and option_type=item.option_type;
  end loop;
  -- "Бэлдсэн" дарахад шууд дэлгүүрт хүлээн авах боломжтой ('sent') төлөвт шилжинэ —
  -- агуулахаас тусад нь "Илгээсэн" гэж дахин товшиж баталгаажуулах шаардлагагүй.
  -- p_batch_id нь зэрэгцэж нэмсэн (warehouse_create_transfer-ээр илгээсэн) нэмэлт
  -- бараатай adminpanel дээр холбогдож харагдах зориулалттай, нөөцийн тооцоололд нөлөөгүй.
  update public.store_requests set status='sent',stock_reserved=true,updated_at=now(),batch_id=coalesce(p_batch_id,batch_id) where id=p_id;
end $$;
revoke all on function public.prepare_store_request(uuid,jsonb,text) from public,anon;
grant execute on function public.prepare_store_request(uuid,jsonb,text) to authenticated;

create or replace function public.change_store_request(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.store_requests; item public.store_request_items; manager boolean;
begin
  if auth.uid() is null then raise exception 'Нэвтэрнэ үү.'; end if;
  select * into r from public.store_requests where id=p_id for update;
  if not found then raise exception 'Хүсэлт олдсонгүй.'; end if;
  manager:=public.is_request_manager();
  if not manager and (public.request_store() is null or public.request_store()<>r.store_name) then raise exception 'Хандах эрхгүй.'; end if;
  if r.status=p_status then return; end if;
  if not coalesce((
    (manager and r.status='preparing' and p_status='sent') or
    (manager and r.status in ('pending','preparing') and p_status='rejected') or
    (r.requested_by=auth.uid() and r.status='pending' and p_status='cancelled') or
    (public.request_store()=r.store_name and r.status='sent' and p_status='received')
  ),false) then raise exception 'Төлөвийн шилжилт зөвшөөрөгдөхгүй.'; end if;
  if p_status in ('rejected','cancelled') and r.stock_reserved then
    for item in select * from public.store_request_items where request_id=p_id and approved order by product_id,option_type loop
      perform public.restore_stock(item.product_id,item.option_type,item.qty);
    end loop;
  end if;
  update public.store_requests set status=p_status,stock_reserved=case when p_status in ('rejected','cancelled') then false else stock_reserved end,updated_at=now() where id=p_id;
end $$;
revoke all on function public.submit_store_request(uuid,jsonb,text),public.change_store_request(uuid,text) from public,anon;
grant execute on function public.submit_store_request(uuid,jsonb,text),public.change_store_request(uuid,text) to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='store_requests') then
    alter publication supabase_realtime add table public.store_requests;
  end if;
end $$;
-- END employee store requests.

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

-- ---------------------------------------------------------------------
-- 16) Өмнө нь зөвхөн Supabase SQL Editor дээр шууд бичигдэж, энэ файлд
-- хэзээ ч тэмдэглэгдээгүй байсан объектуудыг нэгтгэв (2026-11-23 аудит).
-- Эдгээр нь production дээр аль хэдийн ажиллаж байгаа тул үйлдэл өөрчлөгдөхгүй,
-- зөвхөн DB-г дахин сэргээх боломжтой болгож байна.
-- ---------------------------------------------------------------------

-- Агуулахын ажилтны эрх (аguulah.html-ийн нэвтрэлтийн гарц).
create table if not exists public.warehouse_staff (
  email text primary key
);
alter table public.warehouse_staff enable row level security;
drop policy if exists "admin manage warehouse staff" on public.warehouse_staff;
create policy "admin manage warehouse staff" on public.warehouse_staff for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.is_warehouse_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from warehouse_staff where lower(email) = lower(auth.email()));
$$;
grant execute on function public.is_warehouse_staff() to anon, authenticated;

-- Агуулах ⇄ дэлгүүрийн шилжилтийн төлөв (admin-panel.html, aguulah.html).
alter table public.stock_transfers add column if not exists status text not null default 'pending';
alter table public.stock_transfers add column if not exists received_at timestamptz;
alter table public.stock_transfers add column if not exists received_by text;
alter table public.stock_transfers add column if not exists store_name text;
alter table public.stock_transfers add column if not exists batch_id text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_transfers_direction_check') then
    alter table public.stock_transfers add constraint stock_transfers_direction_check
      check (direction in ('to_store','to_warehouse','restock','writeoff'));
  end if;
end $$;
drop policy if exists "warehouse staff read stock_transfers" on public.stock_transfers;
create policy "warehouse staff read stock_transfers" on public.stock_transfers for select
  using (public.is_warehouse_staff());

create or replace function public.warehouse_create_transfer(
  p_product_id bigint, p_option_type text, p_qty integer, p_direction text,
  p_store_name text default null, p_batch_id text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_product_name text;
  v_warehouse_unit int;
  v_warehouse_box int;
  v_unified boolean;
  v_per_box int;
  v_need_unit int;
  v_new_id bigint;
begin
  if not is_warehouse_staff() then
    raise exception 'Зөвхөн агуулахын ажилтан энэ үйлдлийг хийх эрхтэй';
  end if;
  if p_qty is null or p_qty <= 0 then
    raise exception 'Тоо буруу байна';
  end if;
  if p_direction not in ('to_store', 'to_warehouse', 'restock', 'writeoff') then
    raise exception 'Чиглэл буруу байна';
  end if;

  select name, warehouse_unit_stock, warehouse_box_stock, unified_stock, box_per_box
    into v_product_name, v_warehouse_unit, v_warehouse_box, v_unified, v_per_box
    from products where id = p_product_id;
  if v_product_name is null then
    raise exception 'Бараа олдсонгүй';
  end if;
  v_unified := coalesce(v_unified, false) and coalesce(v_per_box, 0) > 0;

  if p_direction = 'to_store' or p_direction = 'writeoff' then
    if v_unified then
      v_need_unit := case when p_option_type = 'box' then p_qty * v_per_box else p_qty end;
      if coalesce(v_warehouse_unit, 0) < v_need_unit then
        raise exception 'Агуулахын нөөцөөс их тоо хасах/татах гэж байна';
      end if;
    else
      if p_option_type = 'box' then
        if coalesce(v_warehouse_box, 0) < p_qty then
          raise exception 'Агуулахын нөөцөөс их тоо хасах/татах гэж байна';
        end if;
      else
        if coalesce(v_warehouse_unit, 0) < p_qty then
          raise exception 'Агуулахын нөөцөөс их тоо хасах/татах гэж байна';
        end if;
      end if;
    end if;
  end if;

  insert into stock_transfers (product_id, product_name, option_type, direction, qty, admin_email, status, store_name, batch_id)
    values (p_product_id, v_product_name, p_option_type, p_direction, p_qty, auth.email(), 'pending', p_store_name, p_batch_id)
    returning id into v_new_id;

  return v_new_id;
end;
$$;
revoke all on function public.warehouse_create_transfer(bigint,text,integer,text,text,text) from public, anon;
grant execute on function public.warehouse_create_transfer(bigint,text,integer,text,text,text) to authenticated;

create or replace function public.admin_receive_transfer(p_transfer_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_transfer record;
  v_unified boolean;
  v_per_box int;
  v_need_unit int;
  v_cur_unit int;
  v_new_unit int;
begin
  if not is_admin() then
    raise exception 'Зөвхөн админ энэ үйлдлийг хийх эрхтэй';
  end if;

  select * into v_transfer from stock_transfers where id = p_transfer_id for update;
  if v_transfer is null then
    raise exception 'Шилжилт олдсонгүй';
  end if;
  if v_transfer.status <> 'pending' then
    raise exception 'Энэ шилжилт аль хэдийн хүлээн авагдсан байна';
  end if;

  select unified_stock, box_per_box into v_unified, v_per_box
    from products where id = v_transfer.product_id for update;
  v_unified := coalesce(v_unified, false) and coalesce(v_per_box, 0) > 0;

  if v_transfer.direction = 'to_store' then
    if v_unified then
      v_need_unit := case when v_transfer.option_type = 'box' then v_transfer.qty * v_per_box else v_transfer.qty end;
      select warehouse_unit_stock into v_cur_unit from products where id = v_transfer.product_id;
      if coalesce(v_cur_unit, 0) < v_need_unit then
        raise exception 'Агуулахын нөөц хүрэлцэхгүй байна';
      end if;
      update products set warehouse_unit_stock = warehouse_unit_stock - v_need_unit
        where id = v_transfer.product_id returning warehouse_unit_stock into v_new_unit;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set warehouse_box_stock = warehouse_box_stock - v_transfer.qty
          where id = v_transfer.product_id and warehouse_box_stock >= v_transfer.qty;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock - v_transfer.qty
          where id = v_transfer.product_id and warehouse_unit_stock >= v_transfer.qty;
      end if;
      if not found then
        raise exception 'Агуулахын нөөц хүрэлцэхгүй байна';
      end if;
    end if;

    if v_unified then
      if v_transfer.option_type = 'box' then
        update products set unit_stock = coalesce(unit_stock, 0) + (v_transfer.qty * v_per_box)
          where id = v_transfer.product_id returning unit_stock into v_new_unit;
      else
        update products set unit_stock = coalesce(unit_stock, 0) + v_transfer.qty
          where id = v_transfer.product_id returning unit_stock into v_new_unit;
      end if;
      update products set box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set box_stock = coalesce(box_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      else
        update products set unit_stock = coalesce(unit_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      end if;
    end if;

  elsif v_transfer.direction = 'to_warehouse' then
    if v_unified then
      v_need_unit := case when v_transfer.option_type = 'box' then v_transfer.qty * v_per_box else v_transfer.qty end;
      select unit_stock into v_cur_unit from products where id = v_transfer.product_id;
      if coalesce(v_cur_unit, 0) < v_need_unit then
        raise exception 'Дэлгүүрийн нөөцөөс их тоо буцаах гэж байна';
      end if;
      update products set unit_stock = unit_stock - v_need_unit
        where id = v_transfer.product_id returning unit_stock into v_new_unit;
      update products set box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set box_stock = box_stock - v_transfer.qty
          where id = v_transfer.product_id and box_stock >= v_transfer.qty;
      else
        update products set unit_stock = unit_stock - v_transfer.qty
          where id = v_transfer.product_id and unit_stock >= v_transfer.qty;
      end if;
      if not found then
        raise exception 'Дэлгүүрийн нөөцөөс их тоо буцаах гэж байна';
      end if;
    end if;

    if v_unified then
      v_need_unit := case when v_transfer.option_type = 'box' then v_transfer.qty * v_per_box else v_transfer.qty end;
      update products set warehouse_unit_stock = coalesce(warehouse_unit_stock, 0) + v_need_unit
        where id = v_transfer.product_id returning warehouse_unit_stock into v_new_unit;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set warehouse_box_stock = coalesce(warehouse_box_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      else
        update products set warehouse_unit_stock = coalesce(warehouse_unit_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      end if;
    end if;

  elsif v_transfer.direction = 'restock' then
    if v_unified then
      if v_transfer.option_type = 'box' then
        update products set warehouse_unit_stock = coalesce(warehouse_unit_stock, 0) + (v_transfer.qty * v_per_box)
          where id = v_transfer.product_id returning warehouse_unit_stock into v_new_unit;
      else
        update products set warehouse_unit_stock = coalesce(warehouse_unit_stock, 0) + v_transfer.qty
          where id = v_transfer.product_id returning warehouse_unit_stock into v_new_unit;
      end if;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set warehouse_box_stock = coalesce(warehouse_box_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      else
        update products set warehouse_unit_stock = coalesce(warehouse_unit_stock, 0) + v_transfer.qty where id = v_transfer.product_id;
      end if;
    end if;

  elsif v_transfer.direction = 'writeoff' then
    if v_unified then
      v_need_unit := case when v_transfer.option_type = 'box' then v_transfer.qty * v_per_box else v_transfer.qty end;
      select warehouse_unit_stock into v_cur_unit from products where id = v_transfer.product_id;
      if coalesce(v_cur_unit, 0) < v_need_unit then
        raise exception 'Агуулахын нөөц хүрэлцэхгүй байна';
      end if;
      update products set warehouse_unit_stock = warehouse_unit_stock - v_need_unit
        where id = v_transfer.product_id returning warehouse_unit_stock into v_new_unit;
      update products set warehouse_box_stock = v_new_unit / v_per_box where id = v_transfer.product_id;
    else
      if v_transfer.option_type = 'box' then
        update products set warehouse_box_stock = warehouse_box_stock - v_transfer.qty
          where id = v_transfer.product_id and warehouse_box_stock >= v_transfer.qty;
      else
        update products set warehouse_unit_stock = warehouse_unit_stock - v_transfer.qty
          where id = v_transfer.product_id and warehouse_unit_stock >= v_transfer.qty;
      end if;
      if not found then
        raise exception 'Агуулахын нөөц хүрэлцэхгүй байна';
      end if;
    end if;
  end if;

  update stock_transfers
    set status = 'received', received_at = now(), received_by = auth.email()
    where id = p_transfer_id;

  return true;
end;
$$;

create or replace function public.admin_reject_transfer(p_transfer_id bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_transfer record;
begin
  if not is_admin() then
    raise exception 'Зөвхөн админ энэ үйлдлийг хийх эрхтэй';
  end if;

  select * into v_transfer from stock_transfers where id = p_transfer_id for update;
  if v_transfer is null then
    raise exception 'Шилжилт олдсонгүй';
  end if;
  if v_transfer.status <> 'pending' then
    raise exception 'Энэ шилжилт аль хэдийн хүлээн авагдсан/цуцлагдсан байна';
  end if;

  update stock_transfers
    set status = 'rejected', received_at = now(), received_by = auth.email()
    where id = p_transfer_id;

  return true;
end;
$$;
-- Эдгээр хоёр нь зөвхөн is_admin()-ийг амжилттай давсан authenticated админд л
-- бодитоор ажилладаг ч, өмнө нь EXECUTE эрх анон/public-д ч нээлттэй үлдсэн
-- байсныг (2026-11-23 аудитаар олдсон) энд цэгцэлж байна.
revoke all on function public.admin_receive_transfer(bigint), public.admin_reject_transfer(bigint) from public, anon;
grant execute on function public.admin_receive_transfer(bigint), public.admin_reject_transfer(bigint) to authenticated;

-- Захиалга/сургалтын бүртгэлийг утасны дугаараар шалгах, хугацаа хэтэрсэн
-- төлбөргүй захиалгыг чөлөөлөх (admin-panel.html-ийн "Сонсох" бус харин
-- OrderTrackingPage/TrainingStatusPage-ээс дуудагддаг нийтийн функцууд).
create or replace function public.expire_stale_orders() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_item record;
begin
  for v_order in
    select order_number from orders
    where payment_status = 'unpaid' and status = 'pending'
      and created_at < now() - interval '30 minutes'
    for update skip locked
  loop
    for v_item in select product_id, option_type, qty from order_items where order_number = v_order.order_number loop
      perform restore_stock(v_item.product_id, v_item.option_type, v_item.qty);
    end loop;
    update orders set status = 'cancelled' where order_number = v_order.order_number;
  end loop;
end;
$$;
revoke all on function public.expire_stale_orders() from public, anon;
grant execute on function public.expire_stale_orders() to authenticated;

create or replace function public.lookup_orders_by_phone(p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  perform expire_stale_orders();
  select coalesce(jsonb_agg(order_json order by created_at desc), '[]'::jsonb) into result from (
    select o.created_at, jsonb_build_object(
      'orderNumber', o.order_number, 'status', o.status, 'subtotal', o.subtotal,
      'deliveryMethod', o.delivery_method, 'deliveryFee', o.delivery_fee,
      'receiptType', o.receipt_type, 'registerNumber', o.register_number,
      'boxCount', o.box_count, 'createdAt', o.created_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'productName', i.product_name, 'optionLabel', i.option_label, 'qty', i.qty, 'lineTotal', i.line_total
        )) from order_items i where i.order_number = o.order_number
      ), '[]'::jsonb)
    ) as order_json
    from orders o
    where o.phone = p_phone and o.status not in ('handed_over', 'done')
  ) sub;
  return result;
end;
$$;
grant execute on function public.lookup_orders_by_phone(text) to anon, authenticated;

create or replace function public.lookup_training_by_phone(p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'trainingDate', r.training_date,
    'paymentStatus', r.payment_status,
    'createdAt', r.created_at
  ) order by r.training_date desc), '[]'::jsonb)
  into result
  from training_registrations r
  where r.phone = trim(p_phone);
  return result;
end;
$$;
grant execute on function public.lookup_training_by_phone(text) to anon, authenticated;

-- Хуучин сургалтын систем (admin-ээс гараар өдөр нэмдэг training_sessions
-- болохоос өмнөх хувилбар) — ямар ч клиент код дуудахгүй болсон тул устгав.
drop function if exists public.register_training(text, text, date);
drop function if exists public.training_slots(date[]);
-- END 2026-11-23 audit consolidation.

-- ---------------------------------------------------------------------
-- 17) unified_stock бараанд box_per_box-ийг дараа нь өөрчилсөн (жишээ нь
-- "1 хайрцагт хэдэн ширхэг"-ийг зөв тоогоор засах зэрэг) тохиолдолд
-- warehouse_box_stock/box_stock хуучин (box_per_box-ийн өмнөх утгаар
-- тооцоологдсон) утгаараа үлдэж, бодит ширхэгийн нөөцтэйгээ нийцгүй болдог
-- (admin-ийн бараа засах форм эдгээр баганыг шууд өөрчилдөггүй — зөвхөн
-- decrement_stock/admin_receive_transfer л тэдгээрийг ширхэгээс дахин
-- тооцдог тул box_per_box өөрчлөгдсөн мөч дээр л тэдгээр дуудагдаагүй бол
-- хуучин утга хэвээр үлдэнэ). Аюулгүй, идемпотент дахин тооцоолол тул
-- run-all-updates ажиллуулах бүрт автоматаар зассан хэвээр байлгана
-- (2026-11-23 Aloe Ade-ийн "Илгээх" алдааны аудитаар олдсон, 25 бараанд
-- нөлөөлж байсан).
-- ---------------------------------------------------------------------
update public.products set warehouse_box_stock = floor(coalesce(warehouse_unit_stock,0)::numeric / box_per_box)
  where unified_stock and coalesce(box_per_box,0) > 0
  and warehouse_box_stock is distinct from floor(coalesce(warehouse_unit_stock,0)::numeric / box_per_box);
update public.products set box_stock = floor(coalesce(unit_stock,0)::numeric / box_per_box)
  where unified_stock and coalesce(box_per_box,0) > 0
  and box_stock is distinct from floor(coalesce(unit_stock,0)::numeric / box_per_box);

notify pgrst, 'reload schema';
commit;

-- The full query should finish with this result row, not just an empty Success message.
select
  'run-all-updates: training schedule ready' as update_status,
  to_regclass('public.training_sessions')::text as training_table,
  to_regprocedure('public.register_scheduled_training(text,text,date,uuid)')::text as registration_function,
  has_table_privilege('authenticated', 'public.training_sessions', 'INSERT,UPDATE') as admin_table_access,
  (select changed_products from public.stock_topup_runs where operation='approved-even-topup-2026-10-06') as stock_topup_products;

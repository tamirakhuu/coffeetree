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

create or replace function is_admin() returns boolean as $$
  select exists(select 1 from admins where email = auth.email());
$$ language sql security definer stable;
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
-- 5) Захиалга өгөхөд барааны нөөцөөс хасах функц
-- ---------------------------------------------------------------------
-- ⚠️ Буцаах утга (void/boolean) хувилбар хооронд шилжсэн байж болзошгүй тул
-- (доор 15-р алхамд дахин тодорхойлогдоно) create or replace хийхээсээ өмнө
-- эхлээд заавал drop хийнэ — Postgres буцаах төрлийг create or replace-ээр
-- өөрчлүүлдэггүй тул үгүй бол алдаа өгнө
drop function if exists decrement_stock(bigint, text, int);

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
-- 8) is_admin()-г том/жижиг үсэг үл хамааран шалгадаг болгож найдвартай
--    болгох (заавал сүүлд байрлана — өмнөх бүх policy үүнийг ашиглана)
--    + storage bucket-ийн зурган upload/устгах policy-г мөн чангатгах
-- ---------------------------------------------------------------------
create or replace function is_admin() returns boolean as $$
  select exists(select 1 from admins where lower(email) = lower(auth.email()));
$$ language sql security definer stable;
grant execute on function is_admin() to authenticated, anon;

drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;
create policy "admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());
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

-- ⚠️ Хуучин decrement_stock(void) функцийг устгаад буцаах утгатай (boolean)
-- хувилбараар сольж байгаа тул эхлээд хуучныг нь тодорхой drop хийнэ
-- (Postgres нь create or replace-ээр буцаах утгын төрлийг өөрчилдөггүй)
drop function if exists decrement_stock(bigint, text, int);

-- Захиалга баталгаажихаас ӨМНӨ нөөцийг атомикаар шалгаж хасна (нэг SQL
-- UPDATE ... WHERE stock >= qty бүхэлдээ нэг мөрөнд түгжигддэг тул 2 хүн
-- сүүлийн ширхэгийг зэрэг авах гэвэл зөвхөн нэг нь амжина). Хангалттай
-- нөөцгүй бол false буцаана — дуудсан тал захиалгаа үүсгэхгүй.
create or replace function decrement_stock(p_product_id bigint, p_option_type text, p_qty int)
returns boolean as $$
declare
  v_unified boolean;
  v_per_box int;
  v_new_unit int;
begin
  select unified_stock, box_per_box into v_unified, v_per_box from products where id = p_product_id for update;
  if v_unified and coalesce(v_per_box, 0) > 0 then
    -- Нэгдсэн нөөцтэй бараа: хайрцгаар авсан ч гэсэн бодит үлдэгдэл нь
    -- ширхэгээр хадгалагддаг тул unit_stock-оос хасаад, box_stock-ыг
    -- түүнээс нь дахин (floor) тооцно
    if p_option_type = 'box' then
      update products set unit_stock = unit_stock - (p_qty * v_per_box)
        where id = p_product_id and unit_stock >= p_qty * v_per_box
        returning unit_stock into v_new_unit;
    else
      update products set unit_stock = unit_stock - p_qty
        where id = p_product_id and unit_stock >= p_qty
        returning unit_stock into v_new_unit;
    end if;
    if v_new_unit is null then return false; end if;
    update products set box_stock = v_new_unit / v_per_box where id = p_product_id;
    return true;
  else
    if p_option_type = 'box' then
      update products set box_stock = box_stock - p_qty where id = p_product_id and box_stock >= p_qty;
    else
      update products set unit_stock = unit_stock - p_qty where id = p_product_id and unit_stock >= p_qty;
    end if;
    return found;
  end if;
end;
$$ language plpgsql security definer;
grant execute on function decrement_stock(bigint, text, int) to authenticated, anon;

-- Захиалга үүсгэх (эсвэл дараагийн бараа хангалтгүй болж цуцлах) явцад
-- аль хэдийн амжилттай хассан нөөцөө буцаах rollback функц
create or replace function restore_stock(p_product_id bigint, p_option_type text, p_qty int)
returns void as $$
declare
  v_unified boolean;
  v_per_box int;
  v_new_unit int;
begin
  select unified_stock, box_per_box into v_unified, v_per_box from products where id = p_product_id for update;
  if v_unified and coalesce(v_per_box, 0) > 0 then
    if p_option_type = 'box' then
      update products set unit_stock = unit_stock + (p_qty * v_per_box) where id = p_product_id returning unit_stock into v_new_unit;
    else
      update products set unit_stock = unit_stock + p_qty where id = p_product_id returning unit_stock into v_new_unit;
    end if;
    update products set box_stock = v_new_unit / v_per_box where id = p_product_id;
  else
    if p_option_type = 'box' then
      update products set box_stock = box_stock + p_qty where id = p_product_id;
    else
      update products set unit_stock = unit_stock + p_qty where id = p_product_id;
    end if;
  end if;
end;
$$ language plpgsql security definer;
grant execute on function restore_stock(bigint, text, int) to authenticated, anon;

-- ---------------------------------------------------------------------
-- 15) Ангиллын дүрсийг custom SVG-тэй тохируулсан шинэ түлхүүрүүд рүү
--     шилжүүлэх (нэрээр таарч байвал л шинэчилнэ, шинээр нэмсэн ангилал
--     дээр нөлөөлөхгүй)
-- ---------------------------------------------------------------------
update categories set icon = 'CoffeeBean' where name = 'Кофе';
update categories set icon = 'Syrup' where name = 'Сироп';
update categories set icon = 'Sauce' where name = 'Соус';
update categories set icon = 'Powder' where name = 'Нунтаг';
update categories set icon = 'Smoothie' where name = 'Смүүти';
update categories set icon = 'TeaLeaf' where name = 'Цай';

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

-- ---------------------------------------------------------------------
-- 15) Хэрэглэгчийн хуудсан дээр нөөц бууруулахад refresh хийхгүйгээр
--     realtime-р шинэчлэгддэг болгох (Supabase Realtime-г products
--     хүснэгтэд асаах)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table products;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 16) "Нэг удаа" ангиллын дүрсийг paper-cup SVG-тэй тохируулах
-- ---------------------------------------------------------------------
update categories set icon = 'PaperCup' where name = 'Нэг удаа';

-- ---------------------------------------------------------------------
-- 17) "Нэг удаа" ангиллын дэд ангилал (ТӨРӨЛ шүүлтүүрт харагдана) —
--     script-ийг дахин ажиллуулахад давхардуулахгүйн тулд эхлээд цэвэрлээд
--     шинээр оруулна (admin panel-ийн "Ангилал засах" хадгалах логиктой адил)
-- ---------------------------------------------------------------------
delete from subcategories where category_id = (select id from categories where name = 'Нэг удаа');
insert into subcategories (category_id, name)
  select id, s.name from categories, unnest(array[
    'Хүйтний аяга', 'Давхар аяга', 'Дан аяга', 'Зайрмаг / Десерт аяга',
    'Соруул', 'Салфетка', 'Takeaway/Sleeve'
  ]) as s(name) where categories.name = 'Нэг удаа';

-- =====================================================================
-- Дууслаа. Шинэ admin имэйл нэмэхийг admin-add.sql-аас тусад нь хийнэ
-- (тэнд өөрийн имэйлээ бичих шаардлагатай тул энд оруулаагүй).
-- =====================================================================

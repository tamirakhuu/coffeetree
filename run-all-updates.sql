-- =====================================================================
-- CUPPA — бүх нэмэлт өөрчлөлтийг нэгтгэсэн, ДАВХАР АЖИЛЛУУЛЖ БОЛДОГ script
-- =====================================================================
-- Энэ файл нь одоог хүртэл тусад нь бичигдсэн бүх "add-*.sql"/"fix-*.sql"
-- файлуудыг нэг дор нэгтгэсэн. Аль нэгийг нь өмнө нь ажиллуулсан эсэхээ
-- мартсан ч ЗОВЛОНГҮЙ — доорх бүх мөр `if not exists` / `create or replace`
-- / `drop ... if exists` хэлбэртэй тул хэдэн ч удаа ажиллуулсан аюулгүй,
-- одоо байгаа өгөгдлийг устгахгүй.
--
-- ⚠️ Энэ бол supabase-schema.sql биш — тэр файлыг ХЭЗЭЭ Ч дахин бүү
-- ажиллуулаарай (тэр нь бүх хүснэгтийг эхлээд устгадаг). Энэ файл зөвхөн
-- нэмэлт өөрчлөлтүүдийг (ALTER/CREATE OR REPLACE) хийдэг тул аюулгүй.
--
-- Ажиллуулах газар: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) "алдартай" шошготой барааг "эрэлттэй" болгох
-- ---------------------------------------------------------------------
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

-- =====================================================================
-- Дууслаа. Шинэ admin имэйл нэмэхийг admin-add.sql-аас тусад нь хийнэ
-- (тэнд өөрийн имэйлээ бичих шаардлагатай тул энд оруулаагүй).
-- =====================================================================

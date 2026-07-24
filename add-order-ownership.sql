-- =====================================================================
-- 1) "admin" эрхийг зөв тодорхойлох (одоогоор ямар ч нэвтэрсэн хэрэглэгч
--    "authenticated" тул бусдын захиалга/бараа зэргийг засах боломжтой
--    байсан цоорхойг таглана) + хэрэглэгч зөвхөн өөрийн захиалгаа хардаг
--    болгох. Одоо байгаа Supabase өгөгдлийг устгахгүйгээр ажиллана:
--    Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---- admins хүснэгт: зөвхөн энд байгаа имэйл хаяг admin эрхтэй болно ----
create table if not exists admins (
  email text primary key
);
alter table admins enable row level security;
-- Уншихыг ч гэсэн хаана: admin эсэхийг зөвхөн is_admin() функцээр шалгана
insert into admins (email) values ('cuppabrandmanager@gmail.com')
on conflict (email) do nothing;

-- ---- admin эсэхийг найдвартай шалгах функц (RLS доторх admins-ийг ---
-- ---- уншихдаа өөрийн эрхээр биш, функцийн эзэмшигчийн эрхээр уншина) ----
create or replace function is_admin() returns boolean as $$
  select exists(select 1 from admins where email = auth.email());
$$ language sql security definer stable;
grant execute on function is_admin() to authenticated, anon;

-- ---- orders: хэрэглэгчийг холбох user_id багана ----
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;

-- =====================================================================
-- 2) RLS policy-г "auth.role()='authenticated'" (хэн ч болно) байснаас
--    "is_admin()" (зөвхөн admins хүснэгтэд байгаа имэйл) болгож чангатгана
-- =====================================================================
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

-- ---- orders: admin бүгдийг, хэрэглэгч зөвхөн өөрийнхөө захиалгыг харна ----
drop policy if exists "admin read orders" on orders;
drop policy if exists "admin update orders" on orders;
drop policy if exists "admin delete orders" on orders;
create policy "admin read orders" on orders for select using (is_admin());
create policy "user read own orders" on orders for select using (user_id = auth.uid());
create policy "admin update orders" on orders for update using (is_admin());
create policy "admin delete orders" on orders for delete using (is_admin());

-- ---- order_items: admin бүгдийг, хэрэглэгч зөвхөн өөрийн захиалгынхыг харна ----
drop policy if exists "admin read order_items" on order_items;
drop policy if exists "admin delete order_items" on order_items;
create policy "admin read order_items" on order_items for select using (is_admin());
create policy "user read own order_items" on order_items for select using (
  exists (select 1 from orders o where o.order_number = order_items.order_number and o.user_id = auth.uid())
);
create policy "admin delete order_items" on order_items for delete using (is_admin());

-- =====================================================================
-- Барааны зургийн storage bucket-ийн policy-г "auth.role()='authenticated'"
-- (хэн ч нэвтэрсэн бол болно) байснаас "is_admin()" болгож чангатгана.
-- add-order-ownership.sql-г ажиллуулсны дараа л ажиллуулна (is_admin()
-- функц шаардлагатай). Одоо байгаа Supabase өгөгдлийг устгахгүй:
-- Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;

create policy "admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());

create policy "admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

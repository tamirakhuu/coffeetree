-- =====================================================================
-- is_admin() функцийг том/жижиг үсэг үл хамааран (case-insensitive)
-- имэйл харьцуулдаг болгож найдвартай болгоно — зарим тохиолдолд
-- auth.email() болон admins.email өөр том/жижиг үсгээр хадгалагдсанаас
-- шалтгаалж "is_admin()" буруу false буцаадаг асуудлыг засна.
-- Одоо байгаа өгөгдлийг устгахгүй: Supabase Dashboard → SQL Editor →
-- New query → Run
-- =====================================================================
create or replace function is_admin() returns boolean as $$
  select exists(select 1 from admins where lower(email) = lower(auth.email()));
$$ language sql security definer stable;
grant execute on function is_admin() to authenticated, anon;

-- Storage policy-г найдвартай дахин тавина (аль хэдийн байгаа бол ялгаагүй)
drop policy if exists "admin upload product images" on storage.objects;
drop policy if exists "admin delete product images" on storage.objects;

create policy "admin upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and is_admin());

create policy "admin delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and is_admin());

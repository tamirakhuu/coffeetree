-- =====================================================================
-- Шинэ брэнд нэмэх — одоо байгаа Supabase өгөгдлийг устгахгүйгээр
-- ажиллуулна: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================
insert into brands (name) values
  ('Pomona'),
  ('Taco'),
  ('Daeho'),
  ('Sweet Page'),
  ('Nature Tea')
on conflict (name) do nothing;

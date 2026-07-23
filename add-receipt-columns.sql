-- =====================================================================
-- И-баримт (хувь хүн/байгууллага) талбарууд нэмэх — одоо байгаа Supabase
-- өгөгдлийг устгахгүйгээр ажиллана: Supabase Dashboard → SQL Editor →
-- New query → Run
-- =====================================================================
alter table orders add column if not exists receipt_type text default 'individual';
alter table orders add column if not exists register_number text;

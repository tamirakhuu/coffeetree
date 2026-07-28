-- =====================================================================
-- Хүргэлтийн хэлбэр (очиж авах / хүргүүлэх) болон хураамжийг хадгалах
-- багана нэмэх — одоо байгаа Supabase өгөгдлийг устгахгүйгээр ажиллана:
-- Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================
alter table orders add column if not exists delivery_method text default 'pickup'; -- pickup | delivery
alter table orders add column if not exists delivery_fee numeric default 0;

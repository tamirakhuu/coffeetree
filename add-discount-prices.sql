
-- unit_price/box_price нь ХЯМДРАЛТАЙ (одоо зарж буй) үнэ хэвээр үлдэнэ.
-- unit_original_price/box_original_price нь хямдрахаас өмнөх үнэ — зөвхөн
-- хямдралтай бараанд бөглөнө, бусад бараанд хоосон (NULL) байна.
-- =====================================================================
alter table products add column if not exists unit_original_price numeric;
alter table products add column if not exists box_original_price numeric;

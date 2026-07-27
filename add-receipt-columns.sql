alter table orders add column if not exists receipt_type text default 'individual';
alter table orders add column if not exists register_number text;

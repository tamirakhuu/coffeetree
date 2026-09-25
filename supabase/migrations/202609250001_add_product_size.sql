-- Add optional, manually entered size without changing existing product data.
alter table public.products add column if not exists size text;
notify pgrst, 'reload schema';

-- "Захиалгаа хянах" хуудасны нууцлалын засвар: lookup_orders_by_phone нь зөвхөн
-- orderNumber, status, deliveryMethod, createdAt-ийг буцаадаг болгов (бараа, дүн,
-- хаягийн хураамж, байгууллагын регистрийн дугаар, хайрцагны тоог хассан).
-- Supabase SQL Editor дээр шууд ажиллуулж болно.

-- Утасны дугаараар хэн ч эрхийн шалгалтгүй дуудна (anon): энд хувийн мэдээлэл бүү нэм
-- (бараа, дүн, хаяг, байгууллагын регистрийн дугаар зэрэг) — зөвхөн захиалгын төлөв харуулна.
create or replace function public.lookup_orders_by_phone(p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  perform expire_stale_orders();
  select coalesce(jsonb_agg(order_json order by created_at desc), '[]'::jsonb) into result from (
    select o.created_at, jsonb_build_object(
      'orderNumber', o.order_number, 'status', o.status,
      'deliveryMethod', o.delivery_method, 'createdAt', o.created_at
    ) as order_json
    from orders o
    where o.phone = p_phone and o.status not in ('handed_over', 'done')
  ) sub;
  return result;
end;
$$;
grant execute on function public.lookup_orders_by_phone(text) to anon, authenticated;

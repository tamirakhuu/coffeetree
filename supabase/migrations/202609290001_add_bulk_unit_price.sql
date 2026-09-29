-- Apply before deploying the admin and storefront changes.
-- Preserves existing products and replaces submit_order with the repository version.
begin;
alter table public.products add column if not exists bulk_unit_price numeric
  check (bulk_unit_price is null or bulk_unit_price > 0);

  create or replace function submit_order(
    p_customer_name text, p_phone text, p_address text, p_receipt_type text,
    p_register_number text, p_delivery_method text, p_items jsonb
  ) returns jsonb
  language plpgsql security definer as $function$
  declare
    v_order_number text;
    v_item jsonb;
    v_product products%rowtype;
    v_qty int;
    v_option_type text;
    v_note text;
    v_current_price numeric;
    v_box_price numeric;
    v_line_total numeric;
    v_subtotal numeric := 0;
    v_delivery_method text;
    v_delivery_fee numeric := 0;
    v_ok boolean;
    v_discount_expired boolean;
    v_label text;
    v_item_rows jsonb := '[]'::jsonb;
    v_attempts int := 0;
  begin
    if p_items is null or jsonb_array_length(p_items) = 0 then
      raise exception 'Сагс хоосон байна.';
    end if;
    if p_phone is null or length(trim(p_phone)) = 0 then
      raise exception 'Утасны дугаар оруулна уу.';
    end if;

    v_delivery_method := case when p_delivery_method = 'delivery' then 'delivery' else 'pickup' end;

    for v_item in select * from jsonb_array_elements(p_items) loop
      v_option_type := v_item->>'option_type';
      v_qty := (v_item->>'qty')::int;
      v_note := v_item->>'note';
      if v_option_type not in ('unit','box') or v_qty is null or v_qty <= 0 or v_qty > 1000 then
        raise exception 'Буруу барааны мэдээлэл.';
      end if;

      select * into v_product from products where id = (v_item->>'product_id')::bigint;
      if not found then
        raise exception 'Бараа олдсонгүй.';
      end if;

      v_discount_expired := v_product.tag = 'хямдралтай' and v_product.discount_ends_at is not null and v_product.discount_ends_at <= now();
      v_box_price := case when v_discount_expired then coalesce(v_product.box_original_price, v_product.box_price) else v_product.box_price end;

      if v_option_type = 'unit' then
        v_current_price := case when v_discount_expired then coalesce(v_product.unit_original_price, v_product.unit_price) else v_product.unit_price end;
      else
        v_current_price := v_box_price;
      end if;

      if v_option_type = 'unit' and coalesce(v_product.bulk_qty, 0) > 0 and coalesce(v_product.bulk_unit_price, 0) > 0 and v_qty >= v_product.bulk_qty then
        v_current_price := v_product.bulk_unit_price;
        v_line_total := round(v_current_price * v_qty);
      elsif v_option_type = 'unit' and coalesce(v_product.bulk_qty, 0) > 0 and coalesce(v_box_price, 0) > 0 and coalesce(v_product.box_per_box, 0) > 0 and v_qty >= v_product.bulk_qty then
        v_line_total := round((v_box_price / v_product.box_per_box) * v_qty);
      else
        v_line_total := v_current_price * v_qty;
      end if;

      v_ok := decrement_stock(v_product.id, v_option_type, v_qty);
      if not v_ok then
        raise exception '"%" барааны нөөц дууссан байна. Сагсаа шинэчилж дахин оролдоно уу.', v_product.name;
      end if;

      v_subtotal := v_subtotal + v_line_total;
      v_label := case when v_option_type = 'unit' then v_product.unit_label else v_product.box_label end;
      if v_note is not null and length(v_note) > 0 then
        v_label := v_label || ' · ' || v_note;
      end if;

      v_item_rows := v_item_rows || jsonb_build_object('product_id', v_product.id, 'product_name', v_product.name, 'option_type', v_option_type, 'option_label', v_label, 'unit_price', v_current_price, 'qty', v_qty, 'line_total', v_line_total);
    end loop;

    v_delivery_fee := case when v_delivery_method = 'delivery' and v_subtotal < 500000 then 15000 else 0 end;

    -- Захиалгын дугаар (санамсаргүй 6 оронтой тоо, 900,000 хослол) мөргөлдвөл
    -- шинэ дугаараар дахин оролдоно — захиалгын тоо олширох тусам мөргөлдөх
    -- магадлал өсдөг тул урьдчилан хамгаална.
    loop
      v_order_number := 'CP' || floor(100000 + random() * 900000)::int::text;
      begin
        insert into orders (order_number, user_id, customer_name, phone, address, subtotal, status, receipt_type, register_number, delivery_method, delivery_fee)
        values (v_order_number, null, p_customer_name, p_phone, case when v_delivery_method = 'delivery' then p_address else null end, v_subtotal, 'pending', coalesce(p_receipt_type, 'individual'), case when p_receipt_type = 'company' then p_register_number else null end, v_delivery_method, v_delivery_fee);
        exit;
      exception when unique_violation then
        v_attempts := v_attempts + 1;
        if v_attempts >= 5 then
          raise exception 'Захиалгын дугаар үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.';
        end if;
      end;
    end loop;

    insert into order_items (order_number, product_id, product_name, option_type, option_label, unit_price, qty, line_total)
    select v_order_number, (r->>'product_id')::bigint, r->>'product_name', r->>'option_type', r->>'option_label', (r->>'unit_price')::numeric, (r->>'qty')::int, (r->>'line_total')::numeric
    from jsonb_array_elements(v_item_rows) r;

    return jsonb_build_object('orderNumber', v_order_number, 'subtotal', v_subtotal, 'deliveryFee', v_delivery_fee);
  end;
  $function$;

notify pgrst, 'reload schema';
commit;

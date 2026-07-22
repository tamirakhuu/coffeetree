import { supabase } from "./supabaseClient.js";

function shapeProduct(r) {
  return {
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id, sub: r.subcategory,
    origin: r.origin, tag: r.tag, color: r.color, desc: r.description, images: r.images || [],
    unit: { label: r.unit_label, price: r.unit_price, stock: r.unit_stock },
    box: { label: r.box_label, price: r.box_price, perBox: r.box_per_box, stock: r.box_stock },
  };
}

// Ангилал, брэнд, бараа — бүгд нээлттэй уншигддаг (public read RLS policy)
export async function fetchBootstrap() {
  const [{ data: categories, error: ce }, { data: subcategories, error: se },
         { data: brands, error: be }, { data: products, error: pe }] = await Promise.all([
    supabase.from("categories").select("*").order("id"),
    supabase.from("subcategories").select("*"),
    supabase.from("brands").select("*").order("id"),
    supabase.from("products").select("*").order("id", { ascending: false }),
  ]);
  const err = ce || se || be || pe;
  if (err) throw new Error(err.message);

  const cats = categories.map((c) => ({
    id: c.id, name: c.name, icon: c.icon,
    sub: subcategories.filter((s) => s.category_id === c.id).map((s) => s.name),
  }));
  return { categories: cats, brands, products: products.map(shapeProduct) };
}

// Захиалга үүсгэх — нэвтрээгүй хэрэглэгч ч гэсэн бичиж болно (public insert policy)
export async function submitOrder({ form, cart, products }) {
  const orderNumber = "CP" + Math.floor(100000 + Math.random() * 900000);
  const subtotal = cart.reduce((sum, item) => {
    const p = products.find((x) => x.id === item.productId);
    return p ? sum + p[item.optionType].price * item.qty : sum;
  }, 0);

  const { error: orderErr } = await supabase.from("orders").insert({
    order_number: orderNumber,
    customer_name: form.name,
    phone: form.phone,
    address: form.address,
    subtotal,
    status: "pending",
  });
  if (orderErr) throw new Error(orderErr.message);

  const itemRows = cart.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    const option = p[item.optionType];
    return {
      order_number: orderNumber,
      product_id: p.id,
      product_name: p.name,
      option_type: item.optionType,
      option_label: option.label,
      unit_price: option.price,
      qty: item.qty,
      line_total: option.price * item.qty,
    };
  });
  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) throw new Error(itemsErr.message);

  return orderNumber;
}

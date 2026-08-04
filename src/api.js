import { supabase } from "./supabaseClient.js";

function shapeProduct(r) {
  return {
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id, sub: r.subcategory,
    origin: r.origin, tag: r.tag, color: r.color, desc: r.description, images: r.images || [],
    unit: { label: r.unit_label, price: r.unit_price, originalPrice: r.unit_original_price, stock: r.unit_stock },
    box: { label: r.box_label, price: r.box_price, originalPrice: r.box_original_price, perBox: r.box_per_box, stock: r.box_stock },
  };
}

// Зарим ангиллын барааг ширхэгээр авахад, тоо нь хайрцгийн хэмжээнд хүрвэл
// (жишээ нь Нунтаг 12ш, Сироп 6ш) илүү хямд хайрцгийн үнээр автоматаар
// тооцно — хэрэглэгч тусгайлан "Хайрцгаар" сонголт хийх шаардлагагүй.
export const BULK_BOX_QTY = { "Нунтаг": 12, "Сироп": 6 };

export function computeLineTotal(product, categoryName, optionType, qty) {
  if (optionType === "unit") {
    const boxQty = BULK_BOX_QTY[categoryName];
    if (boxQty && product.box?.price > 0 && qty >= boxQty) {
      const boxes = Math.floor(qty / boxQty);
      const rem = qty % boxQty;
      return boxes * product.box.price + rem * product.unit.price;
    }
  }
  return product[optionType].price * qty;
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

// Захиалга үүсгэх — нэвтэрсэн хэрэглэгчийн хийсэн захиалга л дараа нь
// "Миний захиалгууд" хэсэгт харагдана (user_id-гаар холбоно)
export async function submitOrder({ form, cart, products, categories, userId }) {
  const orderNumber = "CP" + Math.floor(100000 + Math.random() * 900000);
  // Сагсанд байгаа ч устгагдсан/олдохгүй болсон бараа байвал алгасна
  const validItems = cart
    .map((item) => ({ item, product: products.find((x) => x.id === item.productId) }))
    .filter(({ product }) => product);

  const catNameById = new Map((categories || []).map((c) => [c.id, c.name]));
  const lineTotalFor = (item, product) =>
    computeLineTotal(product, catNameById.get(product.categoryId), item.optionType, item.qty);

  const subtotal = validItems.reduce((sum, { item, product }) => sum + lineTotalFor(item, product), 0);
  const deliveryMethod = form.deliveryMethod === "delivery" ? "delivery" : "pickup";
  const deliveryFee = deliveryMethod === "delivery" ? 15000 : 0;

  const { error: orderErr } = await supabase.from("orders").insert({
    order_number: orderNumber,
    user_id: userId || null,
    customer_name: form.name,
    phone: form.phone,
    address: deliveryMethod === "delivery" ? form.address : null,
    subtotal,
    status: "pending",
    receipt_type: form.receiptType || "individual",
    register_number: form.receiptType === "company" ? form.registerNumber : null,
    delivery_method: deliveryMethod,
    delivery_fee: deliveryFee,
  });
  if (orderErr) throw new Error(orderErr.message);

  const itemRows = validItems.map(({ item, product }) => {
    const option = product[item.optionType];
    return {
      order_number: orderNumber,
      product_id: product.id,
      product_name: product.name,
      option_type: item.optionType,
      option_label: option.label,
      unit_price: option.price,
      qty: item.qty,
      line_total: lineTotalFor(item, product),
    };
  });
  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) throw new Error(itemsErr.message);

  // Барааны нөөцөөс хасах — захиалга аль хэдийн үүссэн тул алдаа гарсан ч
  // захиалгыг цуцлахгүй, зөвхөн log хийж өнгөрнө
  await Promise.all(validItems.map(({ item, product }) =>
    supabase.rpc("decrement_stock", { p_product_id: product.id, p_option_type: item.optionType, p_qty: item.qty })
      .then(({ error }) => { if (error) console.error("Нөөц хасахад алдаа гарлаа:", error.message); })
  ));

  return orderNumber;
}

// Нэвтэрсэн хэрэглэгчийн өөрийн захиалгуудыг татах (RLS-ээр автоматаар шүүгдэнэ)
export async function fetchMyOrders() {
  const [{ data: orders, error: oe }, { data: items, error: ie }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("order_items").select("*"),
  ]);
  const err = oe || ie;
  if (err) throw new Error(err.message);
  return orders.map((o) => ({
    orderNumber: o.order_number,
    status: o.status,
    subtotal: o.subtotal,
    receiptType: o.receipt_type,
    registerNumber: o.register_number,
    deliveryMethod: o.delivery_method,
    deliveryFee: o.delivery_fee,
    boxCount: o.box_count,
    createdAt: o.created_at,
    items: items.filter((i) => i.order_number === o.order_number).map((i) => ({
      productName: i.product_name, optionLabel: i.option_label, qty: i.qty, lineTotal: i.line_total,
    })),
  }));
}

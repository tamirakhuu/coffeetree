import { supabase } from "./supabaseClient.js";

export const DELIVERY_FEE = 15000;
export const FREE_DELIVERY_THRESHOLD = 500000;

export function shapeProduct(r) {
  return {
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id, sub: r.subcategory,
    origin: r.origin, tag: r.tag, color: r.color, desc: r.description, images: r.images || [],
    discountEndsAt: r.discount_ends_at || null,
    unit: { label: r.unit_label, price: r.unit_price, originalPrice: r.unit_original_price, stock: r.warehouse_unit_stock },
    box: { label: r.box_label, price: r.box_price, originalPrice: r.box_original_price, perBox: r.box_per_box, stock: r.warehouse_box_stock },
    bulkQty: r.bulk_qty || null,
  };
}

// Барааг ширхэгээр авахад, тоо нь тухайн барааны "бөөний тоо"-нд хүрвэл
// (админ бараа бүрээр тохируулдаг — жишээ нь FORTE кофе 3ш, сироп 6ш,
// нэг удаагийн аяга 1000ш гэх мэт өөр өөр байдаг) хайрцгийн нэгжийн үнээр
// (box_price / box_per_box) бүх ширхэгийг нь автоматаар тооцно.
export function computeLineTotal(product, optionType, qty) {
  if (optionType === "unit") {
    const boxQty = product.bulkQty;
    if (boxQty && product.box?.price > 0 && product.box?.perBox > 0 && qty >= boxQty) {
      const bulkUnitPrice = product.box.price / product.box.perBox;
      return Math.round(bulkUnitPrice * qty);
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
    supabase.from("brands").select("*"),
    supabase.from("products").select("*").order("id", { ascending: false }),
  ]);
  const err = ce || se || be || pe;
  if (err) throw new Error(err.message);

  const cats = categories.map((c) => ({
    id: c.id, name: c.name, icon: c.icon, tileImage: c.tile_image,
    sub: subcategories.filter((s) => s.category_id === c.id).map((s) => s.name),
  }));
  const sortedBrands = [...brands].sort((a, b) => a.name.localeCompare(b.name));
  return { categories: cats, brands: sortedBrands, products: products.map(shapeProduct) };
}

// Аль хэдийн амжилттай хассан нөөцийг буцаах (захиалга цуцлагдах үед)
async function rollbackReserved(reserved) {
  await Promise.all(reserved.map(({ item, product }) =>
    supabase.rpc("restore_stock", { p_product_id: product.id, p_option_type: item.optionType, p_qty: item.qty })
      .then(({ error }) => { if (error) console.error("Нөөц буцаахад алдаа гарлаа:", error.message); })
  ));
}

// Захиалга үүсгэх — нэвтэрсэн хэрэглэгчийн хийсэн захиалга л дараа нь
// "Миний захиалгууд" хэсэгт харагдана (user_id-гаар холбоно)
export async function submitOrder({ form, cart, products, userId }) {
  const orderNumber = "CP" + Math.floor(100000 + Math.random() * 900000);
  // Сагсанд байгаа ч устгагдсан/олдохгүй болсон бараа байвал алгасна
  const validItems = cart
    .map((item) => ({ item, product: products.find((x) => x.id === item.productId) }))
    .filter(({ product }) => product);
  if (!validItems.length) throw new Error("Сагс хоосон байна.");

  // Захиалга үүсгэхээс ӨМНӨ нөөцийг атомикаар шалгаж хасна (decrement_stock
  // нь SQL дотроо "UPDATE ... WHERE stock >= qty" хэлбэртэй, нэг мөрийг
  // түгжиж хасдаг тул 2 хүн сүүлийн ширхэгийг зэрэг захиалахад зөвхөн нэг
  // нь амжина). Аль нэг бараа дутвал өмнө нь амжилттай хассан зүйлээ буцаагаад
  // захиалга огт үүсгэхгүй.
  const reserved = [];
  for (const entry of validItems) {
    const { item, product } = entry;
    const { data: ok, error } = await supabase.rpc("decrement_stock", {
      p_product_id: product.id, p_option_type: item.optionType, p_qty: item.qty,
    });
    if (error) { await rollbackReserved(reserved); throw new Error(error.message); }
    if (!ok) {
      await rollbackReserved(reserved);
      throw new Error(`"${product.name}" барааны нөөц дууссан байна. Сагсаа шинэчилж дахин оролдоно уу.`);
    }
    reserved.push(entry);
  }

  const lineTotalFor = (item, product) =>
    computeLineTotal(product, item.optionType, item.qty);

  const subtotal = validItems.reduce((sum, { item, product }) => sum + lineTotalFor(item, product), 0);
  const deliveryMethod = form.deliveryMethod === "delivery" ? "delivery" : "pickup";
  const deliveryFee = deliveryMethod === "delivery" && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;

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
  if (orderErr) { await rollbackReserved(reserved); throw new Error(orderErr.message); }

  const itemRows = validItems.map(({ item, product }) => {
    const option = product[item.optionType];
    return {
      order_number: orderNumber,
      product_id: product.id,
      product_name: product.name,
      option_type: item.optionType,
      option_label: item.note ? `${option.label} · ${item.note}` : option.label,
      unit_price: option.price,
      qty: item.qty,
      line_total: lineTotalFor(item, product),
    };
  });
  const { error: itemsErr } = await supabase.from("order_items").insert(itemRows);
  if (itemsErr) {
    // Захиалга аль хэдийн бүртгэгдсэн тул үүнийг бас цуцалж, нөөцөө буцаана
    await supabase.from("orders").delete().eq("order_number", orderNumber);
    await rollbackReserved(reserved);
    throw new Error(itemsErr.message);
  }

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
    paymentStatus: o.payment_status,
    createdAt: o.created_at,
    items: items.filter((i) => i.order_number === o.order_number).map((i) => ({
      productName: i.product_name, optionLabel: i.option_label, qty: i.qty, lineTotal: i.line_total,
    })),
  }));
}

// QPay нэхэмжлэл (invoice) үүсгэх — client_id/client_secret нь Edge Function
// дотор, хэзээ ч browser-т ирдэггүй. QPay мерчант эрх (secrets) тохируулаагүй
// үед Edge Function demo QR буцаадаг тул үүнийг frontend-с ялгаж мэдэх шаардлагагүй.
export async function createQpayInvoice({ orderNumber, amount, description }) {
  const { data, error } = await supabase.functions.invoke("qpay-create-invoice", {
    body: { orderNumber, amount, description },
  });
  if (error) throw new Error(error.message || "QPay нэхэмжлэл үүсгэхэд алдаа гарлаа");
  if (data?.error) throw new Error(data.error);
  return data; // { invoiceId, qrText, qrImage, urls, demo }
}

// Хэрэглэгч QR-аа төлсөн эсэхийг шалгах (checkout дэлгэц 3 секунд тутам polling хийнэ)
export async function checkQpayPayment({ invoiceId, orderNumber }) {
  const { data, error } = await supabase.functions.invoke("qpay-check-payment", {
    body: { invoiceId, orderNumber },
  });
  if (error) throw new Error(error.message || "Төлбөр шалгахад алдаа гарлаа");
  if (data?.error) throw new Error(data.error);
  return data; // { paid, paidAmount, demo }
}

import { supabase } from "./supabaseClient.js";

export const DELIVERY_FEE = 15000;
export const FREE_DELIVERY_THRESHOLD = 500000;

// Хямдралын хугацаа (discount_ends_at) өнгөрсөн бол тухайн барааг цаашид
// "хямдралтай" гэж тооцохгүй — шошгыг унтраагаад, хямдрахаас өмнөх үнээр
// (originalPrice) борлуулна. Аль хэдийн шинэчлэгдсэн (tag аль хэдийн null)
// бол өөрчлөлтгүйгээр буцаана (идемпотент) — fetchBootstrap-с ирэх шинэ
// мөрөнд (shapeProduct дотор), мөн аль хэдийн ачаалагдсан төлөвт (App.jsx-ийн
// цаг тутмын шалгалт, хуудас refresh хийхгүйгээр) хоёуланд нь ашиглагдана.
export function revertExpiredDiscount(p) {
  const expired = p.tag === "хямдралтай" && p.discountEndsAt &&
    new Date(p.discountEndsAt).getTime() <= Date.now();
  if (!expired) return p;
  return {
    ...p,
    tag: null,
    discountEndsAt: null,
    unit: { ...p.unit, price: p.unit.originalPrice || p.unit.price, originalPrice: null },
    box: { ...p.box, price: p.box.originalPrice || p.box.price, originalPrice: null },
  };
}

export function shapeProduct(r) {
  return revertExpiredDiscount({
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id, sub: r.subcategory,
    origin: r.origin, tag: r.tag, color: r.color, desc: r.description, images: r.images || [],
    discountEndsAt: r.discount_ends_at || null,
    unit: { label: r.unit_label, price: r.unit_price, originalPrice: r.unit_original_price, stock: r.warehouse_unit_stock },
    box: { label: r.box_label, price: r.box_price, originalPrice: r.box_original_price, perBox: r.box_per_box, stock: r.warehouse_box_stock },
    bulkQty: r.bulk_qty || null,
  });
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

// Захиалга үүсгэх — үнэ, нөөцийн шалгалт, бичилт бүгд submit_order гэсэн
// SECURITY DEFINER функц дотор серверийн талд л хийгддэг (нэг транзакц тул
// аль нэг алхам алдвал бүгд автоматаар буцна). Клиент зөвхөн product_id/
// option_type/qty дамжуулна, үнийг сервер өөрөө products хүснэгтээс уншиж
// тооцдог тул захиалгын дүнг client талаас хуурамчаар өөрчлөх боломжгүй.
export async function submitOrder({ form, cart, products }) {
  // Сагсанд байгаа ч устгагдсан/олдохгүй болсон бараа байвал алгасна
  const validItems = cart
    .map((item) => ({ item, product: products.find((x) => x.id === item.productId) }))
    .filter(({ product }) => product);
  if (!validItems.length) throw new Error("Сагс хоосон байна.");

  const { data, error } = await supabase.rpc("submit_order", {
    p_customer_name: form.name,
    p_phone: form.phone,
    p_address: form.deliveryMethod === "delivery" ? form.address : null,
    p_receipt_type: form.receiptType || "individual",
    p_register_number: form.receiptType === "company" ? form.registerNumber : null,
    p_delivery_method: form.deliveryMethod === "delivery" ? "delivery" : "pickup",
    p_items: validItems.map(({ item }) => ({
      product_id: item.productId, option_type: item.optionType, qty: item.qty, note: item.note || null,
    })),
  });
  if (error) throw new Error(error.message);
  return data; // { orderNumber, subtotal, deliveryFee }
}

// Хэрэглэгч бүртгэлгүйгээр утасны дугаараараа захиалгаа хайж хянах —
// lookup_orders_by_phone нь SECURITY DEFINER тул RLS-ийг тойрч, зөвхөн
// идэвхтэй (хүлээлгэн өгсөн/хүргэгдсэн болоогүй) захиалгуудыг буцаадаг
export async function lookupOrdersByPhone({ phone }) {
  const { data, error } = await supabase.rpc("lookup_orders_by_phone", {
    p_phone: phone.trim(),
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// QPay нэхэмжлэл (invoice) үүсгэх — client_id/client_secret нь Edge Function
// дотор, хэзээ ч browser-т ирдэггүй. Төлбөрийн дүнг Edge Function өөрөө
// orders хүснэгтээс уншдаг тул энд дүн дамжуулах шаардлагагүй (client талаас
// хуурамч дүн илгээж бага мөнгөөр нэхэмжлэл үүсгэх боломжийг хаасан).
// QPay мерчант эрх (secrets) тохируулаагүй үед Edge Function demo QR
// буцаадаг тул үүнийг frontend-с ялгаж мэдэх шаардлагагүй.
export async function createQpayInvoice({ orderNumber, description }) {
  const { data, error } = await supabase.functions.invoke("qpay-create-invoice", {
    body: { orderNumber, description },
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

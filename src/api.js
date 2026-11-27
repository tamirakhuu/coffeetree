import { supabase } from "./supabaseClient.js";
import { compareProductNames, COFFEE_SIZES, POWDER_SIZES, availableOptionTypes } from "./utils/products.js";

export const DELIVERY_FEE = 15000;
export const FREE_DELIVERY_THRESHOLD = 500000;

export function revertExpiredDiscount(p) {
  const expired = p.tag === "хямдралтай" && p.discountEndsAt &&
    new Date(p.discountEndsAt).getTime() <= Date.now();
  if (!expired) return p;
  return {
    ...p,
    tag: null,
    discountEndsAt: null,
    ...Object.fromEntries(Object.keys(COFFEE_SIZES).filter(key => p[key]).map(key => [key,
      { ...p[key], price: p[key].originalPrice || p[key].price, originalPrice: null }])),
    unit: { ...p.unit, price: p.unit.originalPrice || p.unit.price, originalPrice: null },
    box: { ...p.box, price: p.box.originalPrice || p.box.price, originalPrice: null },
  };
}

export function shapeProduct(r) {
  return revertExpiredDiscount({
    hasPowderSizes: !!r.powder_sizes,
    sizeKeys: Object.keys(r.powder_sizes || {}),
    ...Object.fromEntries(Object.entries(r.powder_sizes || {}).map(([key, value]) => [key, {
      label: value.label || POWDER_SIZES[key], price: Number(r.powder_sizes[key].price), stock: Number(r.powder_sizes[key].stock),
      bulkQty: Number(r.powder_sizes[key].bulk_qty), bulkUnitPrice: Number(r.powder_sizes[key].bulk_price),
    }])),
    hasCoffeeSizes: !!r.coffee_sizes,
    ...Object.fromEntries(Object.entries(COFFEE_SIZES).filter(([key]) => r.coffee_sizes?.[key]).map(([key, label]) => [key, {
      label, price: Number(r.coffee_sizes[key].price), stock: Number(r.coffee_sizes[key].stock),
      originalPrice: r.coffee_sizes[key].original_price == null ? null : Number(r.coffee_sizes[key].original_price),
    }])),
    id: r.id, name: r.name, brandId: r.brand_id, categoryId: r.category_id, sub: r.subcategory,
    origin: r.origin, size: r.size || null, tag: r.tag, color: r.color, desc: r.description, images: r.images || [],
    shelfLife: r.shelf_life || null,
    lidOptions: r.lid_options || null,
    extraCategoryId: r.extra_category_id || null, extraSub: r.extra_subcategory || '',
    createdAt: r.created_at || null,
    discountEndsAt: r.discount_ends_at || null,
    unit: { label: r.unit_label, price: r.unit_price, originalPrice: r.unit_original_price, stock: r.web_unit_stock },
    box: { label: r.box_label, price: r.box_price, originalPrice: r.box_original_price, perBox: r.box_per_box, stock: r.web_box_stock },
    bulkQty: r.bulk_qty || null,
    bulkUnitPrice: r.bulk_unit_price == null ? null : Number(r.bulk_unit_price),
  });
}

export function getBulkUnitPrice(product) {
  if (product.bulkUnitPrice > 0) return product.bulkUnitPrice;
  if (product.box?.price > 0 && product.box?.perBox > 0) return product.box.price / product.box.perBox;
  return null;
}
export function computeLineTotal(product, optionType, qty) {
  if (product.hasPowderSizes && availableOptionTypes(product).includes(optionType)) {
    const option = product[optionType];
    return Math.round((option.bulkQty > 0 && option.bulkUnitPrice > 0 && qty >= option.bulkQty ? option.bulkUnitPrice : option.price) * qty);
  }
  if (optionType === "unit") {
    const boxQty = product.bulkQty;
    const bulkUnitPrice = getBulkUnitPrice(product);
    if (boxQty > 0 && bulkUnitPrice > 0 && qty >= boxQty) {
      return Math.round(bulkUnitPrice * qty);
    }
  }
  return (product[optionType]?.price || 0) * qty;
}

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
  return { categories: cats, brands: sortedBrands, products: products.map(shapeProduct).sort(compareProductNames) };
}

export async function submitOrder({ form, cart, products }) {
  const validItems = cart
    .map((item) => ({ item, product: products.find((x) => x.id === item.productId) }))
    .filter(({ product }) => product);
  if (!validItems.length) throw new Error("Сагс хоосон байна.");
  if (validItems.some(({ item, product }) => !availableOptionTypes(product).includes(item.optionType))) {
    throw new Error("Барааны хэмжээ өөрчлөгдсөн байна. Сагснаас устгаад хэмжээг дахин сонгоно уу.");
  }

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
  return data;
}

export async function lookupOrdersByPhone({ phone }) {
  const { data, error } = await supabase.rpc("lookup_orders_by_phone", {
    p_phone: phone.trim(),
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function registerTraining({ name, phone, trainingDate, requestId }) {
  const { data, error } = await supabase.rpc("register_scheduled_training", {
    p_name: name.trim(),
    p_phone: phone.trim(),
    p_training_date: trainingDate,
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function lookupTrainingByPhone({ phone }) {
  const { data, error } = await supabase.rpc("lookup_training_by_phone", {
    p_phone: phone.trim(),
  });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createQpayInvoice({ orderNumber, registrationId, description, kind }) {
  const { data, error } = await supabase.functions.invoke("qpay-create-invoice", {
    body: { orderNumber, registrationId, description, kind },
  });
  if (error) throw new Error(error.message || "QPay нэхэмжлэл үүсгэхэд алдаа гарлаа");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function checkQpayPayment({ invoiceId, orderNumber, registrationId, kind }) {
  const { data, error } = await supabase.functions.invoke("qpay-check-payment", {
    body: { invoiceId, orderNumber, registrationId, kind },
  });
  if (error) throw new Error(error.message || "Төлбөр шалгахад алдаа гарлаа");
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function getTrainingSlots() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date());
  const { data, error } = await supabase.from('training_sessions')
    .select('training_date,remaining_seats').eq('is_active', true).gte('training_date', today).order('training_date');
  if (error) throw new Error(error.message);
  return data || [];
}

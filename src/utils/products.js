

export const COFFEE_SIZES = { size_1kg: '1кг', size_250g: '250гр' };
export function freePumpProducts(cart, products, brands, categories) {
  return [...new Set(cart.filter(item => item.qty > 0 && products.some(p => p.id === item.productId && hasFreeSyrupPump(p, brands, categories))).map(item => item.productId))];
}
export const hasFreeSyrupPump = (product, brands, categories) =>
  brands.find(b => b.id === product.brandId)?.name?.trim().toLowerCase() === 'taco' &&
  categories.find(c => c.id === product.categoryId)?.name?.trim().toLowerCase() === 'сироп';
export const availableOptionTypes = (product) =>
  product ? (product.hasCoffeeSizes ? Object.keys(COFFEE_SIZES) : ["unit", "box"])
    .filter((t) => (product[t]?.price || 0) > 0) : [];

export const displayPrice = (product) => {
  const t = availableOptionTypes(product)[0];
  return t ? product[t].price : 0;
};

const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
export const compareProductNames = (a, b) => nameCollator.compare((a.name || '').trim(), (b.name || '').trim());

// Stable priority: keep the chosen name/brand/price order inside each group.
export function prioritizeTaggedProducts(products, now = Date.now()) {
  const featured = p => p.tag === 'бестселлэр' || p.tag === 'шинэ' ||
    (p.tag === 'хямдралтай' && (!p.discountEndsAt || new Date(p.discountEndsAt).getTime() > now));
  return [...products].sort((a, b) => Number(featured(b)) - Number(featured(a)));
}

// Keep brands together and order products A–Z within each brand.
export function groupProductsByBrand(products, brands) {
  const ranks = new Map(brands.map((brand, index) => [brand.id, index]));
  for (const product of products) {
    if (!ranks.has(product.brandId)) ranks.set(product.brandId, ranks.size);
  }
  return [...products].sort((a, b) =>
    ranks.get(a.brandId) - ranks.get(b.brandId) || compareProductNames(a, b)
  );
}

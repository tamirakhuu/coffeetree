

export const availableOptionTypes = (product) =>
  product ? ["unit", "box"].filter((t) => (product[t]?.price || 0) > 0) : [];

export const displayPrice = (product) => {
  const t = availableOptionTypes(product)[0];
  return t ? product[t].price : 0;
};

const nameCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
export const compareProductNames = (a, b) => nameCollator.compare((a.name || '').trim(), (b.name || '').trim());

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

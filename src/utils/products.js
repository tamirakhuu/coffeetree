

export const availableOptionTypes = (product) =>
  product ? ["unit", "box"].filter((t) => (product[t]?.price || 0) > 0) : [];

export const displayPrice = (product) => {
  const t = availableOptionTypes(product)[0];
  return t ? product[t].price : 0;
};

// Keep each brand together; featured products lead only within their own brand.
export function groupProductsByBrand(products, brands) {
  const ranks = new Map(brands.map((brand, index) => [brand.id, index]));
  for (const product of products) {
    if (!ranks.has(product.brandId)) ranks.set(product.brandId, ranks.size);
  }
  const featured = product => product.tag === "бестселлэр" || product.tag === "хямдралтай";
  return [...products].sort((a, b) =>
    ranks.get(a.brandId) - ranks.get(b.brandId) || Number(featured(b)) - Number(featured(a))
  );
}

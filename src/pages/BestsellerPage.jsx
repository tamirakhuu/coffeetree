import React, { useState, useContext } from "react";
import { T, DataContext, ProductCard, PageHeaderRow, CollapsibleSection, displayPrice } from "../components/storefront.jsx";

export default function BestsellerPage({ onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { products, brands, categories } = useContext(DataContext);
  const [brandFilter, setBrandFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [sortBy, setSortBy] = useState("default");

  const bestsellers = products.filter((p) => p.tag === "бестселлэр");
  const brandsInBest = brands.filter((b) => bestsellers.some((p) => p.brandId === b.id));
  const categoriesInBest = categories.filter((c) => bestsellers.some((p) => p.categoryId === c.id));
  let items = bestsellers;
  if (categoryFilter.length) items = items.filter((p) => categoryFilter.includes(p.categoryId));
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title="Бестселлэр" />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <CollapsibleSection label="Ангилал">
          {categoriesInBest.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={categoryFilter.includes(c.id)}
                onChange={() => setCategoryFilter(categoryFilter.includes(c.id) ? categoryFilter.filter((x) => x !== c.id) : [...categoryFilter, c.id])}
                style={{ accentColor: T.cherry }} />
              {c.name}
            </label>
          ))}
          {categoriesInBest.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Ангилал алга</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection label="Брэнд">
          {brandsInBest.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
          {brandsInBest.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Брэнд алга</div>
          )}
        </CollapsibleSection>
      </aside>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Шүүж үзэх</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Бестселлэр бүтээгдэхүүн олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useContext } from "react";
import { T, subBtn } from "../theme.js";
import { DataContext } from "../context/DataContext.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { PageHeaderRow } from "../components/PageHeaderRow.jsx";
import { CollapsibleSection } from "../components/CollapsibleSection.jsx";
import { displayPrice } from "../utils/products.js";

export default function CategoryPage({ categoryId, brandFilter, setBrandFilter, subFilter, setSubFilter, sortBy, setSortBy, onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { categories, brands, products } = useContext(DataContext);
  const productsRef = useRef(null);
  const chooseSub = (s) => {
    setSubFilter(s);
    if (window.innerWidth <= 720 && productsRef.current) {
      setTimeout(() => productsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };
  const category = categories.find((c) => c.id === categoryId);
  let items = products.filter((p) => p.categoryId === categoryId);
  if (subFilter) items = items.filter((p) => p.sub === subFilter);
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  const isFeatured = (p) => p.tag === "бестселлэр" || p.tag === "хямдралтай";
  if (sortBy === "default") items = [...items].sort((a, b) => isFeatured(b) - isFeatured(a));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));

  const brandsInCat = brands.filter((b) => products.some((p) => p.categoryId === categoryId && p.brandId === b.id));

  if (!category) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Ангилал олдсонгүй.</div>;

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title={category.name} />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <CollapsibleSection label="ТӨРӨЛ">
          <button onClick={() => chooseSub(null)} style={subBtn(subFilter === null)}>Бүгд</button>
          {category.sub.map((s) => (
            <button key={s} onClick={() => chooseSub(s)} style={subBtn(subFilter === s)}>{s}</button>
          ))}
        </CollapsibleSection>

        <CollapsibleSection label="Брэнд">
          {brandsInCat.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
        </CollapsibleSection>
      </aside>

      <div ref={productsRef} style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Шүүж үзэх</option>
            <option value="new">Шинэ эхэндээ</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Тохирох бараа олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}

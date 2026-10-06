import { prioritizeTaggedProducts } from "../utils/products.js";
import React, { useState, useEffect, useRef, useContext } from "react";
import { T, subBtn } from "../theme.js";
import { DataContext } from "../context/DataContext.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { PageHeaderRow } from "../components/PageHeaderRow.jsx";
import { CollapsibleSection } from "../components/CollapsibleSection.jsx";
import { displayPrice } from "../utils/products.js";

export default function BrandPage({ brandId, onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { categories, brands, products } = useContext(DataContext);
  const brand = brands.find((b) => b.id === brandId);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [subFilter, setSubFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const productsRef = useRef(null);
  const chooseCategory = (id) => {
    setCategoryFilter(id);
    setSubFilter(null);
  };
  const chooseSub = (sub) => {
    setSubFilter(sub);
    if (window.innerWidth <= 720 && productsRef.current) {
      setTimeout(() => productsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  useEffect(() => { setCategoryFilter(null); setSubFilter(null); setSortBy("default"); }, [brandId]);

  if (!brand) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Брэнд олдсонгүй.</div>;

  let items = products.filter((p) => p.brandId === brandId);
  if (categoryFilter) items = items.filter((p) => p.categoryId === categoryFilter);
  const presentSubs = [...new Set(items.map(p => p.sub?.trim()).filter(Boolean))];
  const configuredSubs = categories.find(c => c.id === categoryFilter)?.sub || [];
  const subcategories = [...new Set([...configuredSubs, ...presentSubs])].filter(sub => presentSubs.includes(sub));
  if (categoryFilter && subFilter) items = items.filter(p => p.sub?.trim() === subFilter);
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));
  items = prioritizeTaggedProducts(items);

  const categoriesInBrand = categories.filter((c) => products.some((p) => p.brandId === brandId && p.categoryId === c.id));

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title={brand.name} />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        {brand.logo && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <img src={brand.logo} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "contain", background: "#fff", border: `1px solid ${T.line}` }} />
          </div>
        )}
        <CollapsibleSection label="Ангилал">
          <button onClick={() => chooseCategory(null)} style={subBtn(categoryFilter === null)}>Бүгд</button>
          {categoriesInBrand.map((c) => (
            <button key={c.id} onClick={() => chooseCategory(c.id)} style={subBtn(categoryFilter === c.id)}>{c.name}</button>
          ))}
        </CollapsibleSection>
        {categoryFilter && subcategories.length > 0 && (
          <CollapsibleSection key={categoryFilter} label="Дэд ангилал">
            <button onClick={() => chooseSub(null)} aria-pressed={subFilter === null} style={subBtn(subFilter === null)}>Бүгд</button>
            {subcategories.map(sub => (
              <button key={sub} onClick={() => chooseSub(sub)} aria-pressed={subFilter === sub} style={subBtn(subFilter === sub)}>{sub}</button>
            ))}
          </CollapsibleSection>
        )}
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

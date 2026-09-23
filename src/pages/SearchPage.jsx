import React from "react";
import { T } from "../theme.js";
import { ProductCard } from "../components/ProductCard.jsx";

export default function SearchPage({ query, products, openProduct, quickAdd, wishlist, toggleWish }) {
    const q = query.toLowerCase();
    const results = products.filter((p) => p.name.toLowerCase().includes(q) || (p.origin || "").toLowerCase().includes(q));
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
        <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 6 }}>“{query}” хайлтын үр дүн</h1>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 22 }}>{results.length} олдлоо</div>
        <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {results.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} onQuickAdd={quickAdd} isWished={wishlist.includes(p.id)} onToggleWish={toggleWish} />)}
        </div>
      </div>
    );
}

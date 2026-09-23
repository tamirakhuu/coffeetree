import React, { useContext } from "react";
import { T, DataContext, ProductCard, BackButton } from "../components/storefront.jsx";

export default function WishlistPage({ wishlist, onOpen, onQuickAdd, onToggleWish, setView }) {
  const { products } = useContext(DataContext);
  const items = products.filter((p) => wishlist.includes(p.id));
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
      <BackButton onClick={() => setView({ name: "home" })} />
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 22 }}>Таалагдсан бүтээгдэхүүн</h1>
      {items.length === 0 ? (
        <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Жагсаалт хоосон байна.</div>
      ) : (
        <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd} isWished onToggleWish={onToggleWish} />
          ))}
        </div>
      )}
    </div>
  );
}

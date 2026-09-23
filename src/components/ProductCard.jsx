import React, { useContext } from "react";
import { Heart } from "lucide-react";
import { T } from "../theme.js";
import { money } from "../utils/format.js";
import { DataContext } from "../context/DataContext.jsx";
import { ProductArt } from "./ProductArt.jsx";
import { availableOptionTypes } from "../utils/products.js";

export function ProductCard({ product, onOpen, isWished, onToggleWish, variant }) {
  const { brands } = useContext(DataContext);
  const brand = brands.find((b) => b.id === product.brandId);
  const optionType = availableOptionTypes(product)[0] || "unit";
  const option = product[optionType];
  const inkCard = variant === "ink";
  const soldOut = availableOptionTypes(product).every((t) => (product[t]?.stock || 0) <= 0);
  return (
    <div className="cuppa-product-card" style={{
      background: inkCard ? T.ink : "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      borderRadius: "25px 25px 14px 14px", border: inkCard ? "1px solid rgb(255, 255, 255)" : "none", overflow: "hidden",
      display: "flex", flexDirection: "column", boxShadow: inkCard ? "0 4px 16px rgba(36,28,20,.35)" : "0 1px 4px rgba(36,28,20,.12)",
      transition: "transform .15s ease, box-shadow .15s ease",
    }}>
      <div style={{ cursor: "pointer", borderBottom: `1px solid ${T.line}` }} onClick={() => onOpen(product)}>
        <ProductArt product={product} />
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, color: inkCard ? "rgba(255,255,255,.75)" : T.moss, textTransform: "uppercase", letterSpacing: "0.05em" }}>{brand?.name}</span>
          <button onClick={() => onToggleWish(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: isWished ? (inkCard ? "#fff" : T.cherry) : (inkCard ? "rgba(255,255,255,.6)" : T.inkSoft) }}>
            <Heart size={16} fill={isWished ? (inkCard ? "#fff" : T.cherry) : "none"} />
          </button>
        </div>
        <div onClick={() => onOpen(product)} style={{ cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 700, color: inkCard ? "#fff" : T.ink, lineHeight: 1.25 }}>
          {product.name}
        </div>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, color: inkCard ? "rgba(255,255,255,.7)" : T.inkSoft }}>{product.origin}</div>
        <div className="cuppa-product-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, gap: 6 }}>
          <span className="cuppa-product-price" style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 15, color: inkCard ? T.paper : T.ink }}>{money(option.price)}</span>
          <button className="cuppa-product-detail-btn" onClick={() => onOpen(product)} style={{
            background: soldOut ? T.line : (inkCard ? "#fff" : T.ink), color: soldOut ? T.inkSoft : (inkCard ? T.ink : "#fff"), border: "none", borderRadius: 999, padding: "7px 13px",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>{soldOut ? "Дууссан" : "Дэлгэрэнгүй"}</button>
        </div>
      </div>
    </div>
  );
}

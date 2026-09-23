import { T } from "../theme.js";
import React, { useState } from "react";
import { discountPercent, initials } from "../utils/format.js";

export function StampBadge({ label, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "999px", border: `2px dashed ${T.cream}`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.cream,
      fontFamily: "'Ubuntu', sans-serif", fontSize: size * 0.28, fontWeight: 600,
      letterSpacing: "0.02em", transform: "rotate(-8deg)", flexShrink: 0, opacity: 0.9,
    }}>{label}</div>
  );
}

export function ProductArt({ product, height = 190 }) {
  const hasImage = product.images && product.images.length > 0;
  const hoverImage = hasImage && product.images.length > 1 ? product.images[1] : null;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height, borderRadius: "14px 14px 4px 4px", position: "relative", overflow: "hidden",
        background: hasImage ? T.card : `linear-gradient(155deg, ${product.color} 0%, ${T.ink} 130%)`,
      }}>
      {hasImage ? (
        <>
          <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          {hoverImage && (
            <img src={hoverImage} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: T.card,
              opacity: hovered ? 1 : 0, transition: "opacity .25s ease",
            }} />
          )}
        </>
      ) : (
        <>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.12, backgroundImage:
              "radial-gradient(circle at 20% 30%, #fff 0, transparent 3px), radial-gradient(circle at 70% 60%, #fff 0, transparent 3px), radial-gradient(circle at 40% 80%, #fff 0, transparent 2px)",
            backgroundSize: "40px 40px",
          }} />
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <StampBadge label={initials(product.name)} />
          </div>
        </>
      )}
      {product.tag && (
        <span style={{
          position: "absolute", top: hasImage ? 10 : 80, left: 12, fontFamily: "'Ubuntu', sans-serif",
          fontSize: 11, letterSpacing: "0.06em", color: T.paper, background: product.tag === "шинэ" ? T.green : T.gold,
          padding: "3px 9px", borderRadius: 999, fontWeight: 600, textTransform: "uppercase",
        }}>
          {product.tag === "хямдралтай" && discountPercent(product.unit) != null
            ? `-${discountPercent(product.unit)}%`
            : product.tag}
        </span>
      )}
    </div>
  );
}

import React, { useContext } from "react";
import { X, Plus, Minus, ArrowRight, Trash2 } from "lucide-react";
import { computeLineTotal } from "../api.js";
import { T, iconBtnStyle, stepBtn } from "../theme.js";
import { money } from "../utils/format.js";
import { DataContext } from "../context/DataContext.jsx";

export function CartDrawer({ open, onClose, cart, updateQty, removeItem, subtotal, onCheckout }) {
  const { products } = useContext(DataContext);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 150,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: 380, maxWidth: "90vw", background: T.paper,
        transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .3s ease",
        zIndex: 160, display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,.2)",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink }}>Сагс</span>
          <button onClick={onClose} style={{ ...iconBtnStyle, color: T.ink }}><X size={21} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
          {cart.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, marginTop: 30, textAlign: "center" }}>Таны сагс хоосон байна.</div>}
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const option = product[item.optionType];
            return (
              <div key={item.productId + item.optionType + (item.note || "")} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                {product.images && product.images.length ? (
                  <img src={product.images[0]} alt={product.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: T.card }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(155deg, ${product.color}, ${T.ink})`, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{product.name}</div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.moss, margin: "3px 0" }}>{option.label}{item.note ? ` · ${item.note}` : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.line}`, borderRadius: 999 }}>
                      <button onClick={() => updateQty(item.productId, item.optionType, item.note, Math.max(1, item.qty - 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Minus size={11} /></button>
                      <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, width: 22, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.productId, item.optionType, item.note, Math.min(option.stock || item.qty, item.qty + 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Plus size={11} /></button>
                    </div>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink }}>{money(computeLineTotal(product, item.optionType, item.qty))}</span>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId, item.optionType, item.note)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, alignSelf: "flex-start" }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontFamily: "'Ubuntu', sans-serif" }}>
              <span style={{ color: T.inkSoft, fontSize: 14 }}>Нийт дүн</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 17, color: T.ink }}>{money(subtotal)}</span>
            </div>
            <button onClick={onCheckout} style={{
              width: "100%", background: T.cherry, color: "#fff", border: "none", borderRadius: 999,
              padding: "13px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>Захиалга үүсгэх <ArrowRight size={16} /></button>
          </div>
        )}
      </div>
    </>
  );
}

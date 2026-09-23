import { T, sideLabel, inputStyle } from "../theme.js";
import { money } from "../utils/format.js";
import { DataContext } from "../context/DataContext.jsx";
import React, { useState, useContext } from "react";
import { ChevronLeft } from "lucide-react";
import { computeLineTotal, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "../api.js";

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5 }}>
      <span style={{ color: T.inkSoft }}>{label}</span>
      <span style={{ color: T.ink, fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function Checkout({ cart, subtotal, onConfirm, onBack }) {
  const { products } = useContext(DataContext);
  const [form, setForm] = useState({
    name: "", phone: "", address: "",
    receiptType: "", registerNumber: "", deliveryMethod: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = form.deliveryMethod === "delivery" && !freeDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const valid = form.name && form.phone.length === 8 && form.deliveryMethod && form.receiptType
    && (form.deliveryMethod !== "delivery" || form.address)
    && (form.receiptType !== "company" || form.registerNumber) && !submitting;
  const deliveryLabel = form.deliveryMethod === "delivery" ? "Хүргүүлэх/Орон нутгийн унаанд" : "Очиж авах(Саруул зах)";
  const handleConfirmClick = () => { if (valid) setReviewing(true); };
  const handlePayClick = async () => {
    setSubmitting(true);
    await onConfirm(form, total);
    setSubmitting(false);
  };
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 60px" }}>
      <button onClick={reviewing ? () => setReviewing(false) : onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={15} /> {reviewing ? "Буцаж засах" : "Сагс руу буцах"}
      </button>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 26 }}>Хүргэлтийн мэдээлэл</h1>
      <div className="cuppa-checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 34, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 260 }}>
          <input placeholder="Хүлээн авагчийн нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <div>
            <input placeholder="Утасны дугаар" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={{ ...inputStyle, width: "100%" }} />
            {form.phone.length > 0 && form.phone.length < 8 && (
              <div style={{ color: T.cherry, fontSize: 12, fontFamily: "'Ubuntu', sans-serif", marginTop: 5 }}>Утасны дугаар 8 оронтой байх ёстой.</div>
            )}
          </div>

          <div>
            <div style={sideLabel}>Хүргэлтийн хэлбэр</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ key: "pickup", label: "Очиж авах(Саруул зах)" }, { key: "delivery", label: "Хүргүүлэх/Орон нутгийн унаанд" }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, deliveryMethod: key })} style={{
                  flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${form.deliveryMethod === key ? T.cherry : T.line}`,
                  background: form.deliveryMethod === key ? T.cream : "transparent",
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink,
                }}>{label}{key === "delivery" && (
                  <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: freeDelivery ? T.moss : T.inkSoft, marginTop: 2 }}>
                    {freeDelivery ? "500,000₮-с дээш худалдан авалтанд хүргэлт үнэгүй" : `+${money(DELIVERY_FEE)}`}
                  </span>
                )}</button>
              ))}
            </div>
          </div>
          {form.deliveryMethod === "delivery" && (
            <textarea placeholder="Дэлгэрэнгүй хаяг" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={4} maxLength={200} style={{ ...inputStyle, resize: "none", fontFamily: "'Ubuntu', sans-serif" }} />
          )}

          <div>
            <div style={sideLabel}>И-баримт</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ key: "individual", label: "Хувь хүн" }, { key: "company", label: "Байгууллага" }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, receiptType: key })} style={{
                  flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${form.receiptType === key ? T.cherry : T.line}`,
                  background: form.receiptType === key ? T.cream : "transparent",
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink,
                }}>{label}</button>
              ))}
            </div>
          </div>
          {form.receiptType === "company" && (
            <input placeholder="Байгууллагын регистрийн дугаар" value={form.registerNumber}
              onChange={(e) => setForm({ ...form, registerNumber: e.target.value })} style={inputStyle} />
          )}

          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft, marginTop: -2 }}>Төлбөрийн хэлбэр : QPay</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, alignSelf: "flex-start", minWidth: 240 }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 14, color: T.ink }}>Захиалгын мэдээлэл</div>
          {reviewing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
              <ReviewRow label="Хүлээн авагч" value={form.name} />
              <ReviewRow label="Утас" value={form.phone} />
              <ReviewRow label="Хүргэлтийн хэлбэр" value={deliveryLabel} />
              {form.deliveryMethod === "delivery" && <ReviewRow label="Хаяг" value={form.address} />}
              <ReviewRow label="И-баримт" value={form.receiptType === "company" ? `Байгууллага (${form.registerNumber})` : "Хувь хүн"} />
            </div>
          )}
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={item.productId + item.optionType + (item.note || "")} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, marginBottom: 8, color: T.ink }}>
                <span>{product.name}{item.note ? ` · ${item.note}` : ""} × {item.qty}</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(computeLineTotal(product, item.optionType, item.qty))}</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 10, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
              <span>Барааны дүн</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                <span>Хүргэлтийн хураамж</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(deliveryFee)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
              <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>Нийт</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif", color: T.cherry }}>{money(total)}</span>
            </div>
          </div>
          {!reviewing ? (
            <button disabled={!valid} onClick={handleConfirmClick} style={{
              width: "100%", marginTop: 16, background: valid ? T.cherry : T.line, color: "#fff", border: "none",
              borderRadius: 999, padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
              cursor: valid ? "pointer" : "not-allowed",
            }}>Баталгаажуулах</button>
          ) : (
            <button disabled={submitting} onClick={handlePayClick} style={{
              width: "100%", marginTop: 16, background: T.cherry, color: "#fff", border: "none",
              borderRadius: 999, padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1,
            }}>{submitting ? "Түр хүлээнэ үү..." : "Төлбөр төлөх"}</button>
          )}
        </div>
      </div>
    </div>
  );
}

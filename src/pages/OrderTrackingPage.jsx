import React, { useState } from "react";
import { lookupOrdersByPhone } from "../api.js";
import { T, money, BackButton, inputStyle } from "../components/storefront.jsx";

const ORDER_STATUS_LABELS = {
  pending: "Хүлээгдэж байна", prepared: "Бэлдсэн", handed_over: "Хүлээлгэн өгсөн", cancelled: "Цуцлагдсан",
  processing: "Бэлдэж байна", shipped: "Хүргэлтэнд гарсан", done: "Хүргэгдсэн",
};

const ORDER_STATUS_COLORS = {
  pending: { bg: "#F3E6C9", color: "#8A6A1E" },
  prepared: { bg: "#DCE6F5", color: "#2E4E8A" },
  handed_over: { bg: "#DFEED6", color: "#2E5C2E" },
  cancelled: { bg: "#F5DCDC", color: "#8A2E2E" },
  processing: { bg: "#DCE6F5", color: "#2E4E8A" },
  shipped: { bg: "#E4DCF5", color: "#5B3E8A" },
  done: { bg: "#DFEED6", color: "#2E5C2E" },
};

function OrderStatusBadge({ status }) {
  const c = ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.pending;
  return (
    <span style={{
      background: c.bg, color: c.color, fontSize: 11.5, fontWeight: 600, padding: "4px 10px",
      borderRadius: 999, fontFamily: "'Ubuntu', sans-serif", whiteSpace: "nowrap",
    }}>{ORDER_STATUS_LABELS[status] || status}</span>
  );
}

export default function OrderTrackingPage({ setView }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notfound | error
  const [orders, setOrders] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const data = await lookupOrdersByPhone({ phone });
      if (data && data.length) { setOrders(data); setStatus("found"); }
      else { setOrders([]); setStatus("notfound"); }
    } catch (err) {
      setOrders([]); setStatus("error");
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "50px 20px 90px" }}>
      <BackButton onClick={() => setView({ name: "home" })} />
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Захиалгаа хянах</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, marginBottom: 22 }}>Захиалга хийхдээ ашигласан утасны дугаараа оруулж, төлөвөө шалгаарай.</p>
      <form onSubmit={handleSearch} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
        <input placeholder="Утасны дугаар" inputMode="numeric" value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))} style={inputStyle} />
        <button type="submit" disabled={phone.length !== 8 || status === "loading"} style={{
          background: phone.length === 8 ? T.cherry : T.line, color: "#fff", border: "none",
          borderRadius: 999, padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
          cursor: phone.length === 8 ? "pointer" : "not-allowed",
        }}>{status === "loading" ? "Хайж байна..." : "Хайх"}</button>
      </form>

      {status === "notfound" && (
        <div style={{ color: T.cherry, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5 }}>Хүргэгдээгүй захиалга олдсонгүй. Утасны дугаараа шалгана уу.</div>
      )}
      {status === "error" && (
        <div style={{ color: T.cherry, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5 }}>Алдаа гарлаа. Дахин оролдоно уу.</div>
      )}
      {status === "found" && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((order) => (
            <div key={order.orderNumber} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 15, color: T.ink }}>{order.orderNumber}</div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                    {new Date(order.createdAt).toLocaleDateString("mn-MN")}
                    {order.receiptType === "company" && <> · Байгууллага ({order.registerNumber})</>}
                    {" · "}{order.deliveryMethod === "delivery" ? "Хүргүүлэх/Орон нутгийн унаанд" : "Очиж авах(Саруул зах)"}
                    {order.boxCount > 0 && <> · 📦 {order.boxCount} хайрцаг</>}
                  </div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {order.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                    <span>{it.productName} ({it.optionLabel}) × {it.qty}</span>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(it.lineTotal)}</span>
                  </div>
                ))}
                {order.deliveryFee > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                    <span>Хүргэлтийн хураамж</span>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(order.deliveryFee)}</span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>Нийт</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif", color: T.cherry }}>{money(order.subtotal + (order.deliveryFee || 0))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { checkQpayPayment } from "../api.js";
import { T, money } from "../components/storefront.jsx";

export default function QpayPayment({ orderNumber, subtotal, invoice, onPaid }) {
  const [status, setStatus] = useState("pending"); // pending | paid | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoice?.invoiceId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await checkQpayPayment({ invoiceId: invoice.invoiceId, orderNumber });
        if (cancelled) return;
        if (res.paid) {
          setStatus("paid");
          setTimeout(() => onPaid(), 900);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => { cancelled = true; clearInterval(interval); };
  }, [invoice?.invoiceId]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "50px 20px 90px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 6 }}>QPay-ээр төлөх</h1>
      <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 26 }}>
        Захиалга {orderNumber} — {money(subtotal)}
      </div>
      {invoice?.demo && (
        <div style={{
          fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.moss, background: T.cream,
          border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 14px", marginBottom: 20,
        }}>Туршилтын горим — QPay мерчант эрх тохируулаагүй тул {"15 секундийн дараа автоматаар \"төлөгдсөн\" гэж үзнэ."}</div>
      )}

      {status === "paid" ? (
        <div style={{ padding: "40px 0" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.moss, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={30} color="#fff" />
          </div>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, color: T.ink }}>Төлбөр амжилттай хийгдлээ!</div>
        </div>
      ) : (
        <>
          {invoice?.qrImage && (
            <img
              src={`data:image/png;base64,${invoice.qrImage}`}
              alt="QPay QR"
              style={{ width: 220, height: 220, borderRadius: 14, border: `1px solid ${T.line}`, background: "#fff", padding: 10 }}
            />
          )}
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, margin: "18px 0 20px" }}>
            Банкны аппаараа дээрх QR кодыг уншуулж төлнө үү.
          </div>

          {invoice?.urls?.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, marginBottom: 10 }}>Эсвэл банкны аппаа сонгон шууд төлөх</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {invoice.urls.map((u) => (
                  <a key={u.name} href={u.link} style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5, textDecoration: "none", color: T.ink,
                  }}>
                    <img src={u.logo} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} style={{
                      width: 44, height: 44, borderRadius: 12, objectFit: "contain", border: `1px solid ${T.line}`, background: "#fff",
                    }} />
                    <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 10.5, textAlign: "center", lineHeight: 1.2 }}>{u.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {error && <div style={{ color: T.cherry, fontSize: 12.5, marginBottom: 14, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
        </>
      )}
    </div>
  );
}

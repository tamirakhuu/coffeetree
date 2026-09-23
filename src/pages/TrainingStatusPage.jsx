import React, { useState } from "react";
import { lookupTrainingByPhone } from "../api.js";
import { T, inputStyle } from "../theme.js";
import { BackButton } from "../components/BackButton.jsx";
import { formatMnDate } from "../utils/format.js";

const TRAINING_PAYMENT_LABELS = { paid: "Төлсөн", pending: "Хүлээгдэж байна" };

const TRAINING_PAYMENT_COLORS = {
  paid: { bg: "#DFEED6", color: "#2E5C2E" },
  pending: { bg: "#F3E6C9", color: "#8A6A1E" },
};

function TrainingPaymentBadge({ status }) {
  const c = TRAINING_PAYMENT_COLORS[status] || TRAINING_PAYMENT_COLORS.pending;
  return (
    <span style={{
      background: c.bg, color: c.color, fontSize: 11.5, fontWeight: 600, padding: "4px 10px",
      borderRadius: 999, fontFamily: "'Ubuntu', sans-serif", whiteSpace: "nowrap",
    }}>{TRAINING_PAYMENT_LABELS[status] || status}</span>
  );
}

export default function TrainingStatusPage({ setView }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | found | notfound | error
  const [regs, setRegs] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const data = await lookupTrainingByPhone({ phone });
      if (data && data.length) { setRegs(data); setStatus("found"); }
      else { setRegs([]); setStatus("notfound"); }
    } catch (err) {
      setRegs([]); setStatus("error");
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "50px 20px 90px" }}>
      <BackButton onClick={() => setView({ name: "training" })} />
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Сургалтын бүртгэлээ шалгах</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.inkSoft, marginBottom: 22 }}>Бүртгүүлэхдээ ашигласан утасны дугаараа оруулж, төлбөрийн төлөвөө шалгаарай.</p>
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
        <div style={{ color: T.cherry, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5 }}>Энэ дугаараар бүртгэл олдсонгүй. Утасны дугаараа шалгана уу.</div>
      )}
      {status === "error" && (
        <div style={{ color: T.cherry, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5 }}>Алдаа гарлаа. Дахин оролдоно уу.</div>
      )}
      {status === "found" && regs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {regs.map((r) => (
            <div key={r.id} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 15, color: T.ink }}>
                  {formatMnDate(new Date(r.trainingDate + "T00:00:00"))}
                </div>
                <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{r.name}</div>
              </div>
              <TrainingPaymentBadge status={r.paymentStatus} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

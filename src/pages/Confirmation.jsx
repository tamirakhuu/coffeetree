import { Check } from "lucide-react";
import { T } from "../components/storefront.jsx";
import React from "react";

export default function Confirmation({ orderNumber, onContinue, onTrack }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 20px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.moss, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Check size={30} color="#fff" />
      </div>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Төлбөр төлөлт амжилттай!</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", color: T.inkSoft, marginBottom: 6 }}>Захиалгын дугаар</p>
      <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.cherry, marginBottom: 10 }}>{orderNumber}</div>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 24 }}>Захиалгын төлөвөө дараа нь утасны дугаараараа хянах боломжтой.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={onContinue} style={{
          background: T.ink, color: T.cream, border: "none", borderRadius: 999, padding: "12px 26px",
          fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>Дэлгүүр рүү буцах</button>
        <button onClick={onTrack} style={{
          background: "transparent", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999, padding: "12px 26px",
          fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>Захиалгаа хянах</button>
      </div>
    </div>
  );
}

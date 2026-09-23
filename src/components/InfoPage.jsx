import { T } from "../theme.js";
import React from "react";

export function InfoPage({ title, note, actionLabel, onAction }) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 20px 100px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: 14 }}>{title}</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.inkSoft, lineHeight: 1.6 }}>{note}</p>
      {actionLabel && (
        <button onClick={onAction} style={{
          marginTop: 24, background: T.ink, color: T.cream, border: "none", borderRadius: 999, padding: "12px 26px",
          fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>{actionLabel}</button>
      )}
    </div>
  );
}

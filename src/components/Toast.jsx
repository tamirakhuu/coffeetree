import { Check } from "lucide-react";
import { T } from "../theme.js";
import React from "react";

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: T.ink, color: T.cream, padding: "12px 22px", borderRadius: 999,
      fontFamily: "'Ubuntu', sans-serif", fontSize: 14, fontWeight: 500, zIndex: 200,
      display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      maxWidth: "80vw", textAlign: "center",
    }}>
      <Check size={16} color={T.gold} /> {message}
    </div>
  );
}

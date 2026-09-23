import { T } from "../theme.js";
import { BackButton } from "./BackButton.jsx";
import React from "react";

export function PageHeaderRow({ onBack, title }) {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", position: "relative", marginBottom: 22 }}>
      <BackButton onClick={onBack} style={{ marginBottom: 0 }} />
      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)", textAlign: "center",
        fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, lineHeight: 1.25,
        maxWidth: "62%",
      }}>{title}</div>
    </div>
  );
}

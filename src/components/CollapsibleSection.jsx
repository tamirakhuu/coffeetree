import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { T, sideLabel } from "../theme.js";

export function CollapsibleSection({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 22 }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
        background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: open ? 10 : 0,
      }}>
        <span style={{ ...sideLabel, marginBottom: 0 }}>{label}</span>
        <ChevronDown size={14} style={{ color: T.moss, transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
      </button>
      {open && children}
    </div>
  );
}

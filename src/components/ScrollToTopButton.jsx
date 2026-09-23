import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { T } from "../theme.js";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Дээш буцах"
      style={{
        position: "fixed", bottom: 24, right: 24, width: 46, height: 46, borderRadius: "50%",
        background: T.saaral, color: "#fff", border: "none", cursor: "pointer", zIndex: 150,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(0,0,0,.25)",
      }}
    >
      <ArrowUp size={20} />
    </button>
  );
}

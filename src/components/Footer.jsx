import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { T } from "../theme.js";
import { BRANCHES } from "../data/branches.js";
import React from "react";

export function Footer({ setView, transparent }) {
  return (
    <footer style={{ position: "relative", background: transparent ? "transparent" : T.paper, color: T.ink, padding: "26px 20px 16px" }}>
      <div style={{
        maxWidth: 1180, margin: "0 auto 16px", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18,
      }}>
        <div className="cuppa-footer-logo" style={{ display: "flex", alignItems: "flex-start" }}>
          <img src="/cuppa-logo1.png" alt="CUPPA" style={{ height: 140 }} />
        </div>
        {BRANCHES.map((b) => (
          <div key={b.name} style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13 }}>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{b.heading || `${b.name} салбар`}</div>
            <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, color: T.ink,
              textDecoration: "none", opacity: 0.85,
            }}>
              <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{b.address}</span>
            </a>
            {b.teaBreak && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, opacity: 0.85 }}>
                <Clock size={14} style={{ flexShrink: 0 }} /> <span>Цайны цаг {b.teaBreak}</span>
              </div>
            )}
            <a href={`tel:${b.phone}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.ink, textDecoration: "none", opacity: 0.85 }}>
              <Phone size={14} style={{ flexShrink: 0 }} /> {b.phone}
            </a>
            <a href={`mailto:${b.email}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.ink, textDecoration: "none", opacity: 0.85 }}>
              <Mail size={14} style={{ flexShrink: 0 }} /> {b.email}
            </a>
            {b.socials.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.ink, textDecoration: "none",
                fontFamily: "'Ubuntu', sans-serif", fontSize: 13, opacity: 0.85,
              }}>
                <Icon size={14} style={{ flexShrink: 0 }} /> {label}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div style={{
        maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 10, paddingTop: 14, borderTop: `1px solid ${T.line}`, textAlign: "center",
      }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => setView({ name: "about" })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.ink, opacity: 0.7, textDecoration: "none" }}>Бидний тухай</button>
          <button onClick={() => setView({ name: "order-status" })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.ink, opacity: 0.7, textDecoration: "none" }}>Захиалга хянах</button>
          <Link to="/terms" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.ink, opacity: 0.7, textDecoration: "none" }}>Үйлчилгээний нөхцөл</Link>
          <Link to="/privacy" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.ink, opacity: 0.7, textDecoration: "none" }}>Нууцлалын бодлого</Link>
        </div>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, opacity: 0.7 }}>© 2026 CoffeeTreeLLC</div>
      </div>
    </footer>
  );
}

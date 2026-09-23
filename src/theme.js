

export const T = {
  ink: "#241C15",
  inkSoft: "#5C4E3E",
  paper: "#ffffff",
  card: "#ffffff",  //card ungu
  line: "#d3cecb7c", //card huree
  cherry: "#7A2E2E",
  cherryDark: "#5C2222",
  moss: "#48583A", 
  gold: "#B8862E", //badge color
  cream: "#F6EFE0",
  green: "#177400",
  blue: "#1b00b4",
  saaral: "#494949",
  lightgreen: "#85f75c",
  grey: "#8C8C8C",
};

export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap');";

export const iconBtnStyle = { position: "relative", background: "transparent", border: "none", color: T.cream, cursor: "pointer", display: "flex", padding: 4 };

export const sideLabel = { fontFamily: "'Ubuntu', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10 };

export const backBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20, padding: 0, flexShrink: 0 };

export const subBtn = (active) => ({
  display: "block", width: "100%", textAlign: "left", background: active ? "#E4E1DC" : "transparent",
  color: T.ink, border: `1px solid ${active ? "#E4E1DC" : "transparent"}`,
  borderRadius: 8, padding: "7px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5,
  cursor: "pointer", marginBottom: 4,
});

export const stepBtn = { border: "none", background: "none", padding: "9px 12px", cursor: "pointer", color: T.ink, display: "flex" };

export const inputStyle = { padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, background: T.card, color: T.ink, outline: "none", boxSizing: "border-box" };

export const primaryBtn = { background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

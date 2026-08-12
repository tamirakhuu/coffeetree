import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header, Footer, T } from "../App.jsx";

export const legal = {
  h1: { fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 600, color: T.ink, margin: "0 0 10px", lineHeight: 1.15 },
  sub: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 13.5, color: T.inkSoft, marginBottom: 36 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, color: T.cherry, margin: "42px 0 14px" },
  p: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 15.5, lineHeight: 1.75, color: T.ink, margin: "0 0 16px" },
  ul: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 15.5, lineHeight: 1.75, color: T.ink, margin: "0 0 16px", paddingLeft: 22 },
  li: { marginBottom: 6 },
  box: { background: T.cream, border: `1px solid ${T.line}`, borderRadius: 12, padding: "22px 24px", margin: "20px 0" },
  boxLabel: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10, fontWeight: 700 },
  boxEmail: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 700, color: T.cherry },
  links: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 54, paddingTop: 24, borderTop: `1px solid ${T.line}`, fontFamily: "'Nunito Sans', sans-serif", fontSize: 13.5, color: T.inkSoft },
  link: { color: T.cherry, textDecoration: "none", fontWeight: 700 },
};

export function LegalLayout({ children }) {
  const navigate = useNavigate();
  const toHome = () => navigate("/");
  // react-router нь route солигдоход скролыг автоматаар дээш буцаадаггүй тул
  // (жишээ нь footer-ийн доод хэсгээс дарж ирэхэд хуудас доороосоо эхэлдэг байсан)
  // хуудас бүр анх render хийгдэх мөчид өөрөө дээшээ буцаана
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header setView={toHome} cartCount={0} wishCount={0} user={null}
        onOpenCart={toHome} onOpenAuth={toHome} onSearch={toHome} />
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 20px 100px" }}>
          {children}
        </div>
      </main>
      <Footer setView={toHome} />
    </div>
  );
}

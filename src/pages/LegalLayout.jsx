import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header, Footer, T, DataContext, pathForView } from "../App.jsx";
import { fetchBootstrap } from "../api.js";

export const legal = {
  h1: { fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 600, color: T.ink, margin: "0 0 10px", lineHeight: 1.15 },
  sub: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 13.5, color: T.inkSoft, marginBottom: 36 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, color: T.ink, margin: "42px 0 14px" },
  p: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 15.5, lineHeight: 1.75, color: T.ink, margin: "0 0 16px" },
  ul: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 15.5, lineHeight: 1.75, color: T.ink, margin: "0 0 16px", paddingLeft: 22 },
  li: { marginBottom: 6 },
  box: { background: T.paper, border: "none", borderRadius: 12, padding: "22px 24px", margin: "20px 0" },
  boxLabel: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10, fontWeight: 700 },
  boxEmail: { fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 700, color: T.cherry },
  links: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 54, paddingTop: 24, borderTop: `1px solid ${T.line}`, fontFamily: "'Nunito Sans', sans-serif", fontSize: 13.5, color: T.inkSoft },
  link: { color: T.cherry, textDecoration: "none", fontWeight: 700 },
};

export function LegalLayout({ children }) {
  const navigate = useNavigate();
  const toHome = () => navigate("/");
  const [data, setData] = useState({ categories: [], brands: [], products: [] });
  // Header-ийн навигацийн бүх линк (Ангилал, Брэнд, Бестселлэр гэх мэт)
  // одоо бодит URL-той тул App.jsx-тай ижил pathForView-ыг ашиглаад
  // шууд тэр хуудас руу нь шилжүүлнэ
  const goToView = (view) => navigate(pathForView(view, data.brands));
  useEffect(() => { window.scrollTo(0, 0); }, []);
  // Header-ийн "Ангилал" цэс өгөгдөлгүйгээр хоосон харагддаг тул энд ч
  // мөн App-тай адил bootstrap өгөгдлийг татаж DataContext-руу дамжуулна
  useEffect(() => { fetchBootstrap().then(setData).catch(() => {}); }, []);
  return (
    <DataContext.Provider value={data}>
      <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Header setView={goToView} cartCount={0} wishCount={0}
          onOpenCart={toHome} onSearch={toHome} />
        <main style={{ flex: 1 }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 20px 100px" }}>
            {children}
          </div>
        </main>
        <Footer setView={toHome} />
      </div>
    </DataContext.Provider>
  );
}

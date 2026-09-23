import React, { useEffect, useState, useRef, useContext } from "react";
import { T, sideLabel, iconBtnStyle } from "../theme.js";
import { CategoryIcon } from "./CategoryIcon.jsx";
import { X, ShoppingBag, Heart, Search, ChevronDown, Menu } from "lucide-react";
import { DataContext } from "../context/DataContext.jsx";

export const NavButton = React.forwardRef(function NavButton({ onClick, active, children }, ref) {
  return (
    <button ref={ref} onClick={onClick}
      style={{
        background: active ? "color: T.ink" : "transparent", border: "none", color: T.cream, opacity: 0.85,
        fontFamily: "'Ubuntu', sans-serif", fontSize: 14, fontWeight: 500, padding: "8px 10px",
        borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "rgba(255,255,255,0.08)" : "transparent")}
    >{children}</button>
  );
});

export function ProductsMegaMenu({ categories, brands, products, activeCat, setActiveCat, onGoCategory, onGoBrand, left }) {
  const activeCategory = categories.find((c) => c.id === activeCat) || categories[0];
  return (
    <div className="cuppa-megamenu" style={{
      position: "absolute", top: "calc(100% + 10px)", left, transform: "translateX(-50%)",
      background: T.card, border: `1px solid ${T.line}`,
      borderRadius: 14, padding: "22px 24px", display: "flex", gap: 32, boxShadow: "0 24px 50px rgba(0,0,0,.35)",
      zIndex: 120, minWidth: 400,
    }}>
      <div className="cuppa-megamenu-col" style={{ minWidth: 170 }}>
        <div style={sideLabel}>Бүтээгдэхүүн</div>
        {categories.map((c) => {
          const active = activeCategory?.id === c.id;
          return (
            <button key={c.id} onClick={() => onGoCategory(c.id)} onMouseEnter={() => setActiveCat(c.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                background: active ? T.ink : "transparent", color: active ? T.cream : T.ink,
                border: "none", borderRadius: 8, padding: "8px 10px", fontFamily: "'Ubuntu', sans-serif",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
              }}>
              <CategoryIcon icon={c.icon} size={15} /> {c.name}
            </button>
          );
        })}
      </div>
      <div className="cuppa-megamenu-col" style={{ minWidth: 150 }}>
        <div style={sideLabel}>Брэнд</div>
        <div className="cuppa-megamenu-brands">
          {brands.map((b) => (
            <button key={b.id} onClick={() => onGoBrand(b.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "transparent", color: T.ink,
                border: "none", borderRadius: 8, padding: "6px 10px", fontFamily: "'Ubuntu', sans-serif",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.ink; e.currentTarget.style.color = T.cream; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.ink; }}
            >
              {b.logo && <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain", flexShrink: 0, background: "#fff" }} />}
              {b.name}
            </button>
          ))}
        </div>
        {brands.length === 0 && (
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, opacity: 0.7 }}>Брэнд алга</div>
        )}
      </div>
    </div>
  );
}

export function MobileDrawer({ open, onClose, categories, brands, onGoCategory, onGoBrand, setView }) {
  useEffect(() => {
    if (!open) return;
    // Зөвхөн body { overflow: hidden } нь mobile Safari/Chrome дээр touch-scroll-ыг
    // бүрэн блоклодоггүй тул body-г өөрийг нь position:fixed болгож бүрэн түгжинэ.
    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.left = "0";
    style.right = "0";
    return () => {
      style.position = "";
      style.top = "";
      style.left = "";
      style.right = "";
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const goPage = (name) => { setView({ name }); onClose(); };
  const linkBtnStyle = {
    display: "flex", alignItems: "center", width: "100%", textAlign: "left",
    background: "transparent", color: T.ink, border: "none", borderRadius: 8,
    padding: "10px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 14.5, fontWeight: 600, cursor: "pointer",
  };
  const catBtnStyle = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
    background: "transparent", color: T.ink, border: "none", borderRadius: 8,
    padding: "8px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
  };
  const brandBtnStyle = {
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
    background: "transparent", color: T.ink, border: "none", borderRadius: 8,
    padding: "6px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 199,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s ease",
      }} />
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: "82%", maxWidth: 320,
        background: T.paper, zIndex: 200, boxShadow: "8px 0 30px rgba(0,0,0,.25)",
        transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .32s ease",
        display: "flex", flexDirection: "column", overflowY: "auto", WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
      }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${T.line}`, flexShrink: 0, position: "relative" }}>
          <button onClick={onClose} aria-label="Хаах" style={{ ...iconBtnStyle, color: T.ink }}><X size={21} /></button>
          <img src="/cuppa-logo.png" alt="CUPPA" style={{ height: 26, filter: "invert(1)", position: "absolute", left: "50%", transform: "translateX(-50%)" }} />
        </div>

        <div className="cuppa-drawer-content">
          <div style={{ padding: "14px 18px 4px", display: "flex", flexDirection: "column", gap: 2 }}>
            <button onClick={() => goPage("bestseller")} style={linkBtnStyle}>Бестселлэр</button>
            <button onClick={() => goPage("training")} style={linkBtnStyle}>Сургалт</button>
          </div>

          <div style={{ padding: "14px 18px 4px" }}>
            <div style={sideLabel}>Бүтээгдэхүүн</div>
            {categories.map((c) => (
              <button key={c.id} onClick={() => onGoCategory(c.id)} style={catBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.ink; e.currentTarget.style.color = T.cream; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.ink; }}
              >
                <CategoryIcon icon={c.icon} size={15} /> {c.name}
              </button>
            ))}
          </div>

          <div style={{ padding: "14px 18px 24px" }}>
            <div style={sideLabel}>Брэнд</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
              {brands.map((b) => (
                <button key={b.id} onClick={() => onGoBrand(b.id)} style={brandBtnStyle}>
                  {b.logo &&
                    <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain", flexShrink: 0, background: "#fff" }} />}
                  {b.name}
                </button>
              ))}
            </div>
            {brands.length === 0 && (
              <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, opacity: 0.7 }}>Брэнд алга</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function Header({ setView, cartCount, wishCount, onOpenCart, onSearch }) {
  const { categories, brands, products } = useContext(DataContext);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const navRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const [menuLeft, setMenuLeft] = useState(0);

  useEffect(() => {
    if (categories.length && activeCat == null) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (menuOpen && menuTriggerRef.current) {
      setMenuLeft(menuTriggerRef.current.offsetLeft + menuTriggerRef.current.offsetWidth / 2);
    }
  }, [menuOpen]);

  const goCategory = (id) => { setView({ name: "category", categoryId: id }); setMenuOpen(false); setDrawerOpen(false); };
  const goBrand = (brandId) => { setView({ name: "brand", brandId }); setMenuOpen(false); setDrawerOpen(false); };

  return (
    <>
    <header style={{
      background: "rgba(36,28,20,.65)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      color: T.cream, position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(255,255,255,.08)",
    }}>
      <div className="cuppa-header-row" style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div className="cuppa-logo" onClick={() => setView({ name: "home" })} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
          <img src="/cuppa-logo.png" alt="CUPPA" style={{ height: 26, display: "block" }} />
        </div>

        <nav ref={navRef} className="cuppa-nav" style={{ position: "relative", flex: 1 }}>
          <button className="cuppa-hamburger" onClick={() => setDrawerOpen(true)} aria-label="Цэс" style={iconBtnStyle}>
            <Menu size={21} />
          </button>
          <div className="cuppa-nav-links" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <NavButton ref={menuTriggerRef} active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              Ангилал <ChevronDown size={14} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .35s" }} />
            </NavButton>
            <NavButton onClick={() => setView({ name: "bestseller" })}>Бестселлэр</NavButton>
            <NavButton onClick={() => setView({ name: "training" })}>Сургалт</NavButton>
          </div>

          {menuOpen && (
            <ProductsMegaMenu categories={categories} brands={brands} products={products}
              activeCat={activeCat} setActiveCat={setActiveCat} onGoCategory={goCategory} onGoBrand={goBrand}
              left={menuLeft} />
          )}
        </nav>

        <form className={`cuppa-search-form${searchOpen ? " cuppa-search-open" : ""}`} onSubmit={(e) => { e.preventDefault(); onSearch(q); setSearchOpen(false); }}
          style={{ display: "flex", alignItems: "center", background: "rgba(253, 252, 252, 0.43)", borderRadius: 999, padding: "6px 12px", gap: 8, width: 200 }}>
          <Search size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Хайх..." autoFocus={searchOpen} className="cuppa-search-input"
            style={{ background: "transparent", border: "none", outline: "none", color: T.ink, fontFamily: "'Ubuntu', sans-serif", fontSize: 13, width: "100%" }} />
          {searchOpen && (
            <button type="button" onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.paper, opacity: 0.75, display: "flex", flexShrink: 0, padding: 0 }}>
              <X size={16} />
            </button>
          )}
        </form>

        <div className="cuppa-icons" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {!searchOpen && (
            <button className="cuppa-search-toggle" onClick={() => setSearchOpen(true)} style={iconBtnStyle}>
              <Search size={19} />
            </button>
          )}
          <div className={`cuppa-icons-rest${searchOpen ? " cuppa-icons-rest-hidden" : ""}`} style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button onClick={() => setView({ name: "wishlist" })} style={iconBtnStyle}>
              <Heart size={19} /> {wishCount > 0 && <Badge n={wishCount} />}
            </button>
            <button onClick={onOpenCart} style={iconBtnStyle}>
              <ShoppingBag size={19} /> {cartCount > 0 && <Badge n={cartCount} />}
            </button>
          </div>
        </div>
      </div>
    </header>
    <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
      categories={categories} brands={brands} onGoCategory={goCategory} onGoBrand={goBrand} setView={setView} />
    </>
  );
}

export function Badge({ n }) {
  return <span style={{
    position: "absolute", top: -3, right: -3, background: T.cherry, color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
    fontFamily: "'Ubuntu', sans-serif",
  }}>{n}</span>;
}

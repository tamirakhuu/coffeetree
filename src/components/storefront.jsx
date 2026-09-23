import { CoffeeBeanIcon, TeaLeafIcon, SyrupIcon, SauceIcon, PowderIcon, SmoothieIcon, TamperIcon, PaperCupIcon } from "../categoryIcons.jsx";
import React, { createContext, useState, useEffect, useRef, useContext } from "react";
import { Check, ArrowUp, X, ShoppingBag, Heart, Search, ChevronDown, Menu, ChevronLeft, Plus, Minus, ArrowRight, Trash2, Facebook, Instagram, MapPin, Phone, Mail, Clock } from "lucide-react";
import { computeLineTotal } from "../api.js";
import { Link } from "react-router-dom";

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

export function slugify(str) {
  return (str || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function viewFromLocation(pathname, search) {
  const params = new URLSearchParams(search);
  let m;
  if ((m = pathname.match(/^\/category\/(\d+)\/?$/))) return { name: "category", categoryId: Number(m[1]) };
  if ((m = pathname.match(/^\/brand\/([^/]+)\/?$/))) return { name: "brand", brandSlug: m[1] };
  if ((m = pathname.match(/^\/product\/(\d+)\/?$/))) return { name: "product", productId: Number(m[1]) };
  if (pathname === "/bestseller") return { name: "bestseller" };
  if (pathname === "/new") return { name: "new" };
  if (pathname === "/training") return { name: "training" };
  if (pathname === "/discount") return { name: "discounts" };
  if (pathname === "/order-status") return { name: "order-status" };
  if (pathname === "/training-status") return { name: "training-status" };
  if (pathname === "/checkout") return { name: "checkout" };
  if (pathname === "/wishlist") return { name: "wishlist" };
  if (pathname === "/about") return { name: "about" };
  if (pathname === "/search") return { name: "search", query: params.get("q") || "" };
  if (pathname === "/payment") return { name: "payment" };
  if (pathname === "/confirmation") return { name: "confirmation" };
  return { name: "home" };
}

export function pathForView(view, brands = []) {
  switch (view?.name) {
    case "category": return `/category/${view.categoryId}`;
    case "brand": {
      const brand = brands.find((b) => b.id === view.brandId);
      return `/brand/${slugify(brand?.name || "")}`;
    }
    case "product": return `/product/${view.productId}`;
    case "bestseller": return "/bestseller";
    case "new": return "/new";
    case "training": return "/training";
    case "discounts": return "/discount";
    case "order-status": return "/order-status";
    case "training-status": return "/training-status";
    case "checkout": return "/checkout";
    case "wishlist": return "/wishlist";
    case "about": return "/about";
    case "search": return view.query ? `/search?q=${encodeURIComponent(view.query)}` : "/search";
    case "payment": return "/payment";
    case "confirmation": return "/confirmation";
    default: return "/";
  }
}

export const ICONS = {
  CoffeeBean: CoffeeBeanIcon,
  TeaLeaf: TeaLeafIcon,
  Syrup: SyrupIcon,
  Sauce: SauceIcon,
  Powder: PowderIcon,
  Smoothie: SmoothieIcon,
  Wrench: TamperIcon,
  PaperCup: PaperCupIcon,
};

export const ICON_KEYS = Object.keys(ICONS);

export function CategoryIcon({ icon, size = 20, color }) {
  if (icon && /^https?:\/\//.test(icon)) {
    return (
      <span
        role="img"
        style={{
          display: "inline-block", width: size, height: size, flexShrink: 0,
          backgroundColor: color || "currentColor",
          WebkitMaskImage: `url(${icon})`, maskImage: `url(${icon})`,
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
          WebkitMaskSize: "contain", maskSize: "contain",
        }}
      />
    );
  }
  const Icon = ICONS[icon] || CoffeeBeanIcon;
  return <Icon size={size} color={color} />;
}

export const money = (n) => Math.round(n || 0).toLocaleString("mn-MN") + "₮";

export const discountPercent = (option) => {
  if (!option || !option.price || !option.originalPrice || option.originalPrice <= option.price) return null;
  return Math.round((1 - option.price / option.originalPrice) * 100);
};

export const initials = (str) => (str || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const formatCountdown = (endsAt) => {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days} өдөр ${hours} цаг`;
  if (hours > 0) return `${hours} цаг ${mins} мин`;
  if (mins > 0) return `${mins} мин`;
  return `${secs} сек`;
};

export const DataContext = createContext({ categories: [], brands: [], products: [] });

export function StampBadge({ label, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "999px", border: `2px dashed ${T.cream}`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.cream,
      fontFamily: "'Ubuntu', sans-serif", fontSize: size * 0.28, fontWeight: 600,
      letterSpacing: "0.02em", transform: "rotate(-8deg)", flexShrink: 0, opacity: 0.9,
    }}>{label}</div>
  );
}

export function ProductArt({ product, height = 190 }) {
  const hasImage = product.images && product.images.length > 0;
  const hoverImage = hasImage && product.images.length > 1 ? product.images[1] : null;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height, borderRadius: "14px 14px 4px 4px", position: "relative", overflow: "hidden",
        background: hasImage ? T.card : `linear-gradient(155deg, ${product.color} 0%, ${T.ink} 130%)`,
      }}>
      {hasImage ? (
        <>
          <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
          {hoverImage && (
            <img src={hoverImage} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: T.card,
              opacity: hovered ? 1 : 0, transition: "opacity .25s ease",
            }} />
          )}
        </>
      ) : (
        <>
          <div style={{
            position: "absolute", inset: 0, opacity: 0.12, backgroundImage:
              "radial-gradient(circle at 20% 30%, #fff 0, transparent 3px), radial-gradient(circle at 70% 60%, #fff 0, transparent 3px), radial-gradient(circle at 40% 80%, #fff 0, transparent 2px)",
            backgroundSize: "40px 40px",
          }} />
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <StampBadge label={initials(product.name)} />
          </div>
        </>
      )}
      {product.tag && (
        <span style={{
          position: "absolute", top: hasImage ? 10 : 80, left: 12, fontFamily: "'Ubuntu', sans-serif",
          fontSize: 11, letterSpacing: "0.06em", color: T.paper, background: product.tag === "шинэ" ? T.green : T.gold,
          padding: "3px 9px", borderRadius: 999, fontWeight: 600, textTransform: "uppercase",
        }}>
          {product.tag === "хямдралтай" && discountPercent(product.unit) != null
            ? `-${discountPercent(product.unit)}%`
            : product.tag}
        </span>
      )}
    </div>
  );
}

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

export const iconBtnStyle = { position: "relative", background: "transparent", border: "none", color: T.cream, cursor: "pointer", display: "flex", padding: 4 };

export function Badge({ n }) {
  return <span style={{
    position: "absolute", top: -3, right: -3, background: T.cherry, color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
    fontFamily: "'Ubuntu', sans-serif",
  }}>{n}</span>;
}

export function ProductCard({ product, onOpen, isWished, onToggleWish, variant }) {
  const { brands } = useContext(DataContext);
  const brand = brands.find((b) => b.id === product.brandId);
  const optionType = availableOptionTypes(product)[0] || "unit";
  const option = product[optionType];
  const inkCard = variant === "ink";
  const soldOut = availableOptionTypes(product).every((t) => (product[t]?.stock || 0) <= 0);
  return (
    <div className="cuppa-product-card" style={{
      background: inkCard ? T.ink : "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      borderRadius: "25px 25px 14px 14px", border: inkCard ? "1px solid rgb(255, 255, 255)" : "none", overflow: "hidden",
      display: "flex", flexDirection: "column", boxShadow: inkCard ? "0 4px 16px rgba(36,28,20,.35)" : "0 1px 4px rgba(36,28,20,.12)",
      transition: "transform .15s ease, box-shadow .15s ease",
    }}>
      <div style={{ cursor: "pointer", borderBottom: `1px solid ${T.line}` }} onClick={() => onOpen(product)}>
        <ProductArt product={product} />
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 11, color: inkCard ? "rgba(255,255,255,.75)" : T.moss, textTransform: "uppercase", letterSpacing: "0.05em" }}>{brand?.name}</span>
          <button onClick={() => onToggleWish(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: isWished ? (inkCard ? "#fff" : T.cherry) : (inkCard ? "rgba(255,255,255,.6)" : T.inkSoft) }}>
            <Heart size={16} fill={isWished ? (inkCard ? "#fff" : T.cherry) : "none"} />
          </button>
        </div>
        <div onClick={() => onOpen(product)} style={{ cursor: "pointer", fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 700, color: inkCard ? "#fff" : T.ink, lineHeight: 1.25 }}>
          {product.name}
        </div>
        <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, color: inkCard ? "rgba(255,255,255,.7)" : T.inkSoft }}>{product.origin}</div>
        <div className="cuppa-product-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8, gap: 6 }}>
          <span className="cuppa-product-price" style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 15, color: inkCard ? T.paper : T.ink }}>{money(option.price)}</span>
          <button className="cuppa-product-detail-btn" onClick={() => onOpen(product)} style={{
            background: soldOut ? T.line : (inkCard ? "#fff" : T.ink), color: soldOut ? T.inkSoft : (inkCard ? T.ink : "#fff"), border: "none", borderRadius: 999, padding: "7px 13px",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>{soldOut ? "Дууссан" : "Дэлгэрэнгүй"}</button>
        </div>
      </div>
    </div>
  );
}

export const sideLabel = { fontFamily: "'Ubuntu', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10 };

export const backBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20, padding: 0, flexShrink: 0 };

export function BackButton({ onClick, style }) {
  return <button onClick={onClick} style={{ ...backBtnStyle, ...style }}><ChevronLeft size={15} /> Буцах</button>;
}

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

export const subBtn = (active) => ({
  display: "block", width: "100%", textAlign: "left", background: active ? "#E4E1DC" : "transparent",
  color: T.ink, border: `1px solid ${active ? "#E4E1DC" : "transparent"}`,
  borderRadius: 8, padding: "7px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5,
  cursor: "pointer", marginBottom: 4,
});

export const availableOptionTypes = (product) =>
  product ? ["unit", "box"].filter((t) => (product[t]?.price || 0) > 0) : [];

export const displayPrice = (product) => {
  const t = availableOptionTypes(product)[0];
  return t ? product[t].price : 0;
};

export const stepBtn = { border: "none", background: "none", padding: "9px 12px", cursor: "pointer", color: T.ink, display: "flex" };

export function CartDrawer({ open, onClose, cart, updateQty, removeItem, subtotal, onCheckout }) {
  const { products } = useContext(DataContext);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none", transition: "opacity .25s", zIndex: 150,
      }} />
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100%", width: 380, maxWidth: "90vw", background: T.paper,
        transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .3s ease",
        zIndex: 160, display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,.2)",
      }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink }}>Сагс</span>
          <button onClick={onClose} style={{ ...iconBtnStyle, color: T.ink }}><X size={21} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
          {cart.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, marginTop: 30, textAlign: "center" }}>Таны сагс хоосон байна.</div>}
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const option = product[item.optionType];
            return (
              <div key={item.productId + item.optionType + (item.note || "")} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                {product.images && product.images.length ? (
                  <img src={product.images[0]} alt={product.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: T.card }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(155deg, ${product.color}, ${T.ink})`, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{product.name}</div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.moss, margin: "3px 0" }}>{option.label}{item.note ? ` · ${item.note}` : ""}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.line}`, borderRadius: 999 }}>
                      <button onClick={() => updateQty(item.productId, item.optionType, item.note, Math.max(1, item.qty - 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Minus size={11} /></button>
                      <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, width: 22, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.productId, item.optionType, item.note, Math.min(option.stock || item.qty, item.qty + 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Plus size={11} /></button>
                    </div>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, fontWeight: 600, color: T.ink }}>{money(computeLineTotal(product, item.optionType, item.qty))}</span>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId, item.optionType, item.note)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, alignSelf: "flex-start" }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontFamily: "'Ubuntu', sans-serif" }}>
              <span style={{ color: T.inkSoft, fontSize: 14 }}>Нийт дүн</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 17, color: T.ink }}>{money(subtotal)}</span>
            </div>
            <button onClick={onCheckout} style={{
              width: "100%", background: T.cherry, color: "#fff", border: "none", borderRadius: 999,
              padding: "13px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>Захиалга үүсгэх <ArrowRight size={16} /></button>
          </div>
        )}
      </div>
    </>
  );
}

export const inputStyle = { padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, background: T.card, color: T.ink, outline: "none", boxSizing: "border-box" };

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

export function formatMnDate(d) {
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}`;
}

export const BRANCHES = [
  {
    name: "Саруул зах",
    heading: "Дэлгүүрийн хаяг",
    address: "Саруул зах, 2 давхар, CUPPA 09:00 - 19:00",
    teaBreak: "13:00 - 13:30",
    mapUrl: "https://maps.app.goo.gl/ZAZ4cCXETKV2xaSm8",
    phone: "70111772",
    email: "coffeetree2017@gmail.com",
    socials: [
      { label: "CuppA", href: "https://www.facebook.com/profile.php?id=100053215639953", Icon: Facebook },
      { label: "cuppa_coffeesupply", href: "https://www.instagram.com/cuppa_coffeesupply/", Icon: Instagram },
    ],
  },
  {
    name: "Яармаг",
    address: "Яармаг City Palace 3 давхар 11:00 - 19-00",
    teaBreak: "13:00 - 13:30",
    mapUrl: "https://maps.app.goo.gl/CqwyKw4dLudAQbU68",
    phone: "76111772",
    email: "cuppayarmag@gmail.com",
    socials: [
      { label: "CuppA Яармаг", href: "https://www.facebook.com/profile.php?id=61578460444954", Icon: Facebook },
      { label: "cuppa2026", href: "https://www.instagram.com/cuppa2026/", Icon: Instagram },
    ],
  },
];

export const primaryBtn = { background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

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

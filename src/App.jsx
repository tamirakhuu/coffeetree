import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingBag, Heart, Search, User, X, Plus, Minus, ChevronDown,
  ChevronLeft, ChevronRight, Check, Coffee,
  Package, ArrowRight, ArrowUp, LogOut, Trash2, ShieldAlert, MapPin, Phone, Mail,
  Facebook, Instagram, Eye, EyeOff, Menu
} from "lucide-react";
import { fetchBootstrap, submitOrder, fetchMyOrders, computeLineTotal, shapeProduct, DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from "./api.js";
import { supabase } from "./supabaseClient.js";
import { registerWithEmail, loginWithEmail, loginWithFacebook, logout, shapeAuthUser, updateProfile, deleteAccount, sendPasswordReset, updatePassword } from "./auth.js";
import { CoffeeBeanIcon, TeaLeafIcon, SyrupIcon, SauceIcon, PowderIcon, SmoothieIcon, TamperIcon, PaperCupIcon } from "./categoryIcons.jsx";
/*  Design tokens */
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
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap');";

/*  URL routing helpers — view state, ялдаа/огт солигдоогүй нэрсээр, address bar-той синхрончлогдоно  */
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
  if (pathname === "/training") return { name: "training" };
  if (pathname === "/discount") return { name: "discounts" };
  if (pathname === "/profile") return { name: "profile", section: params.get("section") || "info" };
  if (pathname === "/checkout") return { name: "checkout" };
  if (pathname === "/wishlist") return { name: "wishlist" };
  if (pathname === "/about") return { name: "about" };
  if (pathname === "/search") return { name: "search", query: params.get("q") || "" };
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
    case "training": return "/training";
    case "discounts": return "/discount";
    case "profile": return view.section && view.section !== "info" ? `/profile?section=${view.section}` : "/profile";
    case "checkout": return "/checkout";
    case "wishlist": return "/wishlist";
    case "about": return "/about";
    case "search": return view.query ? `/search?q=${encodeURIComponent(view.query)}` : "/search";
    case "confirmation": return "/confirmation";
    default: return "/";
  }
}

const ICONS = {
  CoffeeBean: CoffeeBeanIcon,
  TeaLeaf: TeaLeafIcon,
  Syrup: SyrupIcon,
  Sauce: SauceIcon,
  Powder: PowderIcon,
  Smoothie: SmoothieIcon,
  Wrench: TamperIcon,
  PaperCup: PaperCupIcon,
};
const ICON_KEYS = Object.keys(ICONS);

function CategoryIcon({ icon, size = 20, color }) {
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

const money = (n) => Math.round(n || 0).toLocaleString("mn-MN") + "₮";
const discountPercent = (option) => {
  if (!option || !option.price || !option.originalPrice || option.originalPrice <= option.price) return null;
  return Math.round((1 - option.price / option.originalPrice) * 100);
};
const initials = (str) => (str || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export const DataContext = createContext({ categories: [], brands: [], products: [] });

function StampBadge({ label, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "999px", border: `2px dashed ${T.cream}`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.cream,
      fontFamily: "'Ubuntu', sans-serif", fontSize: size * 0.28, fontWeight: 600,
      letterSpacing: "0.02em", transform: "rotate(-8deg)", flexShrink: 0, opacity: 0.9,
    }}>{label}</div>
  );
}

function ProductArt({ product, height = 190 }) {
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
          fontSize: 11, letterSpacing: "0.06em", color: T.paper, background: T.gold,
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

function Toast({ message }) {
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

function ScrollToTopButton() {
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

/*  Header  */
const NavButton = React.forwardRef(function NavButton({ onClick, active, children }, ref) {
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

function ProductsMegaMenu({ categories, brands, products, activeCat, setActiveCat, onGoCategory, onGoBrand, left }) {
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
              {b.logo
                ? <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain", flexShrink: 0, background: "#fff" }} />
                : <span style={{ width: 18, height: 18, borderRadius: 4, background: T.line, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.inkSoft }}>{(b.name || "?")[0].toUpperCase()}</span>}
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

function MobileDrawer({ open, onClose, categories, brands, onGoCategory, onGoBrand, setView }) {
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
              <button key={c.id} onClick={() => onGoCategory(c.id)} style={catBtnStyle}>
                <CategoryIcon icon={c.icon} size={15} /> {c.name}
              </button>
            ))}
          </div>

          <div style={{ padding: "14px 18px 24px" }}>
            <div style={sideLabel}>Брэнд</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
              {brands.map((b) => (
                <button key={b.id} onClick={() => onGoBrand(b.id)} style={brandBtnStyle}>
                  {b.logo
                    ? <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain", flexShrink: 0, background: "#fff" }} />
                    : <span style={{ width: 18, height: 18, borderRadius: 4, background: T.line, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.inkSoft }}>{(b.name || "?")[0].toUpperCase()}</span>}
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

export function Header({ setView, cartCount, wishCount, user, onOpenCart, onOpenAuth, onSearch }) {
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
            {user ? (
              <button onClick={() => setView({ name: "profile", section: "info" })} title="Профайл" style={{
                width: 30, height: 30, borderRadius: "50%", background: T.cherry, color: "#fff",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Ubuntu', sans-serif", fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>{(user.name || "?").trim().charAt(0).toUpperCase()}</button>
            ) : (
              <button onClick={onOpenAuth} style={iconBtnStyle}><User size={19} /></button>
            )}
          </div>
        </div>
      </div>
    </header>
    <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
      categories={categories} brands={brands} onGoCategory={goCategory} onGoBrand={goBrand} setView={setView} />
    </>
  );
}
const iconBtnStyle = { position: "relative", background: "transparent", border: "none", color: T.cream, cursor: "pointer", display: "flex", padding: 4 };
function Badge({ n }) {
  return <span style={{
    position: "absolute", top: -3, right: -3, background: T.cherry, color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
    fontFamily: "'Ubuntu', sans-serif",
  }}>{n}</span>;
}

/*  Product Card                                                       */
function ProductCard({ product, onOpen, isWished, onToggleWish, variant }) {
  const { brands } = useContext(DataContext);
  const brand = brands.find((b) => b.id === product.brandId);
  const optionType = availableOptionTypes(product)[0] || "unit";
  const option = product[optionType];
  const inkCard = variant === "ink";
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
          <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 15, color: inkCard ? T.paper : T.ink }}>{money(option.price)}</span>
          <button onClick={() => onOpen(product)} style={{
            background: inkCard ? "#fff" : T.ink, color: inkCard ? T.ink : "#fff", border: "none", borderRadius: 999, padding: "7px 13px",
            fontFamily: "'Nunito Sans', sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>Дэлгэрэнгүй</button>
        </div>
      </div>
    </div>
  );
}
/*  Category Page                                                      */
function CategoryPage({ categoryId, brandFilter, setBrandFilter, subFilter, setSubFilter, sortBy, setSortBy, onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { categories, brands, products } = useContext(DataContext);
  const productsRef = useRef(null);
  const chooseSub = (s) => {
    setSubFilter(s);
    if (window.innerWidth <= 720 && productsRef.current) {
      setTimeout(() => productsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };
  const category = categories.find((c) => c.id === categoryId);
  let items = products.filter((p) => p.categoryId === categoryId);
  if (subFilter) items = items.filter((p) => p.sub === subFilter);
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));

  const brandsInCat = brands.filter((b) => products.some((p) => p.categoryId === categoryId && p.brandId === b.id));

  if (!category) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Ангилал олдсонгүй.</div>;

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title={category.name} />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <CollapsibleSection label="ТӨРӨЛ">
          <button onClick={() => chooseSub(null)} style={subBtn(subFilter === null)}>Бүгд</button>
          {category.sub.map((s) => (
            <button key={s} onClick={() => chooseSub(s)} style={subBtn(subFilter === s)}>{s}</button>
          ))}
        </CollapsibleSection>

        <CollapsibleSection label="Брэнд">
          {brandsInCat.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
        </CollapsibleSection>
      </aside>

      <div ref={productsRef} style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="new">Шинэ эхэндээ</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Тохирох бараа олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}
function BrandPage({ brandId, onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { categories, brands, products } = useContext(DataContext);
  const brand = brands.find((b) => b.id === brandId);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const productsRef = useRef(null);
  const chooseCategory = (id) => {
    setCategoryFilter(id);
    if (window.innerWidth <= 720 && productsRef.current) {
      setTimeout(() => productsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  useEffect(() => { setCategoryFilter(null); setSortBy("default"); }, [brandId]);

  if (!brand) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Брэнд олдсонгүй.</div>;

  let items = products.filter((p) => p.brandId === brandId);
  if (categoryFilter) items = items.filter((p) => p.categoryId === categoryFilter);
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));

  const categoriesInBrand = categories.filter((c) => products.some((p) => p.brandId === brandId && p.categoryId === c.id));

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title={brand.name} />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        {brand.logo && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <img src={brand.logo} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "contain", background: "#fff", border: `1px solid ${T.line}` }} />
          </div>
        )}
        <CollapsibleSection label="Ангилал">
          <button onClick={() => chooseCategory(null)} style={subBtn(categoryFilter === null)}>Бүгд</button>
          {categoriesInBrand.map((c) => (
            <button key={c.id} onClick={() => chooseCategory(c.id)} style={subBtn(categoryFilter === c.id)}>{c.name}</button>
          ))}
        </CollapsibleSection>
      </aside>

      <div ref={productsRef} style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="new">Шинэ эхэндээ</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Тохирох бараа олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}

const detailImgArrowStyle = {
  position: "absolute", top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%",
  border: "none", cursor: "pointer", background: "rgba(36,28,20,.5)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
};
const sideLabel = { fontFamily: "'Ubuntu', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10 };
const backBtnStyle = { display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20, padding: 0, flexShrink: 0 };
function BackButton({ onClick, style }) {
  return <button onClick={onClick} style={{ ...backBtnStyle, ...style }}><ChevronLeft size={15} /> Буцах</button>;
}
function PageHeaderRow({ onBack, title }) {
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
function CollapsibleSection({ label, children, defaultOpen = true }) {
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
const subBtn = (active) => ({
  display: "block", width: "100%", textAlign: "left", background: active ? "#E4E1DC" : "transparent",
  color: T.ink, border: `1px solid ${active ? "#E4E1DC" : "transparent"}`,
  borderRadius: 8, padding: "7px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5,
  cursor: "pointer", marginBottom: 4,
});

/*  Product Detail                                                     */
const availableOptionTypes = (product) =>
  product ? ["unit", "box"].filter((t) => (product[t]?.price || 0) > 0) : [];
const displayPrice = (product) => {
  const t = availableOptionTypes(product)[0];
  return t ? product[t].price : 0;
};

const PUMP_SUGGESTIONS = { "Соус": "Sauce pump", "Сироп": "Syrup pump", "Смүүти": "Sauce pump" };
function cupAccessorySuggestions(product, categoryName, products) {
  if (categoryName !== "Нэг удаагийн хэрэгсэл") return [];
  const sub = product.sub || "";
  const isDessertCup = /зайрмаг|десерт/i.test(sub);
  const isCup = /аяга/i.test(sub) && !isDessertCup;
  if (!isCup) return [];

  const findAll = (re) => products.filter((p) => p.id !== product.id && re.test(p.name));
  const list = [];
  const isHot = /халуу/i.test(sub) || /халуу/i.test(product.name);
  const isCold = /хүйт/i.test(sub) || /хүйт/i.test(product.name);
  const parseSleeveSizes = (name) => {
    const m = name.match(/(\d+(?:\s*\/\s*\d+)*)\s*oz/i);
    return m ? m[1].split("/").map((s) => parseInt(s.trim(), 10)) : [];
  };
  const ozMatch = product.name.match(/(\d+)\s*oz/i);
  const oz = ozMatch ? parseInt(ozMatch[1], 10) : null;
  if (oz != null) {
    const skipSleeve = isCold && [10, 13].includes(oz);
    if (!skipSleeve) {
      const allSleeves = findAll(/sleeve/i);
      const sizedMatch = allSleeves.filter((p) => parseSleeveSizes(p.name).includes(oz));
      const universalSleeves = allSleeves.filter((p) => parseSleeveSizes(p.name).length === 0);
      list.push(...(sizedMatch.length ? sizedMatch : universalSleeves));
    }
  }

  if (isHot) {
    list.push(...findAll(/халуун.*соруул|соруул.*халуун/i));
  } else if (isCold) {
    list.push(...findAll(/хүйт.*соруул|соруул.*хүйт|шэйк|смүүти/i));
  }
  list.push(...findAll(/takeaway/i).filter((p) => !/sleeve/i.test(p.name)));

  return [...new Map(list.map((p) => [p.id, p])).values()];
}

const BREW_METHODS = [
  { key: "espresso", name: "Espresso / Delonghi", grindMn: "Fine", compare: "0.260мм" },
  { key: "mokapot", name: "Mokapot", grindMn: "Medium-Fine", compare: "0.350мм" },
  { key: "autodrip", name: "Drip/ Pour Over", grindMn: "Medium", compare: "0.700мм" },
  { key: "frenchpress", name: "Aero Press", grindMn: "Coarse", compare: "0.400мм" },
];

function ProductDetail({ product, onBack, onAddToCart, onQuickAdd, isWished, onToggleWish, onOpen, wishlist }) {
  const { brands, categories, products } = useContext(DataContext);
  const availableTypes = availableOptionTypes(product);
  const [optionType, setOptionType] = useState(() => availableTypes[0] || "unit");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [grindForm, setGrindForm] = useState("whole");
  const [brewMethod, setBrewMethod] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const zoomWrapRef = useRef(null);

  useEffect(() => {
    setOptionType(availableOptionTypes(product)[0] || "unit");
    setQty(1); setActiveImg(0); setGrindForm("whole"); setBrewMethod(null); setZoomed(false);
  }, [product?.id]);
  useEffect(() => {
    const el = zoomWrapRef.current;
    if (!el) return;
    const updatePos = (touch) => {
      const rect = el.getBoundingClientRect();
      setZoomPos({
        x: Math.min(100, Math.max(0, ((touch.clientX - rect.left) / rect.width) * 100)),
        y: Math.min(100, Math.max(0, ((touch.clientY - rect.top) / rect.height) * 100)),
      });
    };
    const onTouchStart = (e) => { setZoomed(true); updatePos(e.touches[0]); };
    const onTouchMove = (e) => { e.preventDefault(); updatePos(e.touches[0]); };
    const onTouchEnd = () => setZoomed(false);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [product?.id]);

  if (!product) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Бараа олдсонгүй.</div>;
  const option = product[optionType];
  const outOfStock = (option.stock || 0) <= 0;
  const brand = brands.find((b) => b.id === product.brandId);
  const images = product.images && product.images.length ? product.images : null;
  const productCategory = categories.find((c) => c.id === product.categoryId);
  const isCoffee = productCategory?.name === "Кофе";
  const bulkBoxQty = product.box?.price > 0 ? product.bulkQty : undefined;
  const pumpName = productCategory && PUMP_SUGGESTIONS[productCategory.name];
  const suggestedPump = pumpName
    ? products.find((p) => p.id !== product.id && p.name.trim().toLowerCase() === pumpName.toLowerCase())
    : null;
  const cupSuggestions = cupAccessorySuggestions(product, productCategory?.name, products);
  const suggestions = suggestedPump ? [suggestedPump, ...cupSuggestions] : cupSuggestions;
  const sameNameOtherBrands = products.filter((p) =>
    p.brandId !== product.brandId && p.name.trim().toLowerCase() === product.name.trim().toLowerCase());
  const selectedBrew = grindForm === "ground" ? BREW_METHODS.find((m) => m.key === brewMethod) : null;
  const grindNote = isCoffee ? (grindForm === "ground" ? (selectedBrew ? `Бутласан · ${selectedBrew.name}` : "Бутласан") : "Үрээр") : undefined;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 90px" }}>
      <BackButton onClick={onBack} />
      <div className="cuppa-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
        <div>
          {images ? (
            <div
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setZoomPos({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
              }}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
              ref={zoomWrapRef}
              style={{ position: "relative", height: 420, borderRadius: "14px 14px 4px 4px", overflow: "hidden", background: T.card, cursor: "zoom-in", touchAction: "none" }}>
              <img src={images[activeImg]} alt={product.name} style={{
                width: "100%", height: "100%", objectFit: "contain", display: "block",
                transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transition: zoomed ? "none" : "transform .25s ease",
              }} />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i - 1 + images.length) % images.length); }}
                    onMouseEnter={(e) => { e.stopPropagation(); setZoomed(false); }}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseLeave={(e) => { e.stopPropagation(); setZoomed(true); }}
                    aria-label="Өмнөх зураг" style={{ ...detailImgArrowStyle, left: 10, cursor: "pointer" }}>
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveImg((i) => (i + 1) % images.length); }}
                    onMouseEnter={(e) => { e.stopPropagation(); setZoomed(false); }}
                    onMouseMove={(e) => e.stopPropagation()}
                    onMouseLeave={(e) => { e.stopPropagation(); setZoomed(true); }}
                    aria-label="Дараах зураг" style={{ ...detailImgArrowStyle, right: 10, cursor: "pointer" }}>
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <ProductArt product={product} height={420} />
          )}
          {images && images.length > 1 && (
            <div className="cuppa-thumb-row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {images.map((src, i) => (
                <button key={i} onClick={() => { setActiveImg(i); setZoomed(false); }} style={{
                  width: 64, height: 64, borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
                  border: activeImg === i ? `2px solid ${T.cherry}` : `1px solid ${T.line}`, flexShrink: 0,
                }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="cuppa-detail-info">
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.moss, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{brand?.name} · {product.sub}</div>
          <h1 className="cuppa-detail-title" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 32, fontWeight: 700, color: T.ink, margin: "0 0 8px", lineHeight: 1.15 }}>{product.name}</h1>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14, color: T.inkSoft, marginBottom: 18 }}>{product.origin}</div>
          <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.ink, lineHeight: 1.6, marginBottom: 26 }}>{product.desc}</p>

          {availableTypes.length > 1 && (
          <div style={{ marginBottom: 22 }}>
            <div style={sideLabel}>Савлагаа сонгох</div>
            <div style={{ display: "flex", gap: 10 }}>
              {availableTypes.map((t) => (
                <button key={t} onClick={() => { setOptionType(t); setQty(1); }} style={{
                  flex: 1, textAlign: "center", padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${optionType === t ? T.cherry : T.line}`,
                  background: optionType === t ? T.cream : "transparent",
                  position: "relative", boxShadow: optionType === t ? `0 0 0 3px ${T.cherry}22` : "none",
                }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.moss, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                    {t === "unit" ? "Ширхэгээр" : "Хайрцгаар"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14, fontWeight: 600, color: T.cherry }}>{money(product[t].price)}</span>
                    {discountPercent(product[t]) != null && (
                      <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, textDecoration: "line-through" }}>{money(product[t].originalPrice)}</span>
                    )}
                  </div>
                  {optionType === t && <div style={{ position: "absolute", top: 10, right: 10, color: T.cherry }}><Check size={16} /></div>}
                </button>
              ))}
            </div>
          </div>
          )}

          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: bulkBoxQty ? 6 : 20 }}>
            Нөөцөд: <b style={{ color: T.ink }}>{option.stock}</b> {optionType === "unit" ? "ширхэг" : "хайрцаг"} байна
            {optionType === "box" && <> · 1 хайрцагт <b style={{ color: T.ink }}>{product.box.perBox}</b> ширхэг</>}
          </div>
          {optionType === "unit" && bulkBoxQty && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.moss, marginBottom: 20 }}>
              {qty >= bulkBoxQty
                ? ` ${bulkBoxQty}+ ширхэгт бөөний үнээр тооцогдож байна`
                : `${bulkBoxQty} ширхэг буюу хайрцагаар нь авбал бөөний үнээр тооцно`}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            {outOfStock ? (
              <div style={{
                flex: 1, background: T.line, color: T.inkSoft, borderRadius: 999,
                padding: "13px 20px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5, textAlign: "center",
              }}>Бараа дууссан байна</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.line}`, borderRadius: 999, overflow: "hidden" }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={stepBtn}><Minus size={14} /></button>
                  <span style={{ width: 40, textAlign: "center", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(Math.min(option.stock, qty + 1))} style={stepBtn}><Plus size={14} /></button>
                </div>
                <button onClick={() => onAddToCart(product, optionType, qty, grindNote)} style={{
                  flex: 1, background: T.cherry, color: "#fff", border: "none", borderRadius: 999,
                  padding: "13px 20px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <ShoppingBag size={16} /> Сагслах · {money(computeLineTotal(product, optionType, qty))}
                </button>
              </>
            )}
            <button onClick={() => onToggleWish(product.id)} style={{
              background: "none", border: `1px solid ${T.line}`, borderRadius: 999, width: 46, height: 46,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isWished ? T.cherry : T.ink, flexShrink: 0,
            }}><Heart size={18} fill={isWished ? T.cherry : "none"} /></button>
          </div>

          {isCoffee && (
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${T.line}` }}>
              <div style={sideLabel}>Бэлтгэх хэлбэр</div>
              <div style={{ display: "flex", gap: 10, marginBottom: grindForm === "ground" ? 18 : 0 }}>
                {[{ key: "whole", label: "Үрээр" }, { key: "ground", label: "Бутласан" }].map((g) => (
                  <button key={g.key} onClick={() => setGrindForm(g.key)} style={{
                    flex: 1, padding: "11px 16px", borderRadius: 999, cursor: "pointer",
                    border: `1.5px solid ${grindForm === g.key ? T.cherry : T.line}`,
                    background: grindForm === g.key ? T.cherry : "transparent",
                    color: grindForm === g.key ? "#fff" : T.ink,
                    fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5,
                  }}>{g.label}</button>
                ))}
              </div>
              {grindForm === "ground" && (
                <div>
                  <div style={{ ...sideLabel, marginBottom: 10 }}>Та өөрийн машинд таарсан бутлалтаа сонгоно уу</div>
                  <div className="cuppa-brew-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {BREW_METHODS.map((m) => (
                      <button key={m.key} type="button" onClick={() => setBrewMethod(brewMethod === m.key ? null : m.key)} style={{
                        textAlign: "left", cursor: "pointer", borderRadius: 10, padding: "12px 14px",
                        border: `1.5px solid ${brewMethod === m.key ? T.cherry : T.line}`,
                        background: brewMethod === m.key ? T.cream : T.card,
                        boxShadow: brewMethod === m.key ? `0 0 0 3px ${T.cherry}22` : "none",
                        position: "relative",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <Coffee size={15} color={T.moss} />
                          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 13, color: T.ink }}>{m.name}</span>
                        </div>
                        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft }}>
                          Бутлалт: <b style={{ color: T.ink }}>{m.grindMn}</b> ({m.compare})
                        </div>
                        {brewMethod === m.key && <div style={{ position: "absolute", top: 10, right: 10, color: T.cherry }}><Check size={14} /></div>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {suggestions.length > 0 && (
            <div style={{ marginTop: 22, padding: 14, border: `1px solid ${T.line}`, borderRadius: 12, background: T.card }}>
              <div style={{ ...sideLabel, marginBottom: 10 }}>Санал болгох</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestions.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {s.images && s.images.length ? (
                      <img src={s.images[0]} alt={s.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: T.card }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: `linear-gradient(155deg, ${s.color}, ${T.ink})` }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{s.name}</div>
                      <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.cherry }}>{money(displayPrice(s))}</div>
                    </div>
                    <button onClick={() => onQuickAdd(s)} style={{
                      background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px",
                      fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                    }}>+ Нэмэх</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {sameNameOtherBrands.length > 0 && (
        <div style={{ marginTop: 54 }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 18 }}>Өөр брэндийн ижил бүтээгдэхүүн</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {sameNameOtherBrands.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
                isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
const stepBtn = { border: "none", background: "none", padding: "9px 12px", cursor: "pointer", color: T.ink, display: "flex" };

/* ------------------------------------------------------------------ */
/*  Cart Drawer                                                        */
/* ------------------------------------------------------------------ */
function CartDrawer({ open, onClose, cart, updateQty, removeItem, subtotal, onCheckout }) {
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

/* ------------------------------------------------------------------ */
/*  Auth Modal                                                         */
/* ------------------------------------------------------------------ */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PASSWORD_RE = /^(?=.*[^A-Za-z0-9]).{8,}$/;

function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!open) return null;

  const handleFacebook = async () => {
    setError(""); setNotice("");
    try {
      await loginWithFacebook();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (!EMAIL_RE.test(email)) { setError("Имэйл хаягийн формат буруу байна."); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setNotice("Нууц үг сэргээх линкийг имэйлээр илгээлээ. Имэйлээ шалгана уу.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (!email || !password) return;
    if (!EMAIL_RE.test(email)) { setError("Имэйл хаягийн формат буруу байна."); return; }
    if (mode === "register") {
      if (!PASSWORD_RE.test(password)) {
        setError("Нууц үг нь 8 үсэгтэй, дор хаяж 1 тусгай тэмдэгт (!@#$% гэх мэт) агуулсан байх ёстой.");
        return;
      }
      if (password !== confirmPassword) { setError("Нууц үг таарахгүй байна."); return; }
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const data = await registerWithEmail(name, email, password);
        if (!data.session) {
          setNotice("Бүртгэл амжилттай! Имэйлээ баталгаажуулж нэвтрэх хэсгээр орно уу.");
        }
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.paper, borderRadius: 16, width: 380, maxWidth: "90vw", padding: 30, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: T.ink }}><X size={18} /></button>

        {mode === "forgot" ? (
          <>
            <h2 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, margin: "0 0 6px" }}>Нууц үг сэргээх</h2>
            <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, margin: "0 0 18px", lineHeight: 1.5 }}>
              Бүртгэлтэй имэйл хаягаа оруулна уу. Бид танд нууц үг сэргээх линк илгээх болно.
            </p>
            <form onSubmit={submitForgot} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="email" required placeholder="Имэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
              {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{notice}</div>}
              <button type="submit" disabled={loading} style={{
                marginTop: 4, background: T.cherry, color: "#fff", border: "none", borderRadius: 10,
                padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}>{loading ? "Түр хүлээнэ үү…" : "Линк илгээх"}</button>
              <button type="button" onClick={() => { setMode("login"); setError(""); setNotice(""); }} style={{
                background: "none", border: "none", cursor: "pointer", color: T.inkSoft,
                fontFamily: "'Ubuntu', sans-serif", fontSize: 13, textDecoration: "underline", padding: 4,
              }}>Нэвтрэх хэсэг рүү буцах</button>
            </form>
          </>
        ) : (
        <>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setNotice(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5,
              background: mode === m ? T.ink : "transparent", color: mode === m ? T.cream : T.inkSoft,
            }}>{m === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <input placeholder="Нэр" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" required placeholder="Имэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} required minLength={8}
              placeholder={mode === "register" ? "Нууц үг (8+ орон, 1 тусгай тэмдэгт)" : "Нууц үг"}
              value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, width: "100%", paddingRight: 38 }} />
            <button type="button" onClick={() => setShowPassword((v) => !v)} title={showPassword ? "Нууц үг нуух" : "Нууц үг харах"} style={eyeBtnStyle}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mode === "register" && (
            <div style={{ position: "relative" }}>
              <input type={showConfirmPassword ? "text" : "password"} required minLength={8} placeholder="Нууц үг давтах"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ ...inputStyle, width: "100%", paddingRight: 38 }} />
              <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} title={showConfirmPassword ? "Нууц үг нуух" : "Нууц үг харах"} style={eyeBtnStyle}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}
          {mode === "login" && (
            <button type="button" onClick={() => { setMode("forgot"); setError(""); setNotice(""); }} style={{
              alignSelf: "flex-end", background: "none", border: "none", cursor: "pointer", color: T.cherry,
              fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, padding: 0, marginTop: -2,
            }}>Нууц үгээ мартсан уу?</button>
          )}
          {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
          {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{notice}</div>}
          <button type="submit" disabled={loading} style={{
            marginTop: 4, background: T.cherry, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>{loading ? "Түр хүлээнэ үү…" : (mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх")}</button>
        </form>
        </>
        )}

        {mode !== "forgot" && (
        <>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: T.line }} />
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft }}>эсвэл</span>
          <div style={{ flex: 1, height: 1, background: T.line }} />
        </div>

        <button type="button" onClick={handleFacebook} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "#1877F2", color: "#fff", border: "none", borderRadius: 10,
          padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}>
          <Facebook size={17} /> Facebook-ээр {mode === "login" ? "нэвтрэх" : "бүртгүүлэх"}
        </button>
        </>
        )}
      </div>
    </div>
  );
}

function ResetPasswordModal({ open, onClose }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!PASSWORD_RE.test(password)) {
      setError("Нууц үг нь 8 үсэгтэй, дор хаяж 1 тусгай тэмдэгт (!@#$% гэх мэт) агуулсан байх ёстой.");
      return;
    }
    if (password !== confirmPassword) { setError("Нууц үг таарахгүй байна."); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: T.paper, borderRadius: 16, width: 380, maxWidth: "90vw", padding: 30, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: T.ink }}><X size={18} /></button>
        {done ? (
          <>
            <h2 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, margin: "0 0 6px" }}>Амжилттай!</h2>
            <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, margin: "0 0 18px", lineHeight: 1.5 }}>
              Таны нууц үг шинэчлэгдлээ.
            </p>
            <button onClick={onClose} style={{
              width: "100%", background: T.ink, color: T.cream, border: "none", borderRadius: 10,
              padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Үргэлжлүүлэх</button>
          </>
        ) : (
          <>
            <h2 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 18, fontWeight: 700, color: T.ink, margin: "0 0 6px" }}>Шинэ нууц үг үүсгэх</h2>
            <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, margin: "0 0 18px", lineHeight: 1.5 }}>
              Цаашид ашиглах шинэ нууц үгээ оруулна уу.
            </p>
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} required minLength={8}
                  placeholder="Шинэ нууц үг (8+ орон, 1 тусгай тэмдэгт)"
                  value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, width: "100%", paddingRight: 38 }} />
                <button type="button" onClick={() => setShowPassword((v) => !v)} title={showPassword ? "Нууц үг нуух" : "Нууц үг харах"} style={eyeBtnStyle}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input type={showPassword ? "text" : "password"} required minLength={8} placeholder="Нууц үг давтах"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
              {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
              <button type="submit" disabled={loading} style={{
                marginTop: 4, background: T.cherry, color: "#fff", border: "none", borderRadius: 10,
                padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}>{loading ? "Түр хүлээнэ үү…" : "Хадгалах"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
const inputStyle = { padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, background: T.card, color: T.ink, outline: "none", boxSizing: "border-box" };
const fieldLabelStyle = { fontFamily: "'Ubuntu', sans-serif", fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5 };
const profileInputStyle = { ...inputStyle, width: "100%", background: T.cream, border: `1.5px solid ${T.line}` };
const eyeBtnStyle = {
  position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer", color: T.inkSoft,
  padding: 6, display: "flex", alignItems: "center", justifyContent: "center",
};

/* ------------------------------------------------------------------ */
/*  Home                                                                */
/* ------------------------------------------------------------------ */
function HeroDots({ slides, index, onSelect }) {
  if (slides.length < 2) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 22 }}>
      {slides.map((_, i) => (
        <button key={i} onClick={() => onSelect(i)} aria-label={`Слайд ${i + 1}`} style={{
          width: i === index ? 24 : 7, height: 7, borderRadius: 999, border: "none", padding: 0, cursor: "pointer",
          background: i === index ? T.gold : "rgba(246,239,224,.32)",
          transition: "width .45s cubic-bezier(.4,0,.2,1), background .45s ease",
        }} />
      ))}
    </div>
  );
}

function HeroSlideshow({ products, onOpen, index, setIndex }) {
  const slides = products.filter((p) => p.tag === "хямдралтай" && p.images && p.images.length > 0).slice(0, 6);
  const current = slides[index];
  const touchStartRef = useRef(null);
  const swipedRef = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length, index]);

  if (slides.length === 0) return null;
  const currentOption = current[availableOptionTypes(current)[0]];
  const currentDiscount = discountPercent(currentOption);
  const prevIndex = (index - 1 + slides.length) % slides.length;
  const nextIndex = (index + 1) % slides.length;
  const goPrev = (e) => { e.stopPropagation(); setIndex(prevIndex); };
  const goNext = (e) => { e.stopPropagation(); setIndex(nextIndex); };
  const onTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipedRef.current = false;
  };
  const onTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipedRef.current = true;
  };
  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (Math.abs(dx) > 40) setIndex(dx < 0 ? nextIndex : prevIndex);
    touchStartRef.current = null;
  };
  const handleMainClick = () => {
    if (swipedRef.current) { swipedRef.current = false; return; }
    onOpen(current);
  };
  const arrowBtnStyle = {
    position: "absolute", top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%",
    border: "none", cursor: "pointer", background: "rgba(0,0,0,.35)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
  };
  const sideSlideStyle = {
    position: "relative", flexShrink: 0, width: "16%", height: "78%", borderRadius: 14, overflow: "hidden", cursor: "pointer",
    opacity: 0.45, background: T.card, transition: "opacity .3s ease", border: "none", padding: 0,
  };
  return (
    <div className="cuppa-hero-carousel" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: 320 }}>
      {slides.length > 1 && (
        <button className="cuppa-hero-side-slide" onClick={() => setIndex(prevIndex)} aria-label="Өмнөх бараа" style={sideSlideStyle}>
          {slides.map((p, i) => (
            <img key={p.id} src={p.images[0]} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              opacity: i === prevIndex ? 1 : 0, transition: "opacity .6s ease",
            }} />
          ))}
        </button>
      )}
      <div className="cuppa-hero-main-slide" onClick={handleMainClick}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{
        position: "relative", flex: 1, maxWidth: 640, height: "100%", borderRadius: 16, overflow: "hidden", cursor: "pointer", background: T.card,
      }}>
        {slides.map((p, i) => (
          <img key={p.id} src={p.images[0]} alt={p.name} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
            opacity: i === index ? 1 : 0, transition: "opacity .6s ease",
          }} />
        ))}
        {currentDiscount != null && (
          <div className="cuppa-hero-price" style={{
            position: "absolute", left: 14, bottom: 14, zIndex: 1,
            display: "flex", alignItems: "baseline", gap: 8,
            background: "rgba(36,28,20,.78)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
            padding: "8px 14px", borderRadius: 12,
          }}>
            <span className="cuppa-hero-price-old" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12.5, color: "rgba(160, 136, 136, 0.55)", textDecoration: "line-through" }}>{money(currentOption.originalPrice)}</span>
            <span className="cuppa-hero-price-new" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 17, fontWeight: 700, color: T.paper }}>{money(currentOption.price)}</span>
          </div>
        )}
        {slides.length > 1 && (
          <>
            <button className="cuppa-hero-arrow" onClick={goPrev} aria-label="Өмнөх" style={{ ...arrowBtnStyle, left: 12 }}><ChevronLeft size={18} /></button>
            <button className="cuppa-hero-arrow" onClick={goNext} aria-label="Дараах" style={{ ...arrowBtnStyle, right: 12 }}><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <button className="cuppa-hero-side-slide" onClick={() => setIndex(nextIndex)} aria-label="Дараах бараа" style={sideSlideStyle}>
          {slides.map((p, i) => (
            <img key={p.id} src={p.images[0]} alt="" style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              opacity: i === nextIndex ? 1 : 0, transition: "opacity .6s ease",
            }} />
          ))}
        </button>
      )}
    </div>
  );
}

function Home({ setView, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, products } = useContext(DataContext);
  const featured = products.filter((p) => p.tag === "бестселлэр").slice(0, 4);
  const discounted = products.filter((p) => p.tag === "хямдралтай").slice(0, 4);
  const heroSlides = products.filter((p) => p.tag === "хямдралтай" && p.images && p.images.length > 0).slice(0, 6);
  const [heroIndex, setHeroIndex] = useState(0);
  return (
    <div>
      <section style={{ background: T.ink, color: T.cream, padding: "70px 20px 60px" }}>
        <div className="cuppa-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="cuppa-hero-image" style={{ width: "100%" }}>
            <HeroSlideshow products={products} onOpen={onOpen} index={heroIndex} setIndex={setHeroIndex} />
          </div>
          <HeroDots slides={heroSlides} index={heroIndex} onSelect={setHeroIndex} />
          <div className="cuppa-hero-cta" style={{ marginTop: 22 }}>
            <button onClick={() => setView({ name: "discounts" })} style={{
              background: T.paper, color: T.ink, border: "none", borderRadius: 999, padding: "13px 26px",
              fontFamily: "'Nunito Sans', sans-serif", fontWeight: 400, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              Бүх хямдрал үзэх<ArrowRight size={12} />
            </button>
          </div>
        </div>
      </section>

      <section style={{ background: T.paper }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 54px" }}>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.ink, marginBottom: 20 }}>Ангиллаж үзэх</div>
          <div className="cuppa-category-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setView({ name: "category", categoryId: c.id })} className="cuppa-category-tile" style={{
                background: "rgba(255,255,255,.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,.6)", borderRadius: 14, padding: "24px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12, cursor: "pointer",
                boxShadow: "0 2px 10px rgba(36,28,20,.06)", transition: "transform .15s ease, box-shadow .15s ease",
              }}>
                <span className="cuppa-category-icon-wrap" style={{
                  width: 46, height: 46, borderRadius: "50%", background: "rgba(122,46,46,.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CategoryIcon icon={c.icon} size={22} color={T.cherry} />
                </span>
                <span className="cuppa-category-label" style={{ fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 14, color: T.ink, textAlign: "center" }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: T.ink, padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="cuppa-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 26 }}>
            <div className="cuppa-section-title" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.paper }}>Бестселлэр бүтээгдэхүүн</div>
            <button onClick={() => setView({ name: "bestseller" })} style={{
              background: "transparent", border: `1.5px solid rgba(246,239,224,.4)`, borderRadius: 999, padding: "8px 16px",
              cursor: "pointer", color: T.paper, whiteSpace: "nowrap", flexShrink: 0,
              fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6,
            }}>Бүгдийг үзэх <ArrowRight size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
                isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
            ))}
            {featured.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Nunito Sans', sans-serif" }}>Одоогоор бестселлэр бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 20px 60px" }}>
        <div className="cuppa-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
          <div className="cuppa-section-title" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.ink }}>Хямдралтай бүтээгдэхүүн</div>
          <button onClick={() => setView({ name: "discounts" })} style={{
            background: "transparent", border: `1.5px solid ${T.cherry}`, borderRadius: 999, padding: "8px 16px",
            cursor: "pointer", color: T.cherry, whiteSpace: "nowrap", flexShrink: 0,
            fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6,
          }}>Бүгдийг үзэх <ArrowRight size={14} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {discounted.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} variant="ink" />
          ))}
          {discounted.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Nunito Sans', sans-serif" }}>Одоогоор хямдралтай бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout & Confirmation                                             */
/* ------------------------------------------------------------------ */
function Checkout({ cart, subtotal, onConfirm, onBack, user }) {
  const { products } = useContext(DataContext);
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", address: user?.address || "",
    receiptType: "individual", registerNumber: "", deliveryMethod: "pickup",
  });
  const [submitting, setSubmitting] = useState(false);
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee = form.deliveryMethod === "delivery" && !freeDelivery ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const valid = form.name && form.phone && (form.deliveryMethod !== "delivery" || form.address)
    && (form.receiptType !== "company" || form.registerNumber) && !submitting;
  const handleClick = async () => {
    setSubmitting(true);
    await onConfirm(form);
    setSubmitting(false);
  };
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 60px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={15} /> Сагс руу буцах
      </button>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 26 }}>Хүргэлтийн мэдээлэл</h1>
      <div className="cuppa-checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 34, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 260 }}>
          <input placeholder="Хүлээн авагчийн нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input placeholder="Утасны дугаар" inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={inputStyle} />

          <div>
            <div style={sideLabel}>Хүргэлтийн хэлбэр</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ key: "pickup", label: "Очиж авах(Саруул зах)" }, { key: "delivery", label: "Хүргүүлэх/Орон нутгийн унаанд" }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, deliveryMethod: key })} style={{
                  flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${form.deliveryMethod === key ? T.cherry : T.line}`,
                  background: form.deliveryMethod === key ? T.cream : "transparent",
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink,
                }}>{label}{key === "delivery" && (
                  <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: freeDelivery ? T.moss : T.inkSoft, marginTop: 2 }}>
                    {freeDelivery ? "500,000₮-с дээш худалдан авалтанд хүргэлт үнэгүй" : `+${money(DELIVERY_FEE)}`}
                  </span>
                )}</button>
              ))}
            </div>
          </div>
          {form.deliveryMethod === "delivery" && (
            <textarea placeholder="Дэлгэрэнгүй хаяг" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={4} style={{ ...inputStyle, resize: "none", fontFamily: "'Ubuntu', sans-serif" }} />
          )}

          <div>
            <div style={sideLabel}>И-баримт</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ key: "individual", label: "Хувь хүн" }, { key: "company", label: "Байгууллага" }].map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, receiptType: key })} style={{
                  flex: 1, textAlign: "center", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${form.receiptType === key ? T.cherry : T.line}`,
                  background: form.receiptType === key ? T.cream : "transparent",
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink,
                }}>{label}</button>
              ))}
            </div>
          </div>
          {form.receiptType === "company" && (
            <input placeholder="Байгууллагын регистрийн дугаар" value={form.registerNumber}
              onChange={(e) => setForm({ ...form, registerNumber: e.target.value })} style={inputStyle} />
          )}

          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.inkSoft, marginTop: -2 }}>Төлбөрийн хэлбэр : QPay</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, alignSelf: "flex-start", minWidth: 240 }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 16, marginBottom: 14, color: T.ink }}>Захиалгын мэдээлэл</div>
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            return (
              <div key={item.productId + item.optionType + (item.note || "")} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, marginBottom: 8, color: T.ink }}>
                <span>{product.name}{item.note ? ` · ${item.note}` : ""} × {item.qty}</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(computeLineTotal(product, item.optionType, item.qty))}</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 10, paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
              <span>Барааны дүн</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                <span>Хүргэлтийн хураамж</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(deliveryFee)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: `1px solid ${T.line}`, paddingTop: 8 }}>
              <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>Нийт</span>
              <span style={{ fontFamily: "'Ubuntu', sans-serif", color: T.cherry }}>{money(total)}</span>
            </div>
          </div>
          <button disabled={!valid} onClick={handleClick} style={{
            width: "100%", marginTop: 16, background: valid ? T.cherry : T.line, color: "#fff", border: "none",
            borderRadius: 999, padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: valid ? "pointer" : "not-allowed",
          }}>{submitting ? "Түр хүлээнэ үү..." : "Төлбөр төлөх"}</button>
        </div>
      </div>
    </div>
  );
}

function Confirmation({ orderNumber, onContinue }) {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 20px", textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.moss, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Check size={30} color="#fff" />
      </div>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Төлбөр төлөлт амжилттай!</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", color: T.inkSoft, marginBottom: 6 }}>Захиалгын дугаар</p>
      <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.cherry, marginBottom: 30 }}>{orderNumber}</div>
      <button onClick={onContinue} style={{
        background: T.ink, color: T.cream, border: "none", borderRadius: 999, padding: "12px 26px",
        fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
      }}>Дэлгүүр рүү буцах</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wishlist page                                                       */
/* ------------------------------------------------------------------ */
function WishlistPage({ wishlist, onOpen, onQuickAdd, onToggleWish, setView }) {
  const { products } = useContext(DataContext);
  const items = products.filter((p) => wishlist.includes(p.id));
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
      <BackButton onClick={() => setView({ name: "home" })} />
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 22 }}>Таалагдсан бүтээгдэхүүн</h1>
      {items.length === 0 ? (
        <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Жагсаалт хоосон байна.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd} isWished onToggleWish={onToggleWish} />
          ))}
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Миний захиалгууд                                                   */
/* ------------------------------------------------------------------ */
const ORDER_STATUS_LABELS = {
  pending: "Хүлээгдэж байна", prepared: "Бэлдсэн", handed_over: "Хүлээлгэн өгсөн", cancelled: "Цуцлагдсан",
  processing: "Бэлдэж байна", shipped: "Хүргэлтэнд гарсан", done: "Хүргэгдсэн",
};
const ORDER_STATUS_COLORS = {
  pending: { bg: "#F3E6C9", color: "#8A6A1E" },
  prepared: { bg: "#DCE6F5", color: "#2E4E8A" },
  handed_over: { bg: "#DFEED6", color: "#2E5C2E" },
  cancelled: { bg: "#F5DCDC", color: "#8A2E2E" },
  processing: { bg: "#DCE6F5", color: "#2E4E8A" },
  shipped: { bg: "#E4DCF5", color: "#5B3E8A" },
  done: { bg: "#DFEED6", color: "#2E5C2E" },
};
function OrderStatusBadge({ status }) {
  const c = ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS.pending;
  return (
    <span style={{
      background: c.bg, color: c.color, fontSize: 11.5, fontWeight: 600, padding: "4px 10px",
      borderRadius: 999, fontFamily: "'Ubuntu', sans-serif", whiteSpace: "nowrap",
    }}>{ORDER_STATUS_LABELS[status] || status}</span>
  );
}
/* ------------------------------------------------------------------ */
/*  Профайл                                                             */
/* ------------------------------------------------------------------ */
const sectionTitleStyle = { fontFamily: "'Ubuntu', sans-serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 22 };
const PROFILE_SECTIONS = [
  { key: "info", label: "Миний мэдээлэл", Icon: User },
  { key: "orders", label: "Миний захиалгууд", Icon: Package },
  { key: "address", label: "Хаягийн мэдээлэл", Icon: MapPin },
  { key: "delete", label: "Бүртгэл устгах", Icon: Trash2 },
];

function ProfilePage({ user, section, setSection, onLogout, onUserUpdate, setView }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 90px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <div style={{ width: "100%" }}><BackButton onClick={() => setView({ name: "home" })} /></div>
      <aside style={{ width: 220, flexShrink: 0 }}>
        {PROFILE_SECTIONS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setSection(key)} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
            background: section === key ? T.ink : "transparent", color: section === key ? T.cream : T.ink,
            border: "none", borderRadius: 10, padding: "11px 14px", marginBottom: 4,
            fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
          }}>
            <Icon size={16} /> {label}
          </button>
        ))}
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
          background: "transparent", color: T.cherry, border: "none", borderRadius: 10, padding: "11px 14px",
          marginTop: 10, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
        }}>
          <LogOut size={16} /> Гарах
        </button>
      </aside>
      <div style={{ flex: 1, minWidth: 280 }}>
        {section === "info" && <ProfileInfoSection user={user} onUserUpdate={onUserUpdate} />}
        {section === "orders" && (
          <div>
            <h1 style={sectionTitleStyle}>Миний захиалгууд</h1>
            <MyOrdersPage />
          </div>
        )}
        {section === "address" && <ProfileAddressSection user={user} onUserUpdate={onUserUpdate} />}
        {section === "delete" && <ProfileDeleteSection />}
      </div>
    </div>
  );
}

function ProfileInfoSection({ user, onUserUpdate }) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await updateProfile({ name: name.trim() || user.name, phone });
      onUserUpdate(updated);
      setNotice("Мэдээлэл хадгалагдлаа");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={sectionTitleStyle}>Миний мэдээлэл</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
        <div>
          <div style={fieldLabelStyle}>Нэр</div>
          <input placeholder="Нэр" value={name} onChange={(e) => setName(e.target.value)} style={profileInputStyle} />
        </div>
        <div>
          <div style={fieldLabelStyle}>Утасны дугаар</div>
          <input placeholder="Утасны дугаар" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))} style={profileInputStyle} />
        </div>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Имэйл: {user.email}</div>
        {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
        {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{notice}</div>}
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, alignSelf: "flex-start", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </div>
  );
}

function ProfileAddressSection({ user, onUserUpdate }) {
  const [address, setAddress] = useState(user.address || "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await updateProfile({ address: address.trim() });
      onUserUpdate(updated);
      setNotice("Хаяг хадгалагдлаа");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={sectionTitleStyle}>Хаягийн мэдээлэл</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <div>
          <div style={fieldLabelStyle}>Дэлгэрэнгүй хаяг</div>
          <textarea placeholder="Дүүрэг, хороо, байр, орц г.м" value={address}
            onChange={(e) => setAddress(e.target.value)} rows={4} style={{ ...profileInputStyle, resize: "vertical" }} />
        </div>

        {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
        {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{notice}</div>}
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, alignSelf: "flex-start", opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </div>
    </div>
  );
}

function ProfileDeleteSection() {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true); setError("");
    try {
      await deleteAccount();
      window.location.href = "/";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={sectionTitleStyle}>Бүртгэл устгах</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 18, maxWidth: 480 }}>
        Бүртгэлээ устгавал таны хувийн мэдээлэл, захиалгын түүх рүү дахин хандах боломжгүй болно. Энэ үйлдлийг буцаах боломжгүй.
      </p>
      {!confirming ? (
        <button onClick={() => setConfirming(true)} style={{
          background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px",
          fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
        }}>Бүртгэл устгах</button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 380 }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.cherry, fontWeight: 600 }}>Та итгэлтэй байна уу?</div>
          {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleDelete} disabled={loading} style={{
              background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px",
              fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}>{loading ? "Устгаж байна…" : "Тийм, устгах"}</button>
            <button onClick={() => setConfirming(false)} style={{
              background: "none", color: T.ink, border: `1px solid ${T.line}`, borderRadius: 999, padding: "11px 20px",
              fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer",
            }}>Болих</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    fetchMyOrders()
      .then((data) => { if (!cancelled) { setOrders(data); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      {status === "loading" && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Түр хүлээнэ үү. . . </div>}
      {status === "error" && <div style={{ color: T.cherry, fontFamily: "'Ubuntu', sans-serif" }}>Захиалгуудыг татахад алдаа гарлаа.</div>}
      {status === "ready" && orders.length === 0 && (
        <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Та одоогоор захиалга хийгээгүй байна.</div>
      )}
      {status === "ready" && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {orders.map((o) => (
            <div key={o.orderNumber} style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 15, color: T.ink }}>{o.orderNumber}</div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft, marginTop: 2 }}>
                    {new Date(o.createdAt).toLocaleDateString("mn-MN")}
                    {o.receiptType === "company" && <> · Байгууллага ({o.registerNumber})</>}
                    {" · "}{o.deliveryMethod === "delivery" ? "Хүргүүлэх/Орон нутгийн унаанд" : "Очиж авах(Саруул зах)"}
                    {o.boxCount > 0 && <> · 📦 {o.boxCount} хайрцаг</>}
                  </div>
                </div>
                <OrderStatusBadge status={o.status} />
              </div>
              <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {o.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                    <span>{it.productName} ({it.optionLabel}) × {it.qty}</span>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(it.lineTotal)}</span>
                  </div>
                ))}
                {o.deliveryFee > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.ink }}>
                    <span>Хүргэлтийн хураамж</span>
                    <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>{money(o.deliveryFee)}</span>
                  </div>
                )}
              </div>
              <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span style={{ fontFamily: "'Ubuntu', sans-serif" }}>Нийт</span>
                <span style={{ fontFamily: "'Ubuntu', sans-serif", color: T.cherry }}>{money(o.subtotal + (o.deliveryFee || 0))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoPage({ title, note, actionLabel, onAction }) {
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
function TrainingPage() {
  return <InfoPage title="Сургалт" note="Меню сургалт удахгүй" />;
}

function AboutPage() {
  return <InfoPage title="Бидний тухай" note="Энэ хэсгийг удахгүй нэмнэ" />;
}

function BestsellerPage({ onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { products, brands, categories } = useContext(DataContext);
  const [brandFilter, setBrandFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [sortBy, setSortBy] = useState("default");

  const bestsellers = products.filter((p) => p.tag === "бестселлэр");
  const brandsInBest = brands.filter((b) => bestsellers.some((p) => p.brandId === b.id));
  const categoriesInBest = categories.filter((c) => bestsellers.some((p) => p.categoryId === c.id));
  let items = bestsellers;
  if (categoryFilter.length) items = items.filter((p) => categoryFilter.includes(p.categoryId));
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title="Бестселлэр" />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <CollapsibleSection label="Ангилал">
          {categoriesInBest.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={categoryFilter.includes(c.id)}
                onChange={() => setCategoryFilter(categoryFilter.includes(c.id) ? categoryFilter.filter((x) => x !== c.id) : [...categoryFilter, c.id])}
                style={{ accentColor: T.cherry }} />
              {c.name}
            </label>
          ))}
          {categoriesInBest.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Ангилал алга</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection label="Брэнд">
          {brandsInBest.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
          {brandsInBest.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Брэнд алга</div>
          )}
        </CollapsibleSection>
      </aside>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Бестселлэр бүтээгдэхүүн олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Discounts Page — "хямдралтай" шошготой бүх бараа, ангилал+брэндээр  */
/*  шүүх боломжтой                                                      */
/* ------------------------------------------------------------------ */
function DiscountsPage({ onOpen, onQuickAdd, wishlist, onToggleWish, setView }) {
  const { products, brands, categories } = useContext(DataContext);
  const [brandFilter, setBrandFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [sortBy, setSortBy] = useState("default");

  const discounted = products.filter((p) => p.tag === "хямдралтай");
  const brandsInDiscount = brands.filter((b) => discounted.some((p) => p.brandId === b.id));
  const categoriesInDiscount = categories.filter((c) => discounted.some((p) => p.categoryId === c.id));
  let items = discounted;
  if (categoryFilter.length) items = items.filter((p) => categoryFilter.includes(p.categoryId));
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => displayPrice(a) - displayPrice(b));
  if (sortBy === "price_desc") items = [...items].sort((a, b) => displayPrice(b) - displayPrice(a));

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <PageHeaderRow onBack={() => setView({ name: "home" })} title="Бүх хямдрал" />
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <CollapsibleSection label="Ангилал">
          {categoriesInDiscount.map((c) => (
            <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={categoryFilter.includes(c.id)}
                onChange={() => setCategoryFilter(categoryFilter.includes(c.id) ? categoryFilter.filter((x) => x !== c.id) : [...categoryFilter, c.id])}
                style={{ accentColor: T.cherry }} />
              {c.name}
            </label>
          ))}
          {categoriesInDiscount.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Ангилал алга</div>
          )}
        </CollapsibleSection>

        <CollapsibleSection label="Брэнд">
          {brandsInDiscount.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
          {brandsInDiscount.length === 0 && (
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft }}>Брэнд алга</div>
          )}
        </CollapsibleSection>
      </aside>

      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Хямдралтай бүтээгдэхүүн олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}

export const BRANCHES = [
  {
    name: "Саруул зах",
    heading: "Дэлгүүрийн хаяг",
    address: "Саруул зах, 2 давхар, CUPPA 09:00 - 19:00",
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
    mapUrl: "https://maps.app.goo.gl/CqwyKw4dLudAQbU68",
    phone: "76111772",
    email: "test@gmail.com",
    socials: [
      { label: "CuppA Яармаг", href: "https://www.facebook.com/profile.php?id=61578460444954", Icon: Facebook },
      { label: "cuppa2026", href: "https://www.instagram.com/cuppa2026/", Icon: Instagram },
    ],
  },
];

const primaryBtn = { background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

export function Footer({ setView }) {
  return (
    <footer style={{ background: T.ink, color: T.cream, padding: "26px 20px 16px" }}>
      <div style={{
        maxWidth: 1180, margin: "0 auto 16px", display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18,
      }}>
        <div className="cuppa-footer-logo" style={{ display: "flex", alignItems: "flex-start" }}>
          <img src="/cuppa-logo1.png" alt="CUPPA" style={{ height: 140, filter: "invert(1)" }} />
        </div>
        {BRANCHES.map((b) => (
          <div key={b.name} style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13 }}>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{b.heading || `${b.name} салбар`}</div>
            <a href={b.mapUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, color: T.cream,
              textDecoration: "none", opacity: 0.85,
            }}>
              <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{b.address}</span>
            </a>
            <a href={`tel:${b.phone}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.cream, textDecoration: "none", opacity: 0.85 }}>
              <Phone size={14} style={{ flexShrink: 0 }} /> {b.phone}
            </a>
            <a href={`mailto:${b.email}`} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.cream, textDecoration: "none", opacity: 0.85 }}>
              <Mail size={14} style={{ flexShrink: 0 }} /> {b.email}
            </a>
            {b.socials.map(({ label, href, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: T.cream, textDecoration: "none",
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
        alignItems: "center", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.1)", textAlign: "center",
      }}>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => setView({ name: "about" })} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.cream, opacity: 0.7, textDecoration: "none" }}>Бидний тухай</button>
          <Link to="/terms" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.cream, opacity: 0.7, textDecoration: "none" }}>Үйлчилгээний нөхцөл</Link>
          <Link to="/privacy" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.cream, opacity: 0.7, textDecoration: "none" }}>Нууцлалын бодлого</Link>
        </div>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, opacity: 0.7 }}>© 2026 CoffeeTreeLLC</div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [data, setData] = useState({ categories: [], brands: [], products: [] });
  const [dataStatus, setDataStatus] = useState("loading");
  // view нь одоо react-router-ийн location-оос уусгагдана — address bar нь
  // цорын ганц үнэн сурвалж тул хуудас бүр өөрийн гэсэн бодит URL-тэй,
  // хуулж/хуваалцаж, browser-ийн буцах/урагшлах товчоор шилжиж болно
  const location = useLocation();
  const navigate = useNavigate();
  const view = viewFromLocation(location.pathname, location.search);
  const setView = (v) => navigate(pathForView(v, data.brands));
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname, location.search]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState([]);
  const [subFilter, setSubFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const loaded = useRef(false);
  const storageKey = useRef("guest");

  // Лого animation
  const MIN_LOADING_MS = 1500;
  const loadData = async () => {
    const startedAt = Date.now();
    try {
      const d = await fetchBootstrap();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
      setData(d);
      setDataStatus("ready");
    } catch (e) {
      setDataStatus("error");
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const channel = supabase.channel("products-stock")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const updated = shapeProduct(payload.new);
        setData((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
        }));
      })
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("Realtime холболт амжилтгүй боллоо:", status, err);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadCartWishlist = (key) => {
    try { const raw = localStorage.getItem(`cuppa:cart:${key}`); setCart(raw ? JSON.parse(raw) : []); } catch (e) { setCart([]); }
    try { const raw = localStorage.getItem(`cuppa:wishlist:${key}`); setWishlist(raw ? JSON.parse(raw) : []); } catch (e) { setWishlist([]); }
  };

  useEffect(() => {
    if (loaded.current) localStorage.setItem(`cuppa:cart:${storageKey.current}`, JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    if (loaded.current) localStorage.setItem(`cuppa:wishlist:${storageKey.current}`, JSON.stringify(wishlist));
  }, [wishlist]);

  // hereglegciin newtrelt shalgah
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = shapeAuthUser(session?.user);
      setUser(u);
      storageKey.current = u?.id || "guest";
      loadCartWishlist(storageKey.current);
      loaded.current = true;
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = shapeAuthUser(session?.user);
      setUser(u);
      const nextKey = u?.id || "guest";
      if (nextKey !== storageKey.current) {
        storageKey.current = nextKey;
        loadCartWishlist(nextKey);
      }
      if (_event === "PASSWORD_RECOVERY") {
        setAuthOpen(false);
        setResetOpen(true);
      } else if (u) {
        setAuthOpen(false); flash(`Тавтай морил, ${u.name}!`);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setBrandFilter(view.brandId ? [view.brandId] : []);
    setSubFilter(null);
    setSortBy("default");
  }, [view.categoryId, view.brandId]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const addToCart = (product, optionType, qty, note) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.optionType === optionType && (i.note || "") === (note || ""));
      if (existing) return prev.map((i) => i === existing ? { ...i, qty: Math.min(product[optionType].stock || i.qty, i.qty + qty) } : i);
      return [...prev, { productId: product.id, optionType, qty, note: note || undefined }];
    });
    flash(`Сагсанд нэмэгдлээ — ${product.name}`);
  };
  const quickAdd = (product) => addToCart(product, availableOptionTypes(product)[0] || "unit", 1);
  const updateQty = (productId, optionType, note, qty) =>
    setCart((prev) => prev.map((i) => i.productId === productId && i.optionType === optionType && (i.note || "") === (note || "") ? { ...i, qty } : i));
  const removeItem = (productId, optionType, note) =>
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.optionType === optionType && (i.note || "") === (note || ""))));
  const toggleWish = (id) =>
    setWishlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const subtotal = useMemo(() => cart.reduce((sum, i) => {
    const p = data.products.find((x) => x.id === i.productId);
    return p ? sum + computeLineTotal(p, i.optionType, i.qty) : sum;
  }, 0), [cart, data.products]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const openProduct = (p) => setView({ name: "product", productId: p.id });
  // Дэлгэрэнгүй хуудаснаас "Буцах" дарахад аппын дотоод шилжилт байсан бол
  // browser-ийн буцах, эс бол (шууд URL-аар орж ирсэн бол) Нүүр хуудас
  const backFromProduct = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/");
  };
  const handleSearch = (q) => setView({ name: "search", query: q });
  const handleLogout = async () => { await logout(); flash("Гарлаа"); };
  const handleCheckout = () => {
    setCartOpen(false);
    if (!user) { setAuthOpen(true); flash("Захиалгаа баталгаажуулахын тулд эхлээд нэвтэрнэ үү"); return; }
    setView({ name: "checkout" });
  };
  const handleConfirm = async (form) => {
    if (!user) { setAuthOpen(true); flash("Захиалгаа баталгаажуулахын тулд эхлээд нэвтэрнэ үү"); return; }
    try {
      const orderNumber = await submitOrder({ form, cart, products: data.products, userId: user.id });
      setOrderNumber(orderNumber);
      // noots hasagdah
      setData((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          const item = cart.find((i) => i.productId === p.id);
          if (!item) return p;
          const field = item.optionType === "box" ? "box" : "unit";
          return { ...p, [field]: { ...p[field], stock: Math.max(0, (p[field].stock || 0) - item.qty) } };
        }),
      }));
      setCart([]);
      setView({ name: "confirmation" });
    } catch (err) {
      flash("Захиалга үүсгэхэд алдаа гарлаа: " + err.message);
    }
  };

  if (dataStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <style>{`
          @keyframes cuppa-breathe {
            0%, 100% { transform: scale(0.94); opacity: 0.55; }
            50% { transform: scale(1); opacity: 1; }
          }
        `}</style>

        <img src="/cuppa-logo1.png" alt="CUPPA" style={{ height: 170, animation: "cuppa-breathe 3.2s ease-in-out infinite" }} />
      </div>
    );
  }
  if (dataStatus === "error") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ maxWidth: 460 }}>
          <ShieldAlert size={30} color={T.cherry} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 10 }}>CuppA-тай холбогдож чадсангүй</div>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
            Интернэт холболтоо шалгана уу, эсвэл <code>  CuppA  </code>дэлгүүртэй холбогдож мэдээллэнэ үү Баярлалаа
          </div>
          <button onClick={loadData} style={{ ...primaryBtn, marginTop: 16 }}>Дахин оролдох</button>
        </div>
      </div>
    );
  }

  let body;
  if (view.name === "product") {
    const product = data.products.find((p) => p.id === view.productId);
    body = <ProductDetail product={product} onBack={backFromProduct} onOpen={openProduct} wishlist={wishlist}
      onAddToCart={addToCart} onQuickAdd={quickAdd} isWished={product ? wishlist.includes(product.id) : false} onToggleWish={toggleWish} />;
  } else if (view.name === "home") {
    body = <Home setView={setView} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "category") {
    body = <CategoryPage categoryId={view.categoryId} brandFilter={brandFilter} setBrandFilter={setBrandFilter}
      subFilter={subFilter} setSubFilter={setSubFilter} sortBy={sortBy} setSortBy={setSortBy}
      onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "brand") {
    const brand = data.brands.find((b) => slugify(b.name) === view.brandSlug);
    body = <BrandPage brandId={brand?.id} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "search") {
    const q = view.query.toLowerCase();
    const results = data.products.filter((p) => p.name.toLowerCase().includes(q) || (p.origin || "").toLowerCase().includes(q));
    body = (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
        <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 6 }}>“{view.query}” хайлтын үр дүн</h1>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 22 }}>{results.length} олдлоо</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {results.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} onQuickAdd={quickAdd} isWished={wishlist.includes(p.id)} onToggleWish={toggleWish} />)}
        </div>
      </div>
    );
  } else if (view.name === "wishlist") {
    body = <WishlistPage wishlist={wishlist} onOpen={openProduct} onQuickAdd={quickAdd} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "checkout") {
    body = <Checkout cart={cart} subtotal={subtotal} onConfirm={handleConfirm} onBack={() => setView({ name: "home" })} user={user} />;
  } else if (view.name === "confirmation") {
    body = <Confirmation orderNumber={orderNumber} onContinue={() => setView({ name: "home" })} />;
  } else if (view.name === "training") {
    body = <TrainingPage />;
  } else if (view.name === "about") {
    body = <AboutPage />;
  } else if (view.name === "bestseller") {
    body = <BestsellerPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "discounts") {
    body = <DiscountsPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} setView={setView} />;
  } else if (view.name === "profile") {
    body = user
      ? <ProfilePage user={user} section={view.section || "info"} setSection={(s) => setView({ name: "profile", section: s })} onLogout={handleLogout} onUserUpdate={setUser} setView={setView} />
      : <InfoPage title="Миний мэдээлэл" note="Өөрийн мэдээллээ харахын тулд эхлээд нэвтэрнэ үү." actionLabel="Нэвтрэх" onAction={() => setAuthOpen(true)} />;
  }

  return (
    <DataContext.Provider value={data}>
      <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Ubuntu', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Header setView={setView} cartCount={cartCount} wishCount={wishlist.length} user={user}
          onOpenCart={() => setCartOpen(true)} onOpenAuth={() => setAuthOpen(true)} onSearch={handleSearch} />
        <main style={{ flex: 1 }}>{body}</main>
        <Footer setView={setView} />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty} removeItem={removeItem} subtotal={subtotal} onCheckout={handleCheckout} onQuickAdd={quickAdd} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
        <Toast message={toast} />
        <ScrollToTopButton />
      </div>
    </DataContext.Provider>
  );
}

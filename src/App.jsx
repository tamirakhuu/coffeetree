import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  ShoppingBag, Heart, Search, User, X, Plus, Minus, ChevronDown,
  ChevronLeft, ChevronRight, Check, Coffee,
  Package, ArrowRight, ArrowUp, LogOut, Trash2, ShieldAlert, MapPin, Phone, Mail,
  Facebook, Instagram, Eye, EyeOff
} from "lucide-react";
import { fetchBootstrap, submitOrder, fetchMyOrders, computeLineTotal, shapeProduct } from "./api.js";
import { supabase } from "./supabaseClient.js";
import { registerWithEmail, loginWithEmail, loginWithFacebook, logout, shapeAuthUser, updateProfile, deleteAccount } from "./auth.js";
import { CoffeeBeanIcon, TeaLeafIcon, SyrupIcon, SauceIcon, PowderIcon, SmoothieIcon, TamperIcon, PaperCupIcon } from "./categoryIcons.jsx";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const T = {
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
  blue: "#1b00b4"
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap');";

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

// Ангиллын icon нь эсвэл угсарсан түлхүүр (CoffeeBean, Syrup, ...), эсвэл
// админ admin panel-аас өөрөө оруулсан зургийн URL байж болно
function CategoryIcon({ icon, size = 20, color }) {
  if (icon && /^https?:\/\//.test(icon)) {
    return <img src={icon} alt="" style={{ width: size, height: size, objectFit: "contain", display: "inline-block", flexShrink: 0 }} />;
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

/* backend-ээс татсан ангилал/брэнд/бараа              */

const DataContext = createContext({ categories: [], brands: [], products: [] });

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
  return (
    <div style={{
      height, borderRadius: "14px 14px 4px 4px", position: "relative", overflow: "hidden",
      background: hasImage ? T.card : `linear-gradient(155deg, ${product.color} 0%, ${T.ink} 130%)`,
    }}>
      {hasImage ? (
        <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
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
        background: T.cherry, color: "#fff", border: "none", cursor: "pointer", zIndex: 150,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 6px 20px rgba(0,0,0,.25)",
      }}
    >
      <ArrowUp size={20} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                              */
/* ------------------------------------------------------------------ */
const NavButton = React.forwardRef(function NavButton({ onClick, active, children }, ref) {
  return (
    <button ref={ref} onClick={onClick}
      style={{
        background: active ? "rgba(255,255,255,0.08)" : "transparent", border: "none", color: T.cream, opacity: 0.85,
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
                display: "block", width: "100%", textAlign: "left", background: "transparent", color: T.ink,
                border: "none", borderRadius: 8, padding: "6px 10px", fontFamily: "'Ubuntu', sans-serif",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.ink; e.currentTarget.style.color = T.cream; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.ink; }}
            >{b.name}</button>
          ))}
        </div>
        {brands.length === 0 && (
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, color: T.inkSoft, opacity: 0.7 }}>Брэнд алга</div>
        )}
      </div>
    </div>
  );
}

function Header({ setView, cartCount, wishCount, user, onOpenCart, onOpenAuth, onSearch }) {
  const { categories, brands, products } = useContext(DataContext);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const goCategory = (id) => { setView({ name: "category", categoryId: id }); setMenuOpen(false); };
  const goBrand = (brandId) => { setView({ name: "brand", brandId }); setMenuOpen(false); };

  return (
    <header style={{
      background: "rgba(36,28,20,.65)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
      color: T.cream, position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(255,255,255,.08)",
    }}>
      <div className="cuppa-header-row" style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div className="cuppa-logo" onClick={() => setView({ name: "home" })} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
          <img src="/cuppa-logo.png" alt="CUPPA" style={{ height: 26, display: "block" }} />
        </div>

        <nav ref={navRef} className="cuppa-nav" style={{ position: "relative", flex: 1 }}>
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Хайх..." autoFocus={searchOpen}
            style={{ background: "transparent", border: "none", outline: "none", color: T.paper, fontFamily: "'Ubuntu', sans-serif", fontSize: 13, width: "100%" }} />
        </form>

        <div className="cuppa-icons" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="cuppa-search-toggle" onClick={() => setSearchOpen((v) => !v)} style={iconBtnStyle}>
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </button>
          <div className={`cuppa-icons-rest${searchOpen ? " cuppa-icons-rest-hidden" : ""}`} style={{ display: "flex", alignItems: "center", gap: 14 }}>
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
  );
}
const iconBtnStyle = { position: "relative", background: "transparent", border: "none", color: T.cream, cursor: "pointer", display: "flex", padding: 4 };
function Badge({ n }) {
  return <span style={{
    position: "absolute", top: -4, right: -6, background: T.cherry, color: "#fff",
    fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
    fontFamily: "'Ubuntu', sans-serif",
  }}>{n}</span>;
}

/* ------------------------------------------------------------------ */
/*  Product Card                                                       */
/* ------------------------------------------------------------------ */
function ProductCard({ product, onOpen, onQuickAdd, isWished, onToggleWish }) {
  const { brands } = useContext(DataContext);
  const brand = brands.find((b) => b.id === product.brandId);
  const outOfStock = (product.unit.stock || 0) <= 0;
  return (
    <div className="cuppa-product-card" style={{
      background: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
      borderRadius: "14px 14px 10px 10px", border: "1px solid rgba(255,255,255,.5)", overflow: "hidden",
      display: "flex", flexDirection: "column", boxShadow: "0 2px 10px rgba(36,28,20,.08)",
      transition: "transform .15s ease, box-shadow .15s ease",
    }}>
      <div style={{ cursor: "pointer", borderBottom: `1px solid ${T.line}` }} onClick={() => onOpen(product)}>
        <ProductArt product={product} />
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11, color: T.moss, textTransform: "uppercase", letterSpacing: "0.05em" }}>{brand?.name}</span>
          <button onClick={() => onToggleWish(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: isWished ? T.cherry : T.inkSoft }}>
            <Heart size={16} fill={isWished ? T.cherry : "none"} />
          </button>
        </div>
        <div onClick={() => onOpen(product)} style={{ cursor: "pointer", fontFamily: "'Ubuntu', sans-serif", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>
          {product.name}
        </div>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.inkSoft }}>{product.origin}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 15, color: T.ink }}>{money(product.unit.price)}</span>
          <button onClick={() => onQuickAdd(product)} disabled={outOfStock} style={{
            background: outOfStock ? T.line : T.cherry, color: outOfStock ? T.inkSoft : "#fff", border: "none", borderRadius: 999, padding: "7px 13px",
            fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: outOfStock ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            {outOfStock ? "Дууссан" : (<> Сагслах</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Page                                                      */
/* ------------------------------------------------------------------ */
function CategoryPage({ categoryId, brandFilter, setBrandFilter, subFilter, setSubFilter, sortBy, setSortBy, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, brands, products } = useContext(DataContext);
  const category = categories.find((c) => c.id === categoryId);
  let items = products.filter((p) => p.categoryId === categoryId);
  if (subFilter) items = items.filter((p) => p.sub === subFilter);
  if (brandFilter.length) items = items.filter((p) => brandFilter.includes(p.brandId));
  if (sortBy === "price_asc") items = [...items].sort((a, b) => a.unit.price - b.unit.price);
  if (sortBy === "price_desc") items = [...items].sort((a, b) => b.unit.price - a.unit.price);
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));

  const brandsInCat = brands.filter((b) => products.some((p) => p.categoryId === categoryId && p.brandId === b.id));

  if (!category) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Ангилал олдсонгүй.</div>;

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 18 }}>{category.name}</div>

        <div style={{ marginBottom: 26 }}>
          <div style={sideLabel}>ТӨРӨЛ</div>
          <button onClick={() => setSubFilter(null)} style={subBtn(subFilter === null)}>Бүгд</button>
          {category.sub.map((s) => (
            <button key={s} onClick={() => setSubFilter(s)} style={subBtn(subFilter === s)}>{s}</button>
          ))}
        </div>

        <div>
          <div style={sideLabel}>Брэнд</div>
          {brandsInCat.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
              <input type="checkbox" checked={brandFilter.includes(b.id)}
                onChange={() => setBrandFilter(brandFilter.includes(b.id) ? brandFilter.filter((x) => x !== b.id) : [...brandFilter, b.id])}
                style={{ accentColor: T.cherry }} />
              {b.name}
            </label>
          ))}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 280 }}>
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

/* ------------------------------------------------------------------ */
/*  Brand Page — ангиллаа сонгодогтой яг адилхнаар, брэнд дээр дарахад  */
/*  тухайн брэндийн бүх бараа харагдаад, дээд хэсэгт нь ангиллаар шүүх  */
/*  унжигч цэс (ChevronDown) байна                                     */
/* ------------------------------------------------------------------ */
function BrandPage({ brandId, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, brands, products } = useContext(DataContext);
  const brand = brands.find((b) => b.id === brandId);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setCatMenuOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  useEffect(() => { setCategoryFilter(null); setSortBy("default"); }, [brandId]);

  if (!brand) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Брэнд олдсонгүй.</div>;

  let items = products.filter((p) => p.brandId === brandId);
  if (categoryFilter) items = items.filter((p) => p.categoryId === categoryFilter);
  if (sortBy === "price_asc") items = [...items].sort((a, b) => a.unit.price - b.unit.price);
  if (sortBy === "price_desc") items = [...items].sort((a, b) => b.unit.price - a.unit.price);
  if (sortBy === "new") items = [...items].sort((a, b) => (b.tag === "шинэ") - (a.tag === "шинэ"));

  const categoriesInBrand = categories.filter((c) => products.some((p) => p.brandId === brandId && p.categoryId === c.id));
  const activeCategory = categoriesInBrand.find((c) => c.id === categoryFilter);
  const catItemStyle = (active) => ({
    display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
    background: active ? T.ink : "transparent", color: active ? T.cream : T.ink,
    border: "none", borderRadius: 8, padding: "8px 10px", fontFamily: "'Ubuntu', sans-serif",
    fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
  });

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
        <div>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink }}>{brand.name}</div>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{items.length} бүтээгдэхүүн</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setCatMenuOpen((v) => !v)} style={{
              display: "flex", alignItems: "center", gap: 6, background: T.card, border: `1px solid ${T.line}`,
              borderRadius: 999, padding: "9px 16px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13,
              fontWeight: 600, color: T.ink, cursor: "pointer",
            }}>
              {activeCategory ? activeCategory.name : "Ангиллаж харах"} <ChevronDown size={14} />
            </button>
            {catMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, background: T.card, border: `1px solid ${T.line}`,
                borderRadius: 12, padding: 8, boxShadow: "0 16px 40px rgba(0,0,0,.2)", zIndex: 60, minWidth: 160,
              }}>
                <button onClick={() => { setCategoryFilter(null); setCatMenuOpen(false); }} style={catItemStyle(!categoryFilter)}>Бүх ангилал</button>
                {categoriesInBrand.map((c) => {
                  return (
                    <button key={c.id} onClick={() => { setCategoryFilter(c.id); setCatMenuOpen(false); }} style={catItemStyle(categoryFilter === c.id)}>
                      <CategoryIcon icon={c.icon} size={15} /> {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="new">Шинэ эхэндээ</option>
            <option value="price_asc">Үнэ багаас их</option>
            <option value="price_desc">Үнэ ихээс бага</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
            isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
        ))}
        {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Тохирох бараа олдсонгүй.</div>}
      </div>
    </div>
  );
}

const sideLabel = { fontFamily: "'Ubuntu', sans-serif", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10 };
const subBtn = (active) => ({
  display: "block", width: "100%", textAlign: "left", background: active ? T.ink : "transparent",
  color: active ? T.cream : T.ink, border: `1px solid ${active ? T.ink : "transparent"}`,
  borderRadius: 8, padding: "7px 10px", fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5,
  cursor: "pointer", marginBottom: 4,
});

/*  Product Detail                                                     */
const availableOptionTypes = (product) =>
  product ? ["unit", "box"].filter((t) => (product[t]?.price || 0) > 0) : [];

// Тодорхой ангиллын бараа үзэж байвал холбогдох дагалдах хэрэгслийг санал болгоно
const PUMP_SUGGESTIONS = { "Соус": "Sauce pump", "Сироп": "Syrup pump", "Смүүти": "Sauce pump" };

const BREW_METHODS = [
  { key: "espresso", name: "Espresso / Delonghi", grindMn: "Fine", compare: "0.260мм" },
  { key: "mokapot", name: "Mokapot", grindMn: "Medium-Fine", compare: "0.350мм" },
  { key: "autodrip", name: "Drip/ Pour Over", grindMn: "Medium", compare: "0.700мм" },
  { key: "frenchpress", name: "Aero Press", grindMn: "Coarse", compare: "0.400мм" },
];

function ProductDetail({ product, onBack, onAddToCart, onQuickAdd, isWished, onToggleWish }) {
  const { brands, categories, products } = useContext(DataContext);
  const availableTypes = availableOptionTypes(product);
  const [optionType, setOptionType] = useState(() => availableTypes[0] || "unit");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [grindForm, setGrindForm] = useState("whole");
  const [brewMethod, setBrewMethod] = useState(null);

  useEffect(() => {
    setOptionType(availableOptionTypes(product)[0] || "unit");
    setQty(1); setActiveImg(0); setGrindForm("whole"); setBrewMethod(null);
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
  const selectedBrew = grindForm === "ground" ? BREW_METHODS.find((m) => m.key === brewMethod) : null;
  const grindNote = isCoffee ? (grindForm === "ground" ? (selectedBrew ? `Бутласан · ${selectedBrew.name}` : "Бутласан") : "Үрээр") : undefined;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 90px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={15} /> Буцах
      </button>
      <div className="cuppa-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
        <div>
          {images ? (
            <div style={{ height: 420, borderRadius: "14px 14px 4px 4px", overflow: "hidden", background: T.card }}>
              <img src={images[activeImg]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
            </div>
          ) : (
            <ProductArt product={product} height={420} />
          )}
          {images && images.length > 1 && (
            <div className="cuppa-thumb-row" style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {images.map((src, i) => (
                <button key={i} onClick={() => setActiveImg(i)} style={{
                  width: 64, height: 64, borderRadius: 8, overflow: "hidden", padding: 0, cursor: "pointer",
                  border: activeImg === i ? `2px solid ${T.cherry}` : `1px solid ${T.line}`, flexShrink: 0,
                }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
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
                  flex: 1, textAlign: "left", padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${optionType === t ? T.cherry : T.line}`,
                  background: optionType === t ? T.cream : "transparent",
                  position: "relative", boxShadow: optionType === t ? `0 0 0 3px ${T.cherry}22` : "none",
                }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.moss, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t === "unit" ? "Ширхэгээр" : "Хайрцгаар"}
                  </div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, fontWeight: 600, color: T.ink, margin: "3px 0" }}>{product[t].label}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
                {[{ key: "whole", label: "Үрээр" }, { key: "ground", label: "Бутлалсан" }].map((g) => (
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

          {suggestedPump && (
            <div style={{ marginTop: 22, padding: 14, border: `1px solid ${T.line}`, borderRadius: 12, background: T.card }}>
              <div style={{ ...sideLabel, marginBottom: 10 }}>Санал болгох</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {suggestedPump.images && suggestedPump.images.length ? (
                  <img src={suggestedPump.images[0]} alt={suggestedPump.name} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0, background: T.card }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0, background: `linear-gradient(155deg, ${suggestedPump.color}, ${T.ink})` }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{suggestedPump.name}</div>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, color: T.cherry }}>{money(suggestedPump.unit.price)}</div>
                </div>
                <button onClick={() => onQuickAdd(suggestedPump)} style={{
                  background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "8px 14px",
                  fontFamily: "'Ubuntu', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}>+ Нэмэх</button>
              </div>
            </div>
          )}
        </div>
      </div>
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
        <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink }}>Сагс</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink }}><X size={20} /></button>
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
        // Session шууд үүссэн бол App-ийн onAuthStateChange listener modal-г автоматаар хаана
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
          {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{error}</div>}
          {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Ubuntu', sans-serif" }}>{notice}</div>}
          <button type="submit" disabled={loading} style={{
            marginTop: 4, background: T.cherry, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>{loading ? "Түр хүлээнэ үү…" : (mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх")}</button>
        </form>

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
      </div>
    </div>
  );
}
const inputStyle = { padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Ubuntu', sans-serif", fontSize: 14, background: T.card, color: T.ink, outline: "none", boxSizing: "border-box" };
// Профайл хуудас цагаан дэвсгэр дээр байрладаг тул inputStyle-ийн цагаан
// background нь бараг харагдахгүй болдог — тод дэвсгэр + label нэмж ялгаруулна
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
function HeroSlideshow({ products, onOpen }) {
  const slides = products.filter((p) => p.tag === "хямдралтай" && p.images && p.images.length > 0).slice(0, 6);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length, index]);

  if (slides.length === 0) return null;
  const current = slides[index];
  const goPrev = (e) => { e.stopPropagation(); setIndex((i) => (i - 1 + slides.length) % slides.length); };
  const goNext = (e) => { e.stopPropagation(); setIndex((i) => (i + 1) % slides.length); };
  const arrowBtnStyle = {
    position: "absolute", top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%",
    border: "none", cursor: "pointer", background: "rgba(0,0,0,.35)", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
  };
  return (
    <div onClick={() => onOpen(current)} style={{
      position: "relative", height: 320, borderRadius: 16, overflow: "hidden", cursor: "pointer", background: T.card,
    }}>
      {slides.map((p, i) => (
        <img key={p.id} src={p.images[0]} alt={p.name} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
          opacity: i === index ? 1 : 0, transition: "opacity .6s ease", pointerEvents: i === index ? "auto" : "none",
        }} />
      ))}
      {slides.length > 1 && (
        <>
          <button onClick={goPrev} aria-label="Өмнөх" style={{ ...arrowBtnStyle, left: 12 }}><ChevronLeft size={18} /></button>
          <button onClick={goNext} aria-label="Дараах" style={{ ...arrowBtnStyle, right: 12 }}><ChevronRight size={18} /></button>
          <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
            {slides.map((_, i) => (
              <span key={i} style={{
                width: 6, height: 6, borderRadius: 999, background: i === index ? T.gold : "rgba(255,255,255,.5)",
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Home({ setView, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, products } = useContext(DataContext);
  const featured = products.filter((p) => p.tag === "бестселлэр").slice(0, 4);
  const discounted = products.filter((p) => p.tag === "хямдралтай").slice(0, 4);
  return (
    <div>
      <section style={{ background: T.ink, color: T.cream, padding: "70px 20px 60px" }}>
        <div className="cuppa-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <h1 className="cuppa-hero-title" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1.08, margin: "0 0 20px" }}>text эсвэл видео<br/>байршуулах</h1>

            {categories[0] && (
              <button onClick={() => setView({ name: "category", categoryId: categories[0].id })} style={{
                background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "13px 26px",
                fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              }}>Дэлгүүр үзэх <ArrowRight size={16} /></button>
            )}
          </div>
          <HeroSlideshow products={products} onOpen={onOpen} />
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 10px" }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Ангиллаж үзэх</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setView({ name: "category", categoryId: c.id })} className="cuppa-category-tile" style={{
              background: "rgba(255,255,255,.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,.5)", borderRadius: 14, padding: "26px 14px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer",
              boxShadow: "0 2px 10px rgba(36,28,20,.08)", transition: "transform .15s ease, box-shadow .15s ease",
            }}>
              <CategoryIcon icon={c.icon} size={26} color={T.cherry} />
              <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 14, color: T.ink, textAlign: "center" }}>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 90px" }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Бестселлэр бүтээгдэхүүн</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {featured.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Одоогоор бестселлэр бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "10px 20px 90px" }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Хямдралтай бүтээгдэхүүн</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {discounted.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {discounted.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Ubuntu', sans-serif" }}>Одоогоор хямдралтай бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout & Confirmation                                             */
/* ------------------------------------------------------------------ */
const DELIVERY_FEE = 15000;

function Checkout({ cart, subtotal, onConfirm, onBack, user }) {
  const { products } = useContext(DataContext);
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", address: user?.address || "",
    receiptType: "individual", registerNumber: "", deliveryMethod: "pickup",
  });
  const [submitting, setSubmitting] = useState(false);
  const deliveryFee = form.deliveryMethod === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;
  const valid = form.name && form.phone && (form.deliveryMethod !== "delivery" || form.address)
    && (form.receiptType !== "company" || form.registerNumber) && !submitting;
  const handleClick = async () => {
    setSubmitting(true);
    await onConfirm(form);
    setSubmitting(false);
  };
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 90px" }}>
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
                }}>{label}{key === "delivery" && <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: T.inkSoft, marginTop: 2 }}>+{money(DELIVERY_FEE)}</span>}</button>
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
function WishlistPage({ wishlist, onOpen, onQuickAdd, onToggleWish }) {
  const { products } = useContext(DataContext);
  const items = products.filter((p) => wishlist.includes(p.id));
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
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
  // Хуучин захиалгуудад байж болох хуучин статусууд (үзүүлэлтийн зорилгоор хадгалав)
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

function ProfilePage({ user, section, setSection, onLogout, onUserUpdate }) {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 90px", display: "flex", gap: 32, flexWrap: "wrap" }}>
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
  const [status, setStatus] = useState("loading"); // loading | ready | error

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

function InfoPage({ title, note }) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 20px 100px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: 14 }}>{title}</h1>
      <p style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.inkSoft, lineHeight: 1.6 }}>{note}</p>
    </div>
  );
}
function TrainingPage() {
  return <InfoPage title="Сургалт" note="Бариста бэлтгэлийн сургалт удахгүй" />;
}

function BestsellerPage({ onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { products, brands } = useContext(DataContext);
  const [brandFilter, setBrandFilter] = useState([]);
  const [sortBy, setSortBy] = useState("default");

  const bestsellers = products.filter((p) => p.tag === "бестселлэр");
  const brandsInBest = brands.filter((b) => bestsellers.some((p) => p.brandId === b.id));
  let items = brandFilter.length ? bestsellers.filter((p) => brandFilter.includes(p.brandId)) : bestsellers;
  if (sortBy === "price_asc") items = [...items].sort((a, b) => a.unit.price - b.unit.price);
  if (sortBy === "price_desc") items = [...items].sort((a, b) => b.unit.price - a.unit.price);

  return (
    <div className="cuppa-category-layout" style={{ maxWidth: 1180, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32, flexWrap: "wrap" }}>
      <aside className="cuppa-category-aside" style={{ width: 210, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 18 }}>Бестселлэр</div>
        <div>
          <div style={sideLabel}>Брэнд</div>
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
        </div>
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
const BRANCHES = [
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

/* ------------------------------------------------------------------ */
/*  App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [data, setData] = useState({ categories: [], brands: [], products: [] });
  const [dataStatus, setDataStatus] = useState("loading"); // loading | ready | error
  const [view, setView] = useState({ name: "home" });
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [user, setUser] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [brandFilter, setBrandFilter] = useState([]);
  const [subFilter, setSubFilter] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [toast, setToast] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const loaded = useRef(false);
  // Сагс/wishlist-ийг нэвтэрсэн хэрэглэгчийн ID-гаар тусгаарлана — ингэснээр
  // нэг browser дээр өөр өөр account-аар нэвтрэхэд хэрэглэгч бүр зөвхөн
  // өөрийн сагс/wishlist-ээ л харна (нэвтрээгүй үед "guest" сагс)
  const storageKey = useRef("guest");

  const loadData = async () => {
    try {
      const d = await fetchBootstrap();
      setData(d);
      setDataStatus("ready");
    } catch (e) {
      setDataStatus("error");
    }
  };

  useEffect(() => { loadData(); }, []);

  // Барааны нөөц (унит/хайрцаг) өөр хэрэглэгчийн захиалга эсвэл admin-ийн
  // өөрчлөлтөөс болж өөрчлөгдөх бүрт refresh хийхгүйгээр шууд шинэчлэгдэнэ
  useEffect(() => {
    const channel = supabase.channel("products-stock")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
        const updated = shapeProduct(payload.new);
        setData((prev) => ({
          ...prev,
          products: prev.products.map((p) => (p.id === updated.id ? updated : p)),
        }));
      })
      .subscribe();
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

  // Хэрэглэгчийн нэвтрэлтийн төлөв — Supabase Auth session-той шууд синхрон
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
      if (u) { setAuthOpen(false); flash(`Тавтай морил, ${u.name}!`); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Ангилал руу шилжихэд шүүлтүүрийг цэвэрлэнэ — гэхдээ header-ийн мега менюгээс
  // тодорхой брэнд сонгож орж ирсэн бол (view.brandId) тэрийг шууд идэвхжүүлнэ
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
  const quickAdd = (product) => addToCart(product, "unit", 1);
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

  const openProduct = (p) => setView({ name: "product", productId: p.id, returnTo: view });
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
      // Захиалсан хэмжээгээр нөөцийг дэлгүүрийн UI дээр шууд бууруулна
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
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Ubuntu', sans-serif", color: T.inkSoft, gap: 22 }}>
        <style>{FONT_IMPORT}</style>
        <style>{`
          @keyframes cuppa-steam {
            0%   { transform: translate(0, 0) scaleX(1); opacity: 0; }
            25%  { opacity: 0.55; }
            50%  { transform: translate(-3px, -13px) scaleX(1.3); opacity: 0.8; }
            75%  { transform: translate(3px, -20px) scaleX(0.9); opacity: 0.35; }
            100% { transform: translate(0, -28px) scaleX(1); opacity: 0; }
          }
          @keyframes cuppa-pour {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.86); }
          }
          @keyframes cuppa-dot {
            0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-3px); }
          }
        `}</style>

        <div style={{ position: "relative", width: 92, height: 100 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{
              position: "absolute", bottom: 62, left: 28 + i * 12, width: 5, height: 18, borderRadius: 999,
              background: T.gold, opacity: 0, animation: `cuppa-steam 2.4s ease-in-out ${i * 0.35}s infinite`,
            }} />
          ))}
          <div style={{
            position: "absolute", bottom: 44, left: 14, width: 64, height: 34, borderRadius: "6px 6px 30px 30px",
            background: T.ink, overflow: "hidden", transformOrigin: "top", animation: "cuppa-pour 2.4s ease-in-out infinite",
          }}>
            <div style={{ position: "absolute", top: 4, left: 0, right: 0, height: 6, background: T.gold, opacity: 0.9 }} />
          </div>
          <div style={{
            position: "absolute", bottom: 51, left: 76, width: 16, height: 20, borderRadius: "0 12px 12px 0",
            border: `4px solid ${T.ink}`, borderLeft: "none",
          }} />
          <div style={{ position: "absolute", bottom: 38, left: 6, width: 80, height: 8, borderRadius: 999, background: T.ink, opacity: 0.14 }} />
        </div>

        <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 15, color: T.ink, display: "flex", alignItems: "center", gap: 4 }}>
          Ачааллаж байна
          <span style={{ display: "inline-flex", gap: 3, marginLeft: 3 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: "50%", background: T.cherry, display: "inline-block",
                animation: `cuppa-dot 1.2s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </span>
        </div>
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
  if (view.name === "home") {
    body = <Home setView={setView} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "category") {
    body = <CategoryPage categoryId={view.categoryId} brandFilter={brandFilter} setBrandFilter={setBrandFilter}
      subFilter={subFilter} setSubFilter={setSubFilter} sortBy={sortBy} setSortBy={setSortBy}
      onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "brand") {
    body = <BrandPage brandId={view.brandId} onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "product") {
    const product = data.products.find((p) => p.id === view.productId);
    body = <ProductDetail product={product} onBack={() => setView(view.returnTo || { name: "home" })}
      onAddToCart={addToCart} onQuickAdd={quickAdd} isWished={product ? wishlist.includes(product.id) : false} onToggleWish={toggleWish} />;
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
    body = <WishlistPage wishlist={wishlist} onOpen={openProduct} onQuickAdd={quickAdd} onToggleWish={toggleWish} />;
  } else if (view.name === "checkout") {
    body = <Checkout cart={cart} subtotal={subtotal} onConfirm={handleConfirm} onBack={() => setView({ name: "home" })} user={user} />;
  } else if (view.name === "confirmation") {
    body = <Confirmation orderNumber={orderNumber} onContinue={() => setView({ name: "home" })} />;
  } else if (view.name === "training") {
    body = <TrainingPage />;
  } else if (view.name === "bestseller") {
    body = <BestsellerPage onOpen={openProduct} onQuickAdd={quickAdd} wishlist={wishlist} onToggleWish={toggleWish} />;
  } else if (view.name === "profile") {
    body = user
      ? <ProfilePage user={user} section={view.section || "info"} setSection={(s) => setView({ name: "profile", section: s })} onLogout={handleLogout} onUserUpdate={setUser} />
      : <InfoPage title="Миний мэдээлэл" note="Өөрийн мэдээллээ харахын тулд эхлээд нэвтэрнэ үү." />;
  }

  return (
    <DataContext.Provider value={data}>
      <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Ubuntu', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Header setView={setView} cartCount={cartCount} wishCount={wishlist.length} user={user}
          onOpenCart={() => setCartOpen(true)} onOpenAuth={() => setAuthOpen(true)} onSearch={handleSearch} />
        <main style={{ flex: 1 }}>{body}</main>
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
            maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.1)",
          }}>
            <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, opacity: 0.7 }}>© 2026 CoffeeTreeLLC</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <a href="/terms.html" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.cream, opacity: 0.7, textDecoration: "none" }}>Үйлчилгээний нөхцөл</a>
              <a href="/privacy.html" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 11.5, color: T.cream, opacity: 0.7, textDecoration: "none" }}>Нууцлалын бодлого</a>
            </div>
          </div>
        </footer>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty} removeItem={removeItem} subtotal={subtotal} onCheckout={handleCheckout} onQuickAdd={quickAdd} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <Toast message={toast} />
        <ScrollToTopButton />
      </div>
    </DataContext.Provider>
  );
}

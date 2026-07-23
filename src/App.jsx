import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";
import {
  ShoppingBag, Heart, Search, User, X, Plus, Minus, ChevronDown,
  ChevronLeft, Check, Coffee, Leaf, Droplet, Snowflake, Wrench,
  Package, ArrowRight, LogOut, Trash2, ShieldAlert
} from "lucide-react";
import { fetchBootstrap, submitOrder } from "./api.js";
import { supabase } from "./supabaseClient.js";
import { registerWithEmail, loginWithEmail, loginWithGoogle, loginWithFacebook, logout, shapeAuthUser } from "./auth.js";

/* ------------------------------------------------------------------ */
/*  Design tokens                                                      */
/* ------------------------------------------------------------------ */
const T = {
  ink: "#241C15",
  inkSoft: "#5C4E3E",
  paper: "#EFE3CF",
  card: "#FBF5E9",
  line: "#D9C9A8",
  cherry: "#7A2E2E",
  cherryDark: "#5C2222",
  moss: "#48583A",
  gold: "#B8862E",
  cream: "#F6EFE0",
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');";

const ICONS = { Coffee, Leaf, Droplet, Snowflake, Wrench };
const ICON_KEYS = Object.keys(ICONS);

const money = (n) => Math.round(n || 0).toLocaleString("mn-MN") + "₮";
const initials = (str) => (str || "").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/*  Data context — backend-ээс татсан ангилал/брэнд/бараа              */

const DataContext = createContext({ categories: [], brands: [], products: [] });

/* ------------------------------------------------------------------ */
/*  Small building blocks                                               */
/* ------------------------------------------------------------------ */
function StampBadge({ label, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "999px", border: `2px dashed ${T.cream}`,
      display: "flex", alignItems: "center", justifyContent: "center", color: T.cream,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: size * 0.28, fontWeight: 600,
      letterSpacing: "0.02em", transform: "rotate(-8deg)", flexShrink: 0, opacity: 0.9,
    }}>{label}</div>
  );
}

function ProductArt({ product, height = 190 }) {
  const hasImage = product.images && product.images.length > 0;
  return (
    <div style={{
      height, borderRadius: "14px 14px 4px 4px", position: "relative", overflow: "hidden",
      background: hasImage ? T.ink : `linear-gradient(155deg, ${product.color} 0%, ${T.ink} 130%)`,
    }}>
      {hasImage ? (
        <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
          position: "absolute", bottom: 10, left: 12, fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, letterSpacing: "0.06em", color: T.ink, background: T.gold,
          padding: "3px 9px", borderRadius: 999, fontWeight: 600, textTransform: "uppercase",
        }}>{product.tag}</span>
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
      fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, zIndex: 200,
      display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(0,0,0,.25)",
      maxWidth: "80vw", textAlign: "center",
    }}>
      <Check size={16} color={T.gold} /> {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                              */
/* ------------------------------------------------------------------ */
function NavButton({ onClick, active, children }) {
  return (
    <button onClick={onClick}
      style={{
        background: active ? "rgba(255,255,255,0.08)" : "transparent", border: "none", color: T.cream, opacity: 0.85,
        fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, padding: "8px 10px",
        borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "rgba(255,255,255,0.08)" : "transparent")}
    >{children}</button>
  );
}

function ProductsMegaMenu({ categories, brands, products, activeCat, setActiveCat, onGoCategory }) {
  const activeCategory = categories.find((c) => c.id === activeCat) || categories[0];
  const brandsInActive = activeCategory
    ? brands.filter((b) => products.some((p) => p.categoryId === activeCategory.id && p.brandId === b.id))
    : [];
  return (
    <div className="cuppa-megamenu" style={{
      position: "absolute", top: "calc(100% + 10px)", left: 0, background: T.card, border: `1px solid ${T.line}`,
      borderRadius: 14, padding: "22px 24px", display: "flex", gap: 32, boxShadow: "0 24px 50px rgba(0,0,0,.35)",
      zIndex: 120, minWidth: 580,
    }}>
      <div className="cuppa-megamenu-col" style={{ minWidth: 170 }}>
        <div style={sideLabel}>Ангилал</div>
        {categories.map((c) => {
          const Icon = ICONS[c.icon] || Coffee;
          const active = activeCategory?.id === c.id;
          return (
            <button key={c.id} onClick={() => onGoCategory(c.id)} onMouseEnter={() => setActiveCat(c.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
                background: active ? T.ink : "transparent", color: active ? T.cream : T.ink,
                border: "none", borderRadius: 8, padding: "8px 10px", fontFamily: "'Inter', sans-serif",
                fontSize: 13.5, fontWeight: 500, cursor: "pointer", marginBottom: 2,
              }}>
              <Icon size={15} /> {c.name}
            </button>
          );
        })}
      </div>
      <div className="cuppa-megamenu-col" style={{ minWidth: 150 }}>
        <div style={sideLabel}>Дэд ангилал</div>
        {(activeCategory?.sub || []).map((s) => (
          <div key={s} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.inkSoft, padding: "6px 2px" }}>{s}</div>
        ))}
      </div>
      <div className="cuppa-megamenu-col" style={{ minWidth: 150 }}>
        <div style={sideLabel}>Брэнд</div>
        {brandsInActive.map((b) => (
          <div key={b.id} style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.inkSoft, padding: "6px 2px" }}>{b.name}</div>
        ))}
        {brandsInActive.length === 0 && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.inkSoft, opacity: 0.7 }}>Брэнд алга</div>
        )}
      </div>
    </div>
  );
}

function Header({ setView, cartCount, wishCount, user, onOpenCart, onOpenAuth, onSearch, onLogout }) {
  const { categories, brands, products } = useContext(DataContext);
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (categories.length && activeCat == null) setActiveCat(categories[0].id);
  }, [categories, activeCat]);

  useEffect(() => {
    const onDocClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goCategory = (id) => { setView({ name: "category", categoryId: id }); setMenuOpen(false); };

  return (
    <header style={{ background: T.ink, color: T.cream, position: "sticky", top: 0, zIndex: 100 }}>
      <div className="cuppa-header-row" style={{ maxWidth: 1180, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div className="cuppa-logo" onClick={() => setView({ name: "home" })} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 26, letterSpacing: "-0.01em" }}>CUPPA</span>
        </div>

        <nav ref={navRef} className="cuppa-nav" style={{ position: "relative", display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
          <NavButton active={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            Бүтээгдэхүүн <ChevronDown size={14} style={{ transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </NavButton>
          <NavButton onClick={() => setView({ name: "training" })}>Сургалт</NavButton>
          <NavButton onClick={() => setView({ name: "location" })}>Байршил</NavButton>
          <NavButton onClick={() => setView({ name: "contact" })}>Холбоо барих</NavButton>

          {menuOpen && (
            <ProductsMegaMenu categories={categories} brands={brands} products={products}
              activeCat={activeCat} setActiveCat={setActiveCat} onGoCategory={goCategory} />
          )}
        </nav>

        <form className="cuppa-search-form" onSubmit={(e) => { e.preventDefault(); onSearch(q); }}
          style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.1)", borderRadius: 999, padding: "6px 12px", gap: 8, width: 200 }}>
          <Search size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Хайх..."
            style={{ background: "transparent", border: "none", outline: "none", color: T.cream, fontFamily: "'Inter', sans-serif", fontSize: 13, width: "100%" }} />
        </form>

        <div className="cuppa-icons" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setView({ name: "wishlist" })} style={iconBtnStyle}>
            <Heart size={19} /> {wishCount > 0 && <Badge n={wishCount} />}
          </button>
          <button onClick={onOpenCart} style={iconBtnStyle}>
            <ShoppingBag size={19} /> {cartCount > 0 && <Badge n={cartCount} />}
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontFamily: "'Inter', sans-serif" }}>{user.name}</span>
              <button onClick={onLogout} style={{ ...iconBtnStyle, opacity: 0.8 }} title="Гарах"><LogOut size={17} /></button>
            </div>
          ) : (
            <button onClick={onOpenAuth} style={iconBtnStyle}><User size={19} /></button>
          )}
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
    fontFamily: "'IBM Plex Mono', monospace",
  }}>{n}</span>;
}

/* ------------------------------------------------------------------ */
/*  Product Card                                                       */
/* ------------------------------------------------------------------ */
function ProductCard({ product, onOpen, onQuickAdd, isWished, onToggleWish }) {
  const { brands } = useContext(DataContext);
  const brand = brands.find((b) => b.id === product.brandId);
  return (
    <div style={{ background: T.card, borderRadius: "14px 14px 4px 4px", border: `1px solid ${T.line}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ cursor: "pointer" }} onClick={() => onOpen(product)}>
        <ProductArt product={product} />
      </div>
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.moss, textTransform: "uppercase", letterSpacing: "0.05em" }}>{brand?.name}</span>
          <button onClick={() => onToggleWish(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: isWished ? T.cherry : T.inkSoft }}>
            <Heart size={16} fill={isWished ? T.cherry : "none"} />
          </button>
        </div>
        <div onClick={() => onOpen(product)} style={{ cursor: "pointer", fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: T.ink, lineHeight: 1.25 }}>
          {product.name}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.inkSoft }}>{product.origin}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 15, color: T.ink }}>{money(product.unit.price)}</span>
          <button onClick={() => onQuickAdd(product)} style={{
            background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "7px 13px",
            fontFamily: "'Inter', sans-serif", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
          }}>
            <Plus size={13} /> Сагслах
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
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 18 }}>{category.name}</div>

        <div style={{ marginBottom: 26 }}>
          <div style={sideLabel}>Дэд ангилал</div>
          <button onClick={() => setSubFilter(null)} style={subBtn(subFilter === null)}>Бүгд</button>
          {category.sub.map((s) => (
            <button key={s} onClick={() => setSubFilter(s)} style={subBtn(subFilter === s)}>{s}</button>
          ))}
        </div>

        <div>
          <div style={sideLabel}>Брэнд</div>
          {brandsInCat.map((b) => (
            <label key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: T.ink, padding: "5px 2px", cursor: "pointer" }}>
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
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: T.inkSoft }}>{items.length} бүтээгдэхүүн</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, border: `1px solid ${T.line}`, borderRadius: 8, padding: "7px 10px", background: T.card, color: T.ink }}>
            <option value="default">Санал болгох</option>
            <option value="new">Шинэ эхэндээ</option>
            <option value="price_asc">Үнэ: багаас их</option>
            <option value="price_desc">Үнэ: ихээс бага</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {items.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Inter', sans-serif" }}>Тохирох бараа олдсонгүй.</div>}
        </div>
      </div>
    </div>
  );
}
const sideLabel = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: T.moss, marginBottom: 10 };
const subBtn = (active) => ({
  display: "block", width: "100%", textAlign: "left", background: active ? T.ink : "transparent",
  color: active ? T.cream : T.ink, border: `1px solid ${active ? T.ink : "transparent"}`,
  borderRadius: 8, padding: "7px 10px", fontFamily: "'Inter', sans-serif", fontSize: 13.5,
  cursor: "pointer", marginBottom: 4,
});

/* ------------------------------------------------------------------ */
/*  Product Detail                                                     */
/* ------------------------------------------------------------------ */
function ProductDetail({ product, onBack, onAddToCart, isWished, onToggleWish }) {
  const { brands } = useContext(DataContext);
  const [optionType, setOptionType] = useState("unit");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => { setOptionType("unit"); setQty(1); setActiveImg(0); }, [product?.id]);

  if (!product) return <div style={{ padding: 60, textAlign: "center", color: T.inkSoft }}>Бараа олдсонгүй.</div>;
  const option = product[optionType];
  const brand = brands.find((b) => b.id === product.brandId);
  const images = product.images && product.images.length ? product.images : null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 90px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={15} /> Буцах
      </button>
      <div className="cuppa-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44 }}>
        <div>
          {images ? (
            <div style={{ height: 420, borderRadius: "14px 14px 4px 4px", overflow: "hidden", background: T.ink }}>
              <img src={images[activeImg]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.moss, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{brand?.name} · {product.sub}</div>
          <h1 className="cuppa-detail-title" style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, color: T.ink, margin: "0 0 8px", lineHeight: 1.15 }}>{product.name}</h1>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.inkSoft, marginBottom: 18 }}>{product.origin}</div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: T.ink, lineHeight: 1.6, marginBottom: 26 }}>{product.desc}</p>

          <div style={{ marginBottom: 22 }}>
            <div style={sideLabel}>Савлагаа сонгох</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["unit", "box"].map((t) => (
                <button key={t} onClick={() => { setOptionType(t); setQty(1); }} style={{
                  flex: 1, textAlign: "left", padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${optionType === t ? T.cherry : T.line}`,
                  background: optionType === t ? T.cream : "transparent",
                  position: "relative", boxShadow: optionType === t ? `0 0 0 3px ${T.cherry}22` : "none",
                }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.moss, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t === "unit" ? "Ширхэгээр" : "Хайрцгаар"}
                  </div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: T.ink, margin: "3px 0" }}>{product[t].label}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 600, color: T.cherry }}>{money(product[t].price)}</div>
                  {optionType === t && <div style={{ position: "absolute", top: 10, right: 10, color: T.cherry }}><Check size={16} /></div>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.inkSoft, marginBottom: 20 }}>
            Нөөцөд: <b style={{ color: T.ink }}>{option.stock}</b> {optionType === "unit" ? "ширхэг" : "хайрцаг"} байна
            {optionType === "box" && <> · 1 хайрцагт <b style={{ color: T.ink }}>{product.box.perBox}</b> ширхэг</>}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.line}`, borderRadius: 999, overflow: "hidden" }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={stepBtn}><Minus size={14} /></button>
              <span style={{ width: 40, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{qty}</span>
              <button onClick={() => setQty(Math.min(option.stock || 1, qty + 1))} style={stepBtn}><Plus size={14} /></button>
            </div>
            <button onClick={() => onAddToCart(product, optionType, qty)} style={{
              flex: 1, background: T.cherry, color: "#fff", border: "none", borderRadius: 999,
              padding: "13px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <ShoppingBag size={16} /> Сагслах · {money(option.price * qty)}
            </button>
            <button onClick={() => onToggleWish(product.id)} style={{
              background: "none", border: `1px solid ${T.line}`, borderRadius: 999, width: 46, height: 46,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: isWished ? T.cherry : T.ink, flexShrink: 0,
            }}><Heart size={18} fill={isWished ? T.cherry : "none"} /></button>
          </div>
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
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.ink }}>Сагс</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.ink }}><X size={20} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
          {cart.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 14, marginTop: 30, textAlign: "center" }}>Сагс хоосон байна.</div>}
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const option = product[item.optionType];
            return (
              <div key={item.productId + item.optionType} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.line}` }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, background: `linear-gradient(155deg, ${product.color}, ${T.ink})`, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 600, color: T.ink }}>{product.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: T.moss, margin: "3px 0" }}>{option.label}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", border: `1px solid ${T.line}`, borderRadius: 999 }}>
                      <button onClick={() => updateQty(item.productId, item.optionType, Math.max(1, item.qty - 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Minus size={11} /></button>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, width: 22, textAlign: "center" }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.productId, item.optionType, Math.min(option.stock || item.qty, item.qty + 1))} style={{ ...stepBtn, padding: "4px 8px" }}><Plus size={11} /></button>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: T.ink }}>{money(option.price * item.qty)}</span>
                  </div>
                </div>
                <button onClick={() => removeItem(item.productId, item.optionType)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkSoft, alignSelf: "flex-start" }}><Trash2 size={15} /></button>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 20, borderTop: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontFamily: "'Inter', sans-serif" }}>
              <span style={{ color: T.inkSoft, fontSize: 14 }}>Нийт дүн</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 17, color: T.ink }}>{money(subtotal)}</span>
            </div>
            <button onClick={onCheckout} style={{
              width: "100%", background: T.cherry, color: "#fff", border: "none", borderRadius: 999,
              padding: "13px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer",
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
function AuthModal({ open, onClose }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setNotice("");
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "register") {
        const data = await registerWithEmail(name, email, password);
        if (!data.session) {
          setNotice("Бүртгэл амжилттай! Имэйл хаяг руугаа орж баталгаажуулах линк дээр дарснаар нэвтэрч болно.");
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

  const handleGoogle = async () => {
    setError("");
    try { await loginWithGoogle(); } catch (err) { setError(err.message); }
  };
  const handleFacebook = async () => {
    setError("");
    try { await loginWithFacebook(); } catch (err) { setError(err.message); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.paper, borderRadius: 16, width: 380, maxWidth: "90vw", padding: 30, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: T.ink }}><X size={18} /></button>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {["login", "register"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); setNotice(""); }} style={{
              flex: 1, padding: "9px 0", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5,
              background: mode === m ? T.ink : "transparent", color: mode === m ? T.cream : T.inkSoft,
            }}>{m === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 18 }}>
          <button type="button" onClick={handleGoogle} style={socialBtn}>
            <GoogleG /> Google-ээр нэвтрэх
          </button>
          <button type="button" onClick={handleFacebook} style={{ ...socialBtn, background: "#1877F2", color: "#fff" }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>f</span> Facebook-ээр нэвтрэх
          </button>
        </div>
        <div style={{ textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.inkSoft, marginBottom: 18 }}>— эсвэл имэйлээр —</div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "register" && (
            <input placeholder="Нэр" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          )}
          <input type="email" required placeholder="Имэйл хаяг" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required minLength={6} placeholder="Нууц үг (дор хаяж 6 тэмдэгт)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
          {error && <div style={{ color: T.cherry, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>{error}</div>}
          {notice && <div style={{ color: T.moss, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>{notice}</div>}
          <button type="submit" disabled={loading} style={{
            marginTop: 4, background: T.cherry, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>{loading ? "Түр хүлээнэ үү…" : (mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх")}</button>
        </form>
      </div>
    </div>
  );
}
const inputStyle = { padding: "11px 13px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Inter', sans-serif", fontSize: 14, background: T.card, color: T.ink, outline: "none" };
const socialBtn = { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px", borderRadius: 10, border: `1px solid ${T.line}`, background: T.card, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, color: T.ink };
function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.2 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.2 29.5 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.3C40.8 36.4 44 30.8 44 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Home                                                                */
/* ------------------------------------------------------------------ */
function Home({ setView, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, products } = useContext(DataContext);
  const featured = products.filter((p) => p.tag === "алдартай").slice(0, 4);
  const heroPicks = products.slice(0, 4);
  return (
    <div>
      <section style={{ background: T.ink, color: T.cream, padding: "70px 20px 60px" }}>
        <div className="cuppa-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 40, alignItems: "center" }}>
          <div>
            <h1 className="cuppa-hero-title" style={{ fontFamily: "'Fraunces', serif", fontSize: 48, fontWeight: 700, lineHeight: 1.08, margin: "0 0 20px" }}>Кофе шоп, кафений эрхлэгчдэд<br/>зориулсан бүх орц нэг дор.</h1>

            {categories[0] && (
              <button onClick={() => setView({ name: "category", categoryId: categories[0].id })} style={{
                background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "13px 26px",
                fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              }}>Дэлгүүр үзэх <ArrowRight size={16} /></button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {heroPicks.map((p, i) => (
              <div key={p.id} style={{ marginTop: i % 2 ? 26 : 0 }}><ProductArt product={p} height={130} /></div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 10px" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Ангиллаж үзэх</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
          {categories.map((c) => {
            const Icon = ICONS[c.icon] || Coffee;
            return (
              <button key={c.id} onClick={() => setView({ name: "category", categoryId: c.id })} style={{
                background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: "26px 14px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer",
              }}>
                <Icon size={26} color={T.cherry} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: T.ink, textAlign: "center" }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 90px" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 20 }}>Эрэлттэй бүтээгдэхүүн</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
              isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
          ))}
          {featured.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Inter', sans-serif" }}>Одоогоор эрэлттэй бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkout & Confirmation                                             */
/* ------------------------------------------------------------------ */
function Checkout({ cart, subtotal, onConfirm, onBack }) {
  const { products } = useContext(DataContext);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const valid = form.name && form.phone && form.address && !submitting;
  const handleClick = async () => {
    setSubmitting(true);
    await onConfirm(form);
    setSubmitting(false);
  };
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 90px" }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 13.5, cursor: "pointer", marginBottom: 20 }}>
        <ChevronLeft size={15} /> Сагс руу буцах
      </button>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: T.ink, marginBottom: 26 }}>Хүргэлтийн мэдээлэл</h1>
      <div className="cuppa-checkout-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 34, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 260 }}>
          <input placeholder="Хүлээн авагчийн нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input placeholder="Утасны дугаар" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
          <textarea placeholder="Дэлгэрэнгүй хаяг" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={4} style={{ ...inputStyle, resize: "none", fontFamily: "'Inter', sans-serif" }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: T.inkSoft, marginTop: -2 }}>Төлбөрийн хэлбэр : QPay</div>
        </div>
        <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, alignSelf: "flex-start", minWidth: 240 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, marginBottom: 14, color: T.ink }}>Захиалгын дүн</div>
          {cart.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            if (!product) return null;
            const option = product[item.optionType];
            return (
              <div key={item.productId + item.optionType} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter', sans-serif", fontSize: 13, marginBottom: 8, color: T.ink }}>
                <span>{product.name} × {item.qty}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(option.price * item.qty)}</span>
              </div>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span style={{ fontFamily: "'Inter', sans-serif" }}>Нийт</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.cherry }}>{money(subtotal)}</span>
          </div>
          <button disabled={!valid} onClick={handleClick} style={{
            width: "100%", marginTop: 16, background: valid ? T.cherry : T.line, color: "#fff", border: "none",
            borderRadius: 999, padding: "12px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: valid ? "pointer" : "not-allowed",
          }}>{submitting ? "Илгээж байна…" : "Захиалга баталгаажуулах"}</button>
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
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Захиалга амжилттай!</h1>
      <p style={{ fontFamily: "'Inter', sans-serif", color: T.inkSoft, marginBottom: 6 }}>Захиалгын дугаар</p>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700, color: T.cherry, marginBottom: 30 }}>{orderNumber}</div>
      <button onClick={onContinue} style={{
        background: T.ink, color: T.cream, border: "none", borderRadius: 999, padding: "12px 26px",
        fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer",
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
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: T.ink, marginBottom: 22 }}>Таалагдсан бүтээгдэхүүн</h1>
      {items.length === 0 ? (
        <div style={{ color: T.inkSoft, fontFamily: "'Inter', sans-serif" }}>Жагсаалт хоосон байна.</div>
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
/*  Info pages (Сургалт / Байршил / Холбоо барих) — placeholder        */
/* ------------------------------------------------------------------ */
function InfoPage({ title, note }) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "60px 20px 100px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: 14 }}>{title}</h1>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: T.inkSoft, lineHeight: 1.6 }}>{note}</p>
    </div>
  );
}
function TrainingPage() {
  return <InfoPage title="Сургалт" note="Бариста бэлтгэлийн сургалтын хуваарь энд удахгүй нэмэгдэнэ." />;
}
function LocationPage() {
  return <InfoPage title="Байршил" note="Дэлгүүр, Салбар болон агуулахын байршил, ажиллах цагийн мэдээлэл энд удахгүй нэмэгдэнэ." />;
}
function ContactPage() {
  return <InfoPage title="Холбоо барих" note="Утас, имэйл, сошиал холбоосууд энд удахгүй нэмэгдэнэ." />;
}

const primaryBtn = { background: T.cherry, color: "#fff", border: "none", borderRadius: 999, padding: "11px 20px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };

/* ------------------------------------------------------------------ */
/*  App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [data, setData] = useState({ categories: [], brands: [], products: [] });
  const [dataStatus, setDataStatus] = useState("loading"); // loading | ready | error
  const [view, setView] = useState({ name: "home" });
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

  useEffect(() => {
    try { const raw = localStorage.getItem("cuppa:cart"); if (raw) setCart(JSON.parse(raw)); } catch (e) {}
    try { const raw = localStorage.getItem("cuppa:wishlist"); if (raw) setWishlist(JSON.parse(raw)); } catch (e) {}
    loaded.current = true;
  }, []);
  useEffect(() => { if (loaded.current) localStorage.setItem("cuppa:cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { if (loaded.current) localStorage.setItem("cuppa:wishlist", JSON.stringify(wishlist)); }, [wishlist]);

  // Хэрэглэгчийн нэвтрэлтийн төлөв — Supabase Auth session-той шууд синхрон
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(shapeAuthUser(session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = shapeAuthUser(session?.user);
      setUser(u);
      if (u) { setAuthOpen(false); flash(`Тавтай морил, ${u.name}!`); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { setBrandFilter([]); setSubFilter(null); setSortBy("default"); }, [view.categoryId]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const addToCart = (product, optionType, qty) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.optionType === optionType);
      if (existing) return prev.map((i) => i === existing ? { ...i, qty: Math.min(product[optionType].stock || i.qty, i.qty + qty) } : i);
      return [...prev, { productId: product.id, optionType, qty }];
    });
    flash(`Сагсанд нэмэгдлээ — ${product.name}`);
  };
  const quickAdd = (product) => addToCart(product, "unit", 1);
  const updateQty = (productId, optionType, qty) =>
    setCart((prev) => prev.map((i) => i.productId === productId && i.optionType === optionType ? { ...i, qty } : i));
  const removeItem = (productId, optionType) =>
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.optionType === optionType)));
  const toggleWish = (id) =>
    setWishlist((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const subtotal = useMemo(() => cart.reduce((sum, i) => {
    const p = data.products.find((x) => x.id === i.productId);
    return p ? sum + p[i.optionType].price * i.qty : sum;
  }, 0), [cart, data.products]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const openProduct = (p) => setView({ name: "product", productId: p.id });
  const handleSearch = (q) => setView({ name: "search", query: q });
  const handleLogout = async () => { await logout(); flash("Гарлаа"); };
  const handleCheckout = () => { setCartOpen(false); setView({ name: "checkout" }); };
  const handleConfirm = async (form) => {
    try {
      const orderNumber = await submitOrder({ form, cart, products: data.products });
      setOrderNumber(orderNumber);
      setCart([]);
      setView({ name: "confirmation" });
    } catch (err) {
      flash("Захиалга үүсгэхэд алдаа гарлаа: " + err.message);
    }
  };

  if (dataStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", color: T.inkSoft }}>
        <style>{FONT_IMPORT}</style>
        Ачааллаж байна…
      </div>
    );
  }
  if (dataStatus === "error") {
    return (
      <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", padding: 30, textAlign: "center" }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ maxWidth: 460 }}>
          <ShieldAlert size={30} color={T.cherry} style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 10 }}>Supabase-тай холбогдож чадсангүй</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
            Интернэт холболтоо шалгана уу, эсвэл <code>supabase-schema.sql</code>-г Supabase төслийн SQL Editor-т ажиллуулсан эсэхийг баталгаажуулна уу.
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
  } else if (view.name === "product") {
    const product = data.products.find((p) => p.id === view.productId);
    body = <ProductDetail product={product} onBack={() => setView({ name: "home" })}
      onAddToCart={addToCart} isWished={product ? wishlist.includes(product.id) : false} onToggleWish={toggleWish} />;
  } else if (view.name === "search") {
    const q = view.query.toLowerCase();
    const results = data.products.filter((p) => p.name.toLowerCase().includes(q) || (p.origin || "").toLowerCase().includes(q));
    body = (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 20px 90px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: T.ink, marginBottom: 6 }}>“{view.query}” хайлтын үр дүн</h1>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: T.inkSoft, marginBottom: 22 }}>{results.length} олдлоо</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
          {results.map((p) => <ProductCard key={p.id} product={p} onOpen={openProduct} onQuickAdd={quickAdd} isWished={wishlist.includes(p.id)} onToggleWish={toggleWish} />)}
        </div>
      </div>
    );
  } else if (view.name === "wishlist") {
    body = <WishlistPage wishlist={wishlist} onOpen={openProduct} onQuickAdd={quickAdd} onToggleWish={toggleWish} />;
  } else if (view.name === "checkout") {
    body = <Checkout cart={cart} subtotal={subtotal} onConfirm={handleConfirm} onBack={() => setView({ name: "home" })} />;
  } else if (view.name === "confirmation") {
    body = <Confirmation orderNumber={orderNumber} onContinue={() => setView({ name: "home" })} />;
  } else if (view.name === "training") {
    body = <TrainingPage />;
  } else if (view.name === "location") {
    body = <LocationPage />;
  } else if (view.name === "contact") {
    body = <ContactPage />;
  }

  return (
    <DataContext.Provider value={data}>
      <div style={{ background: T.paper, minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
        <style>{FONT_IMPORT}</style>
        <Header setView={setView} cartCount={cartCount} wishCount={wishlist.length} user={user}
          onOpenCart={() => setCartOpen(true)} onOpenAuth={() => setAuthOpen(true)} onSearch={handleSearch} onLogout={handleLogout} />
        <main style={{ flex: 1 }}>{body}</main>
        <footer style={{ background: T.ink, color: T.cream, padding: "30px 20px", textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, opacity: 0.7 }}>
          © 2026 CoffeeTreeLLC
        </footer>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} updateQty={updateQty} removeItem={removeItem} subtotal={subtotal} onCheckout={handleCheckout} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        <Toast message={toast} />
      </div>
    </DataContext.Provider>
  );
}

import React, { useState, useEffect, useRef, useContext } from "react";
import { ShoppingBag, Heart, Plus, Minus, ChevronLeft, ChevronRight, Check, Coffee } from "lucide-react";
import { computeLineTotal } from "../api.js";
import { T, money, discountPercent, DataContext, ProductArt, ProductCard, sideLabel, BackButton, availableOptionTypes, displayPrice, stepBtn } from "../components/storefront.jsx";

const detailImgArrowStyle = {
  position: "absolute", top: "50%", transform: "translateY(-50%)", width: 34, height: 34, borderRadius: "50%",
  border: "none", cursor: "pointer", background: "rgba(36,28,20,.5)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1,
};

const stripSizeSuffix = (name) =>
  (name || "").trim()
    .replace(/\s*\d+(\.\d+)?(\s*\/\s*\d+(\.\d+)?)*\s*(ml|mkl|л|l|kg|кг|g|gr|гр|oz|ш|шир|pcs)\.?\s*$/i, "")
    .trim();

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

export default function ProductDetail({ product, onBack, onAddToCart, onQuickAdd, isWished, onToggleWish, onOpen, wishlist }) {
  const { brands, categories, products } = useContext(DataContext);
  const availableTypes = availableOptionTypes(product);
  const [optionType, setOptionType] = useState(() => availableTypes[0] || "unit");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [grindForm, setGrindForm] = useState("whole");
  const [brewMethod, setBrewMethod] = useState(null);
  const [lidType, setLidType] = useState("Хавтгай");
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const zoomWrapRef = useRef(null);

  useEffect(() => {
    setOptionType(availableOptionTypes(product)[0] || "unit");
    setQty(1); setActiveImg(0); setGrindForm("whole"); setBrewMethod(null); setLidType("Хавтгай"); setZoomed(false);
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
  const isCoffee = productCategory?.name === "Кофе" && product.sub !== "Капсул";
  const isColdCup = product.sub === "Хүйтний аяга";
  const bulkBoxQty = product.box?.price > 0 ? product.bulkQty : undefined;
  const pumpName = productCategory && PUMP_SUGGESTIONS[productCategory.name];
  const suggestedPump = pumpName
    ? products.find((p) => p.id !== product.id && p.name.trim().toLowerCase() === pumpName.toLowerCase())
    : null;
  const cupSuggestions = cupAccessorySuggestions(product, productCategory?.name, products);
  const suggestions = suggestedPump ? [suggestedPump, ...cupSuggestions] : cupSuggestions;
  const productBaseName = stripSizeSuffix(product.name).toLowerCase();
  const sameNameOtherBrands = productBaseName ? products.filter((p) =>
    p.brandId !== product.brandId && stripSizeSuffix(p.name).toLowerCase() === productBaseName) : [];
  // Мөн адил брэндийн, ИЖИЛ ДЭД АНГИЛЛЫН (sub) бусад бараа (жишээ нь Pomona Espresso
  // (Blend)-гийн дор Pomona Premium (мөн Blend) гэх мэт нэр нь өөр ч тухайн брэндийн
  // яг тэр дэд ангиллын төстэй бараа санал болгоно — ангиллаар нь ерөнхийлбөл
  // жишээ нь сироп бүгдийг (жимсний, кофены гэх мэт ялгаагүй) харуулчихдаг тул sub-ийг мөн шалгана
  const sameBrandSimilar = products.filter((p) =>
    p.id !== product.id && p.brandId === product.brandId &&
    p.categoryId === product.categoryId && p.sub === product.sub);
  const similarProducts = [...new Map(
    [...sameNameOtherBrands, ...sameBrandSimilar].map((p) => [p.id, p])
  ).values()].slice(0, 8);
  const selectedBrew = grindForm === "ground" ? BREW_METHODS.find((m) => m.key === brewMethod) : null;
  const grindNote = isCoffee ? (grindForm === "ground" ? (selectedBrew ? `Бутласан · ${selectedBrew.name}` : "Бутласан") : "Үрээр") : undefined;
  const lidNote = isColdCup ? `Таг: ${lidType}` : undefined;
  const detailNote = grindNote || lidNote;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 20px 90px" }}>
      <BackButton onClick={onBack} />
      <div className="cuppa-detail-hero">
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
                  border: `1.5px solid ${optionType === t ? T.ink : T.line}`,
                  background: optionType === t ? T.paper : "transparent",
                  position: "relative", boxShadow: optionType === t ? `0 0 0 3px ${T.ink}22` : "none",
                }}>
                  <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 12, color: T.ink, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
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
                : `${bulkBoxQty} ширхэг болон хайрцагаар нь авбал бөөний үнээр тооцно`}
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
                <button onClick={() => onAddToCart(product, optionType, qty, detailNote)} style={{
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

          {isColdCup && (
            <div style={{ marginTop: 26, paddingTop: 22, borderTop: `1px solid ${T.line}` }}>
              <div style={sideLabel}>Таг сонгох</div>
              <div style={{ display: "flex", gap: 10 }}>
                {["Хавтгай", "Бөмбгөр"].map((lt) => (
                  <button key={lt} onClick={() => setLidType(lt)} style={{
                    flex: 1, padding: "11px 16px", borderRadius: 999, cursor: "pointer",
                    border: `1.5px solid ${lidType === lt ? T.cherry : T.line}`,
                    background: lidType === lt ? T.cherry : "transparent",
                    color: lidType === lt ? "#fff" : T.ink,
                    fontFamily: "'Ubuntu', sans-serif", fontWeight: 600, fontSize: 13.5,
                  }}>{lt}</button>
                ))}
              </div>
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
      </div>

      {similarProducts.length > 0 && (
        <div style={{ marginTop: 54 }}>
          <div style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 18 }}>Төстэй бүтээгдэхүүн</div>
          <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {similarProducts.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
                isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

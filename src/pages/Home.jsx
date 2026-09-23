import { T } from "../theme.js";
import { CategoryIcon } from "../components/CategoryIcon.jsx";
import { money, discountPercent, formatCountdown } from "../utils/format.js";
import { DataContext } from "../context/DataContext.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { availableOptionTypes } from "../utils/products.js";
import React, { useEffect, useRef, useState, useContext } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

function HeroDots({ slides, index, onSelect }) {
  if (slides.length < 2) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 22 }}>
      {slides.map((_, i) => (
        <button key={i} onClick={() => onSelect(i)} aria-label={`Слайд ${i + 1}`} style={{
          width: i === index ? 24 : 7, height: 4, borderRadius: 999, border: "none", padding: 0, cursor: "pointer",
          background: i === index ? T.ink : "rgba(95, 95, 95, 0.65)",
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

export default function Home({ setView, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, products } = useContext(DataContext);
  const featured = products.filter((p) => p.tag === "бестселлэр").slice(0, 4);
  const newProducts = products.filter((p) => p.tag === "шинэ").slice(0, 4);
  const heroSlides = products.filter((p) => p.tag === "хямдралтай" && p.images && p.images.length > 0).slice(0, 6);
  const [heroIndex, setHeroIndex] = useState(0);
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <section style={{ background: T.paper, color: T.cream, padding: "70px 20px 60px" }}>
        <div className="cuppa-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="cuppa-hero-image" style={{ width: "100%" }}>
            <HeroSlideshow products={products} onOpen={onOpen} index={heroIndex} setIndex={setHeroIndex} />
          </div>
          <HeroDots slides={heroSlides} index={heroIndex} onSelect={setHeroIndex} />
          <div className="cuppa-hero-price-block" style={{ position: "relative", height: 30, marginTop: 16, width: "100%" }}>
            {heroSlides.map((p, i) => {
              const opt = p[availableOptionTypes(p)[0]];
              const disc = discountPercent(opt);
              if (disc == null) return null;
              return (
                <div key={p.id} style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 9,
                  opacity: i === heroIndex ? 1 : 0, transition: "opacity .6s ease", pointerEvents: "none",
                }}>
                  <span className="cuppa-hero-price-old" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 13.5, color: T.inkSoft, textDecoration: "line-through" }}>{money(opt.originalPrice)}</span>
                  <span className="cuppa-hero-price-new" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 19, fontWeight: 800, color: T.cherry }}>{money(opt.price)}</span>
                </div>
              );
            })}
          </div>
          <div className="cuppa-hero-countdown-block" style={{ position: "relative", height: 20, marginTop: 4, width: "100%" }}>
            {heroSlides.map((p, i) => {
              const countdown = formatCountdown(p.discountEndsAt);
              if (!countdown) return null;
              return (
                <div key={p.id} style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: i === heroIndex ? 1 : 0, transition: "opacity .6s ease", pointerEvents: "none",
                }}>
                  <span style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 12, fontWeight: 600, color: T.cherry }}>Хямдрал дуусахад: {countdown}</span>
                </div>
              );
            })}
          </div>
          <div className="cuppa-hero-cta" style={{ marginTop: 16 }}>
            <button onClick={() => setView({ name: "discounts" })} style={{
              background: T.ink, color: T.paper, border: "none", borderRadius: 999, padding: "13px 26px",
              fontFamily: "'Nunito Sans', sans-serif", fontWeight: 400, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              Бүх хямдрал үзэх<ArrowRight size={12} />
            </button>
          </div>
        </div>
      </section>

      <section style={{ background: `linear-gradient(180deg, ${T.paper} 0%, ${T.grey} 240px)` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "50px 20px 54px" }}>
          <div style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.paper, marginBottom: 20 }}></div>
          <div className="cuppa-category-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
            {categories.map((c) => {
              const catImg = c.tileImage || products.find((p) => p.categoryId === c.id && p.images && p.images.length > 0)?.images[0];
              return (
              <button key={c.id} onClick={() => setView({ name: "category", categoryId: c.id })} className="cuppa-category-tile" style={{
                display: "flex", flexDirection: "column", overflow: "hidden",
                background: "rgb(255, 255, 255)",
                border: "1px solid rgba(255,255,255,.6)", borderRadius: 14, padding: "14px",
                cursor: "pointer",
                aspectRatio: "0.5 / 0.5", boxSizing: "border-box",
                boxShadow: "0 2px 10px rgba(36,28,20,.06)", transition: "transform .15s ease, box-shadow .15s ease",
              }}>
                {catImg && (
                  <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={catImg} alt="" aria-hidden="true" style={{
                      maxWidth: "80%", maxHeight: "100%", objectFit: "contain", pointerEvents: "none",
                    }} />
                  </div>
                )}
                <div style={{
                  display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, flexShrink: 0,
                }}>
                  <span className="cuppa-category-icon-wrap" style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: T.paper,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <CategoryIcon icon={c.icon} size={17} color={T.ink} />
                  </span>
                  <span className="cuppa-category-label" style={{
                    fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: T.ink, textAlign: "center", lineHeight: 1.2,
                  }}>{c.name}</span>
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ background: T.paper, padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="cuppa-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
            <div className="cuppa-section-title" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.ink }}>Шинэ бүтээгдэхүүн</div>
            <button onClick={() => setView({ name: "new" })} style={{
              background: "transparent", border: `1.5px solid rgba(0, 0, 0, 0.4)`, borderRadius: 999, padding: "8px 16px",
              cursor: "pointer", color: T.ink, whiteSpace: "nowrap", flexShrink: 0,
              fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6,
            }}>Бүгдийг үзэх <ArrowRight size={14} /></button>
          </div>
          <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {newProducts.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
                isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} variant="ink" />
            ))}
            {newProducts.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Nunito Sans', sans-serif" }}>Одоогоор шинэ бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
          </div>
        </div>
      </section>

      <section style={{ background: T.ink, padding: "20px 20px 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div className="cuppa-section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 26 }}>
            <div className="cuppa-section-title" style={{ fontFamily: "'Nunito Sans', sans-serif", fontSize: 26, fontWeight: 600, color: T.paper }}>Бестселлэр бүтээгдэхүүн</div>
            <button onClick={() => setView({ name: "bestseller" })} style={{
              background: "transparent", border: `1.5px solid rgb(255, 255, 255)`, borderRadius: 999, padding: "8px 16px",
              cursor: "pointer", color: T.paper, whiteSpace: "nowrap", flexShrink: 0,
              fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6,
            }}>Бүгдийг үзэх <ArrowRight size={14} /></button>
          </div>
          <div className="cuppa-product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd}
                isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />
            ))}
            {featured.length === 0 && <div style={{ color: T.inkSoft, fontFamily: "'Nunito Sans', sans-serif" }}>Одоогоор бестселлэр бүтээгдэхүүн тэмдэглэгдээгүй байна.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}

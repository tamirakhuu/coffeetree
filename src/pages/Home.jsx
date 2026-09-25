import React, { useContext, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { DataContext } from "../context/DataContext.jsx";
import { CategoryIcon } from "../components/CategoryIcon.jsx";
import { ProductCard } from "../components/ProductCard.jsx";
import { availableOptionTypes } from "../utils/products.js";
import { money, formatCountdown } from "../utils/format.js";
import "./Home.css";

export default function Home({ setView, onOpen, onQuickAdd, wishlist, onToggleWish }) {
  const { categories, products } = useContext(DataContext);
  const slides = products.filter(p => p.tag === "хямдралтай" && p.images?.length).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [playing] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const touch = useRef(null);
  const swiped = useRef(false);
  const [, tick] = useState(0);
  const activeIndex = slides.length ? index % slides.length : 0;
  const current = slides[activeIndex];
  const option = current ? current[availableOptionTypes(current)[0]] : null;
  const countdown = current?.discountEndsAt ? formatCountdown(current.discountEndsAt) : null;
  const move = delta => setIndex(i => (i + delta + slides.length) % slides.length);
  useEffect(() => {
    if (slides.length < 2 || !playing) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length, playing]);
  useEffect(() => {
    if (!current?.discountEndsAt) return;
    const timer = setInterval(() => tick(i => i + 1), 1000);
    return () => clearInterval(timer);
  }, [current?.discountEndsAt]);
  const collections = [
    { title: "Бестселлэр", tag: "бестселлэр", view: "bestseller" },
    { title: "Шинэ бүтээгдэхүүн", tag: "шинэ", view: "new" },
  ];
  return (
    <div className="home-page"><div className="home-container">
      {current && <section className="home-hero" aria-label="Онцлох бүтээгдэхүүн">
        <div className="home-hero-copy">
          <h1>{current ? current.name : "Өдөр бүрийн кофены таашаал"}</h1>
          {option && <div className="home-price"><strong>{money(option.price)}</strong>{option.originalPrice > option.price && <del>{money(option.originalPrice)}</del>}</div>}
          {countdown && <p className="home-countdown">Хямдрал дуусахад: {countdown}</p>}
          <div className="home-actions">
            <button className="home-primary" onClick={() => setView({ name: "discounts" })}>Бүх хямдрал үзэх<ArrowRight size={17} /></button>
          </div>
        </div>
        <div className="home-hero-media" onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; swiped.current = false; }}
          onTouchEnd={e => {
            if (!touch.current || slides.length < 2) return;
            const dx = e.changedTouches[0].clientX - touch.current.x;
            const dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { swiped.current = true; move(dx < 0 ? 1 : -1); }
            touch.current = null;
          }}>
          {slides.length > 1 && <button className="home-side-product home-side-prev" onClick={() => move(-1)} aria-label="Өмнөх хямдралтай бараа"><img src={slides[(activeIndex - 1 + slides.length) % slides.length].images[0]} alt="" /></button>}
          {slides.length > 1 && <button className="home-side-product home-side-next" onClick={() => move(1)} aria-label="Дараах хямдралтай бараа"><img src={slides[(activeIndex + 1) % slides.length].images[0]} alt="" /></button>}
          {current ? <button className="home-image-button" onClick={() => { if (swiped.current) { swiped.current = false; return; } onOpen(current); }} aria-label={`${current.name} үзэх`}><img src={current.images[0]} alt={current.name} className="home-product-image" fetchPriority="high" /></button> : <img src="/training-hero-latte.jpg" alt="Латте арттай кофе" className="home-welcome-image" fetchPriority="high" />}
          {slides.length > 1 && <div className="home-slide-controls">
            <button onClick={() => move(-1)} aria-label="Өмнөх бараа"><ChevronLeft size={18} /></button>
            <div className="home-dots">{slides.map((p, i) => <button key={p.id} aria-label={`Слайд ${i + 1}`} aria-pressed={i === activeIndex} onClick={() => setIndex(i)}><span /></button>)}</div>
            <button onClick={() => move(1)} aria-label="Дараах бараа"><ChevronRight size={18} /></button>
          </div>}
        </div>
      </section>}
      <section className="home-section home-section-gray" id="home-categories" aria-labelledby="home-categories-title">
        <div className="home-section-heading"><div><h2 id="home-categories-title">Барааны ангилал</h2></div></div>
        <div className="home-category-grid">{categories.map(c => {
          const img = c.tileImage || products.find(p => p.categoryId === c.id && p.images?.length)?.images[0];
          return <button key={c.id} className="home-category-card" onClick={() => setView({ name: "category", categoryId: c.id })}><div className="home-category-image">{img ? <img src={img} alt="" loading="lazy" /> : <CategoryIcon icon={c.icon} size={44} />}</div><span>{c.name}</span></button>;
        })}</div>
      </section>
      {collections.map(collection => {
        const items = products.filter(p => p.tag === collection.tag).slice(0, 4);
        return <section className={`home-section${collection.view === "new" ? " home-section-gray" : ""}`} key={collection.view} aria-labelledby={`home-${collection.view}`}>
          <div className="home-section-heading"><div><h2 id={`home-${collection.view}`}>{collection.title}</h2></div><button className="home-text-link" onClick={() => setView({ name: collection.view })}>Бүгдийг үзэх <ArrowRight size={16} /></button></div>
          <div className="home-products cuppa-product-grid">{items.map(p => <ProductCard key={p.id} product={p} onOpen={onOpen} onQuickAdd={onQuickAdd} isWished={wishlist.includes(p.id)} onToggleWish={onToggleWish} />)}</div>
          {!items.length && <p className="home-empty">Одоогоор бүтээгдэхүүн нэмэгдээгүй байна.</p>}
        </section>;
      })}
    </div></div>
  );
}

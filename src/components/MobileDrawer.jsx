import React, { useEffect, useRef, useState } from "react";
import { X, ChevronDown, ChevronRight, Star, GraduationCap, Info } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon.jsx";
import "./MobileDrawer.css";
import { CategoryMenu } from "./CategoryMenu.jsx";

export function MobileDrawer({ open, onClose, categories, brands, onGoCategory, onGoBrand, setView }) {
  const [section, setSection] = useState("products");
  const panel = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const scrollY = window.scrollY;
    const style = document.body.style;
    const previous = { position: style.position, top: style.top, left: style.left, right: style.right };
    Object.assign(style, { position: "fixed", top: `-${scrollY}px`, left: "0", right: "0" });
    panel.current?.querySelector("button")?.focus();
    const onKey = event => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab") return;
      const buttons = [...panel.current.querySelectorAll("button")].filter(button => button.getClientRects().length);
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      Object.assign(style, previous);
      previousFocus?.focus({ preventScroll: true });
      window.scrollTo(0, scrollY);
    };
  }, [open]);
  const go = action => { action(); onClose(); };
  const toggle = name => setSection(current => current === name ? null : name);
  return <div className={`mobile-menu${open ? " is-open" : ""}`} inert={open ? undefined : ""} aria-hidden={!open}>
    <div className="mobile-menu-backdrop" onClick={onClose} />
    <div className="mobile-menu-panel" ref={panel} role="dialog" aria-modal="true" aria-label="Үндсэн цэс">
      <div className="mobile-menu-head">
        <img src="/cuppa-logo.png" alt="CUPPA" />
        <button className="mobile-menu-close" onClick={onClose} aria-label="Цэс хаах"><X size={21} /></button>
      </div>
      <nav className="mobile-menu-content" aria-label="Гар утасны цэс">
        <div className="mobile-menu-shortcuts">
          <button onClick={() => go(() => setView({ name: "bestseller" }))}><Star size={19} /><span>Бестселлэр</span><ChevronRight size={16} /></button>
          <button onClick={() => go(() => setView({ name: "training" }))}><GraduationCap size={19} /><span>Сургалт</span><ChevronRight size={16} /></button>
          <button onClick={() => go(() => setView({ name: "about" }))}><Info size={19} /><span>Бидний тухай</span><ChevronRight size={16} /></button>
        </div>
        <section className="mobile-menu-section">
          <button className="mobile-menu-heading" aria-expanded={section === "products"} aria-controls="mobile-menu-products" onClick={() => toggle("products")}>
            Бүтээгдэхүүн <ChevronDown size={18} />
          </button>
          <div id="mobile-menu-products" hidden={section !== "products"}>
            <CategoryMenu categories={categories} onSelect={(id, sub) => go(() => onGoCategory(id, sub))} />
          </div>
        </section>
        <section className="mobile-menu-section">
          <button className="mobile-menu-heading" aria-expanded={section === "brands"} aria-controls="mobile-menu-brands" onClick={() => toggle("brands")}>
            Брэнд <ChevronDown size={18} />
          </button>
          <div id="mobile-menu-brands" hidden={section !== "brands"}>
            <div className="mobile-menu-brands">
              {brands.map(brand => <button key={brand.id} onClick={() => go(() => onGoBrand(brand.id))}>
                <span className="mobile-menu-brand-logo">{brand.logo ? <img src={brand.logo} alt="" /> : brand.name?.slice(0, 1)}</span>
                <span>{brand.name}</span><ChevronRight size={15} />
              </button>)}
              {!brands.length && <p>Брэнд алга</p>}
            </div>
          </div>
        </section>
      </nav>
    </div>
  </div>;
}
